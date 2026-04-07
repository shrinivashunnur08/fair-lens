const express = require("express");
const router = express.Router();
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const { db } = require("../services/firebaseAdmin");
// const {
//   parseCSVFromURL,
//   groupBy,
//   getUniqueValues,
// } = require("../services/csvParser");
const upload = multer({ storage: multer.memoryStorage() });
const { generateContent, getServiceInfo } = require("../services/geminiClient");
const { logAnalysisToBigQuery } = require("../services/bigqueryClient");

/* ═══════════════════════════════════════════════════════════════
   BIAS METRICS ENGINE
   Computes industry-standard fairness metrics for each
   protected attribute × outcome column combination.
═══════════════════════════════════════════════════════════════ */

/**
 * Disparate Impact Ratio (DIR)
 * DIR = P(favorable | unprivileged) / P(favorable | privileged)
 * DIR < 0.8 → "4/5ths rule" violation — legally significant
 */
function disparateImpact(groups, outcomeCol, positiveVal) {
  const rates = {};
  for (const [group, rows] of Object.entries(groups)) {
    const pos = rows.filter(
      (r) =>
        String(r[outcomeCol]).trim().toLowerCase() ===
        positiveVal.toLowerCase(),
    ).length;
    rates[group] = rows.length > 0 ? pos / rows.length : 0;
  }
  const values = Object.values(rates);
  const maxRate = Math.max(...values);
  const minRate = Math.min(...values);
  const ratio = maxRate > 0 ? minRate / maxRate : 1;

  return { rates, ratio, flagged: ratio < 0.8 };
}

/**
 * Statistical Parity Difference (SPD)
 * SPD = P(favorable | unprivileged) − P(favorable | privileged)
 * |SPD| > 0.1 is typically considered significant
 */
function statisticalParity(groups, outcomeCol, positiveVal) {
  const rates = {};
  for (const [group, rows] of Object.entries(groups)) {
    const pos = rows.filter(
      (r) =>
        String(r[outcomeCol]).trim().toLowerCase() ===
        positiveVal.toLowerCase(),
    ).length;
    rates[group] = rows.length > 0 ? pos / rows.length : 0;
  }
  const values = Object.values(rates);
  const diff = Math.max(...values) - Math.min(...values);

  return { rates, difference: diff, flagged: diff > 0.1 };
}

/**
 * Group counts and base rates — for summary stats
 */
function groupStats(groups, outcomeCol, positiveVal) {
  return Object.entries(groups).map(([group, rows]) => {
    const pos = rows.filter(
      (r) =>
        String(r[outcomeCol]).trim().toLowerCase() ===
        positiveVal.toLowerCase(),
    ).length;
    return {
      group,
      total: rows.length,
      positive: pos,
      rate: rows.length > 0 ? Math.round((pos / rows.length) * 1000) / 10 : 0, // percentage
    };
  });
}

/**
 * Compute Fairness Score A-F
 * Based on worst DIR and SPD across all protected attributes
 */
function computeFairnessScore(biasResults) {
  if (!biasResults.length) return { grade: "N/A", score: 0 };

  const dirs = biasResults.map((r) => r.disparateImpact.ratio);
  const spds = biasResults.map((r) => r.statisticalParity.difference);
  const worstDIR = Math.min(...dirs);
  const worstSPD = Math.max(...spds);

  // Score out of 100
  let score = 100;
  score -= (1 - worstDIR) * 60; // DIR penalty (max -60)
  score -= worstSPD * 60; // SPD penalty (max -60, overlap intentional)
  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade =
    score >= 90
      ? "A+"
      : score >= 80
        ? "A"
        : score >= 70
          ? "B"
          : score >= 60
            ? "C"
            : score >= 50
              ? "D"
              : "F";

  return { grade, score };
}

/* ═══════════════════════════════════════════════════════════════
   COMPLIANCE RADAR ENGINE
═══════════════════════════════════════════════════════════════ */

const COMPLIANCE_RULES = [
  {
    id: "IN_DPDP_2023",
    region: "India",
    flag: "🇮🇳",
    law: "Digital Personal Data Protection Act 2023",
    shortName: "DPDP Act 2023",
    section: "Section 4 — Lawful processing; Section 16 — Automated decisions",
    article: null,
    scope: [
      "hiring",
      "loan",
      "medical",
      "credit",
      "education",
      "insurance",
      "all",
    ],
    trigger: (biasResults) =>
      biasResults.some(
        (b) => b.disparateImpact.flagged || b.statisticalParity.flagged,
      ),
    riskLevel: (biasResults) => {
      const worst = Math.min(
        ...biasResults.map((b) => b.disparateImpact.ratio),
      );
      return worst < 0.6 ? "CRITICAL" : worst < 0.8 ? "HIGH" : "MEDIUM";
    },
    description:
      "The DPDP Act 2023 requires that automated decisions affecting individuals be explainable, auditable, and free from discriminatory bias. Violations in protected attributes may constitute unlawful processing of sensitive personal data.",
    penalty: "Penalties up to Rs.250 crore (approx. $30M USD) per violation.",
    remediation:
      "Conduct a Data Protection Impact Assessment (DPIA). Document bias mitigation steps. Establish a grievance redressal mechanism for affected individuals.",
  },
  {
    id: "IN_CONSTITUTION_15",
    region: "India",
    flag: "🇮🇳",
    law: "Constitution of India — Article 15",
    shortName: "Article 15",
    section:
      "Article 15 — Prohibition of discrimination on grounds of religion, race, caste, sex or place of birth",
    article: "Article 15",
    scope: ["hiring", "education", "all"],
    trigger: (biasResults) =>
      biasResults.some(
        (b) =>
          ["race", "gender", "sex", "caste", "religion", "ethnicity"].includes(
            (b.attributeType || "").toLowerCase(),
          ) &&
          (b.disparateImpact.flagged || b.statisticalParity.flagged),
      ),
    riskLevel: () => "HIGH",
    description:
      "Article 15 of the Indian Constitution prohibits discrimination by the State on grounds of religion, race, caste, sex, or place of birth. AI systems used in public or quasi-public contexts that produce discriminatory outcomes may be constitutionally challengeable.",
    penalty:
      "Constitutional writ petition. Court-ordered cessation of discriminatory AI system.",
    remediation:
      "Audit training data for caste, religion, and gender proxies. Engage a constitutional law advisor before deployment in government or quasi-government contexts.",
  },
  {
    id: "IN_EQUAL_REMUNERATION",
    region: "India",
    flag: "🇮🇳",
    law: "Equal Remuneration Act 1976",
    shortName: "Equal Remuneration Act",
    section: "Section 4 — Duty of employer to pay equal remuneration",
    article: null,
    scope: ["hiring", "compensation"],
    trigger: (biasResults) =>
      biasResults.some(
        (b) =>
          ["gender", "sex"].includes((b.attributeType || "").toLowerCase()) &&
          b.disparateImpact.flagged,
      ),
    riskLevel: () => "HIGH",
    description:
      "The Equal Remuneration Act mandates equal pay for equal work regardless of gender. AI-driven hiring or compensation tools that produce gender bias may violate this Act.",
    penalty: "Criminal prosecution. Fines and imprisonment for employers.",
    remediation:
      "Remove gender as a direct or proxy feature from compensation models. Conduct regular pay equity audits.",
  },
  {
    id: "US_EEOC_DISPARATE",
    region: "United States",
    flag: "🇺🇸",
    law: "Equal Employment Opportunity Commission — Title VII",
    shortName: "EEOC / Title VII",
    section:
      "Title VII of the Civil Rights Act (1964) — Disparate Impact Doctrine",
    article: null,
    scope: ["hiring", "employment", "promotion"],
    trigger: (biasResults) =>
      biasResults.some(
        (b) =>
          [
            "gender",
            "race",
            "sex",
            "age",
            "religion",
            "ethnicity",
            "disability",
          ].some((a) =>
            (b.attributeType || b.attribute || "").toLowerCase().includes(a),
          ) && b.disparateImpact.flagged,
      ),
    riskLevel: (biasResults) => {
      const worst = Math.min(
        ...biasResults.map((b) => b.disparateImpact.ratio),
      );
      return worst < 0.6 ? "CRITICAL" : "HIGH";
    },
    description:
      "The EEOC 4/5ths rule requires that selection rates for protected groups be at least 80% of the highest group. A Disparate Impact Ratio below 0.8 is a clear violation.",
    penalty:
      "Federal investigation, class-action lawsuits, back-pay liability, and fines.",
    remediation:
      "Remove features correlated with protected characteristics. Apply adverse impact analysis in all selection procedures.",
  },
  {
    id: "US_ECOA",
    region: "United States",
    flag: "🇺🇸",
    law: "Equal Credit Opportunity Act (ECOA)",
    shortName: "ECOA / Reg B",
    section: "ECOA (15 U.S.C. 1691) — Prohibition of credit discrimination",
    article: null,
    scope: ["loan", "credit", "bank", "finance", "mortgage"],
    trigger: (biasResults) =>
      biasResults.some(
        (b) =>
          ["gender", "race", "sex", "age", "ethnicity", "marital"].some((a) =>
            (b.attributeType || b.attribute || "").toLowerCase().includes(a),
          ) &&
          (b.disparateImpact.flagged || b.statisticalParity.flagged),
      ),
    riskLevel: () => "CRITICAL",
    description:
      "ECOA prohibits creditors from discriminating in any aspect of a credit transaction based on race, color, religion, national origin, sex, marital status, or age.",
    penalty:
      "Civil penalties up to $10,000 per violation. CFPB enforcement actions.",
    remediation:
      "Apply disparate impact testing before deployment. Use Adverse Action Notices. Conduct annual fair lending examinations.",
  },
  {
    id: "EU_GDPR_22",
    region: "European Union",
    flag: "🇪🇺",
    law: "General Data Protection Regulation (GDPR)",
    shortName: "GDPR — Article 22",
    section:
      "Article 22 — Automated individual decision-making, including profiling",
    article: "Article 22",
    scope: ["hiring", "loan", "medical", "insurance", "all"],
    trigger: (biasResults) =>
      biasResults.some(
        (b) => b.disparateImpact.flagged || b.statisticalParity.flagged,
      ),
    riskLevel: () => "HIGH",
    description:
      "GDPR Article 22 gives individuals the right not to be subject to solely automated decisions that significantly affect them. Biased automated systems violate the right to explainability and non-discrimination.",
    penalty:
      "Fines up to 20M euros or 4% of annual global turnover, whichever is higher.",
    remediation:
      "Implement explainable AI. Provide human review mechanisms for automated decisions. Document a DPIA.",
  },
  {
    id: "EU_AI_ACT",
    region: "European Union",
    flag: "🇪🇺",
    law: "EU AI Act (2024)",
    shortName: "EU AI Act",
    section:
      "Article 10 — Data governance; Article 15 — Accuracy and robustness",
    article: "Article 10 & 15",
    scope: ["hiring", "loan", "medical", "education", "all"],
    trigger: (biasResults) =>
      biasResults.some((b) => b.disparateImpact.flagged),
    riskLevel: (biasResults) => {
      const worst = Math.min(
        ...biasResults.map((b) => b.disparateImpact.ratio),
      );
      return worst < 0.7 ? "CRITICAL" : "HIGH";
    },
    description:
      "The EU AI Act classifies hiring, credit, and healthcare AI as high-risk systems requiring mandatory bias testing, documentation, and conformity assessments.",
    penalty:
      "Fines up to 30M euros or 6% of global turnover for high-risk system violations.",
    remediation:
      "Register the system in the EU AI Act database. Conduct conformity assessment. Implement continuous bias monitoring.",
  },
];

function inferDomain(outcomeCol, protectedCols, fileName) {
  const text = [outcomeCol, fileName, ...Object.keys(protectedCols)]
    .join(" ")
    .toLowerCase();
  if (/hire|hired|employ|job|applicant|recruit|position/.test(text))
    return "hiring";
  if (/loan|credit|approv|bank|financ|mortgage|borrow/.test(text))
    return "loan";
  if (/treat|medic|health|patient|diagnos|hospital/.test(text))
    return "medical";
  if (/school|admiss|educ|college|university|student/.test(text))
    return "education";
  if (/insur/.test(text)) return "insurance";
  return "all";
}

function computeComplianceRadar(
  biasResults,
  outcomeCol,
  protectedCols,
  fileName,
) {
  if (!biasResults.length)
    return { domain: "all", violations: [], passCount: 0, failCount: 0 };

  const domain = inferDomain(outcomeCol, protectedCols, fileName || "");
  const violations = [];

  for (const rule of COMPLIANCE_RULES) {
    const domainMatch =
      rule.scope.includes("all") || rule.scope.includes(domain);
    if (!domainMatch) continue;

    const triggered = rule.trigger(biasResults);
    const riskLevel = triggered ? rule.riskLevel(biasResults) : "PASS";

    violations.push({
      id: rule.id,
      region: rule.region,
      flag: rule.flag,
      law: rule.law,
      shortName: rule.shortName,
      section: rule.section,
      article: rule.article,
      description: rule.description,
      penalty: rule.penalty,
      remediation: rule.remediation,
      triggered,
      riskLevel,
      status: triggered ? "VIOLATION" : "COMPLIANT",
    });
  }

  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, PASS: 3 };
  violations.sort(
    (a, b) => (order[a.riskLevel] ?? 4) - (order[b.riskLevel] ?? 4),
  );

  return {
    domain,
    violations,
    failCount: violations.filter((v) => v.triggered).length,
    passCount: violations.filter((v) => !v.triggered).length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   INTERSECTIONAL BIAS ENGINE
═══════════════════════════════════════════════════════════════ */
function buildIntersectionGroups(rows, colA, colB) {
  return rows.reduce((acc, row) => {
    const a = String(row[colA] ?? "unknown")
      .trim()
      .toLowerCase();
    const b = String(row[colB] ?? "unknown")
      .trim()
      .toLowerCase();
    const key = `${a} × ${b}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

function computeIntersectionalBias(
  rows,
  protectedCols,
  outcomeCol,
  positiveVal,
) {
  const attrs = Object.entries(protectedCols);
  if (attrs.length < 2) return { pairs: [] };

  const pairs = [];

  for (let i = 0; i < attrs.length; i++) {
    for (let j = i + 1; j < attrs.length; j++) {
      const [colA, typeA] = attrs[i];
      const [colB, typeB] = attrs[j];

      const groups = buildIntersectionGroups(rows, colA, colB);

      const groupRates = Object.keys(groups)
        .map((name) => {
          const grp = groups[name];
          const pos = grp.filter(
            (r) =>
              String(r[outcomeCol]).trim().toLowerCase() ===
              positiveVal.toLowerCase(),
          ).length;
          return {
            group: name,
            total: grp.length,
            positive: pos,
            rate:
              grp.length > 0 ? Math.round((pos / grp.length) * 1000) / 10 : 0,
          };
        })
        .filter((g) => g.total >= 2);

      if (groupRates.length < 2) continue;

      const rates = groupRates.map((g) => g.rate / 100);
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      const dir = maxRate > 0 ? minRate / maxRate : 1;
      const spd = maxRate - minRate;
      const flagged = dir < 0.8 || spd > 0.1;

      const valuesA = [
        ...new Set(groupRates.map((g) => g.group.split(" × ")[0])),
      ];
      const valuesB = [
        ...new Set(groupRates.map((g) => g.group.split(" × ")[1])),
      ];

      const cells = [];
      for (const a of valuesA) {
        for (const b of valuesB) {
          const key = `${a} × ${b}`;
          const stat = groupRates.find((g) => g.group === key);
          cells.push({
            attrA: a,
            attrB: b,
            key,
            rate: stat ? stat.rate : null,
            total: stat ? stat.total : 0,
            positive: stat ? stat.positive : 0,
          });
        }
      }

      const mostBiased = groupRates.reduce((a, b) => (a.rate < b.rate ? a : b));
      const leastBiased = groupRates.reduce((a, b) =>
        a.rate > b.rate ? a : b,
      );

      pairs.push({
        colA,
        colB,
        typeA,
        typeB,
        pairLabel: `${colA} × ${colB}`,
        dir: Math.round(dir * 1000) / 1000,
        spd: Math.round(spd * 1000) / 1000,
        flagged,
        groupCount: groupRates.length,
        valuesA,
        valuesB,
        cells,
        groupRates,
        mostBiased,
        leastBiased,
        maxGap: Math.round((maxRate - minRate) * 1000) / 10,
      });
    }
  }

  pairs.sort((a, b) => a.dir - b.dir);
  return { pairs };
}

/* ═══════════════════════════════════════════════════════════════
   GEMINI AI EXPLAINER
   Generates plain-English explanations for each bias finding
═══════════════════════════════════════════════════════════════ */
async function generateGeminiExplanation(biasResults, fileName, outcomeCol) {
  const serviceInfo = getServiceInfo();

  const biasSummary = biasResults
    .map(
      (b) => `
Protected attribute: ${b.attribute} (type: ${b.attributeType})
- Disparate Impact Ratio: ${b.disparateImpact.ratio.toFixed(3)} ${b.disparateImpact.flagged ? "⚠️ VIOLATION (< 0.8)" : "✓ OK"}
- Statistical Parity Difference: ${b.statisticalParity.difference.toFixed(3)} ${b.statisticalParity.flagged ? "⚠️ SIGNIFICANT (> 0.1)" : "✓ OK"}
- Group rates: ${b.stats.map((s) => `${s.group}: ${s.rate}%`).join(", ")}
`,
    )
    .join("\n");

  const prompt = `You are an AI fairness expert analyzing a dataset for bias. 
The dataset is "${fileName}" and the AI decision being analyzed is "${outcomeCol}" (e.g. hired, approved, granted a loan).

Here are the bias analysis results:
${biasSummary}

Please provide:
1. A clear, non-technical 2-sentence summary of the overall fairness situation
2. For each protected attribute that shows a violation, explain:
   - What the bias means in plain English
   - Who is harmed and how
   - The legal/ethical implications (reference EEOC, ECOA, or other relevant regulations)
   - ONE specific, actionable recommendation to reduce this bias
3. An overall severity rating: LOW / MEDIUM / HIGH / CRITICAL

Format your response as JSON with this exact structure:
{
  "overallSummary": "...",
  "severity": "HIGH",
  "findings": [
    {
      "attribute": "gender",
      "headline": "Women are 40% less likely to be hired",
      "explanation": "...",
      "legalRisk": "...",
      "recommendation": "..."
    }
  ]
}`;

  const text = await generateContent(prompt, {
    maxTokens: 8192,
    temperature: 0.4,
  });

  console.log("[Gemini] Response length:", text.length);
  console.log("[Gemini] Last 100 chars:", text.slice(-100));

  // Extract JSON from Gemini's response
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    }
  } catch {
    // fall through to fallback
  }

  return {
    overallSummary: "Could not parse Gemini response.",
    severity: "UNKNOWN",
    findings: [],
    rawText: text,
  };
}
/* ═══════════════════════════════════════════════════════════════
   POST /api/analyze
   Main analysis endpoint — called after file is uploaded to Storage
═══════════════════════════════════════════════════════════════ */
router.post("/", upload.single("file"), async (req, res) => {
  const {
    outcomeCol,
    positiveOutcomeValue,
    userId,
    userEmail,
    fileName,
    fileSize,
  } = req.body;

  let protectedCols;
  try {
    protectedCols = JSON.parse(req.body.protectedCols);
  } catch {
    return res.status(400).json({ error: "Invalid protectedCols JSON" });
  }

  if (!req.file || !outcomeCol || !protectedCols) {
    return res.status(400).json({
      error: "Missing required fields: file, outcomeCol, protectedCols",
    });
  }

  // Parse CSV from memory buffer
  let rows;
  try {
    rows = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Failed to parse CSV: " + err.message });
  }
  // Minimum row validation
  if (rows.length < 50) {
    return res.status(400).json({
      error: `Dataset too small`,
      code: "DATASET_TOO_SMALL",
      rowCount: rows.length,
      minimumRequired: 50,
    });
  }

  // Save dataset rows to Firestore
  const datasetRef = db.collection("datasets").doc();
  await datasetRef.set({ rows, fileName, userId, createdAt: new Date() });

  // Create analysis doc
  const docRef = db.collection("analyses").doc();
  await docRef.set({
    userId: userId || "anonymous",
    userEmail: userEmail || "",
    fileName: fileName || "dataset.csv",
    fileSize: Number(fileSize) || 0,
    datasetId: datasetRef.id,
    headers: Object.keys(rows[0] || {}),
    outcomeCol,
    protectedCols,
    positiveOutcomeValue: positiveOutcomeValue || "1",
    status: "analyzing",
    createdAt: new Date(),
  });

  // Return analysisId immediately — analysis runs in background
  // Return analysisId immediately
  res.json({ success: true, analysisId: docRef.id });

  (async () => {
    try {
      const biasResults = [];
      for (const [col, attrType] of Object.entries(protectedCols)) {
        const groups = {};
        for (const row of rows) {
          const key = String(row[col] ?? "unknown")
            .trim()
            .toLowerCase();
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        }
        const dir = disparateImpact(groups, outcomeCol, positiveOutcomeValue);
        const spd = statisticalParity(groups, outcomeCol, positiveOutcomeValue);
        const stats = groupStats(groups, outcomeCol, positiveOutcomeValue);
        biasResults.push({
          attribute: col,
          attributeType: attrType,
          disparateImpact: dir,
          statisticalParity: spd,
          stats,
        });
      }

      // Compute intersectional bias
      const intersectionalResult = computeIntersectionalBias(
        rows,
        protectedCols,
        outcomeCol,
        positiveOutcomeValue,
      );
      console.log(
        `[analyze] Intersectional: ${intersectionalResult.pairs.length} pairs computed`,
      );

      // Compute compliance radar
      const complianceResult = computeComplianceRadar(
        biasResults,
        outcomeCol,
        protectedCols,
        fileName || "",
      );
      console.log(
        `[analyze] Compliance: ${complianceResult.failCount} violations, domain: ${complianceResult.domain}`,
      );

      // Compute fairness score
      const { grade, score } = computeFairnessScore(biasResults);

      // Gemini explanation
      let geminiInsights = null;
      try {
        geminiInsights = await generateGeminiExplanation(
          biasResults,
          fileName,
          outcomeCol,
        );
      } catch (err) {
        console.error("[analyze] Gemini error:", err.message);
        geminiInsights = {
          overallSummary: "Gemini analysis unavailable.",
          severity: "UNKNOWN",
          findings: [],
        };
      }

      // Save results
      const serviceInfo = getServiceInfo();
      await docRef.update({
        status: "complete",
        completedAt: new Date(),
        rowCount: rows.length,
        aiService: {
          name: serviceInfo.serviceName,
          model: serviceInfo.modelName,
          isVertexAI: serviceInfo.isVertexAI,
          projectId: serviceInfo.projectId,
          location: serviceInfo.location,
        },
        results: {
          biasResults,
          fairnessScore: { grade, score },
          geminiInsights,
          intersectionalBias: intersectionalResult,
          complianceRadar: complianceResult,
          totalAttributes: biasResults.length,
          flaggedAttributes: biasResults.filter(
            (b) => b.disparateImpact.flagged || b.statisticalParity.flagged,
          ).length,
          intersectionalFlagged: intersectionalResult.pairs.filter(
            (p) => p.flagged,
          ).length,
          complianceViolations: complianceResult.failCount,
        },
      });

      console.log(`[analyze] ✅ ${docRef.id} — Grade: ${grade} (${score}/100)`);
      await logAnalysisToBigQuery({
        analysisId: docRef.id,
        userId,
        fileName,
        outcomeCol,
        grade,
        score,
        flaggedAttributes: biasResults.filter(
          (b) => b.disparateImpact.flagged || b.statisticalParity.flagged,
        ).length,
        totalAttributes: biasResults.length,
        complianceViolations: complianceResult.failCount,
        intersectionalFlagged: intersectionalResult.pairs.filter(
          (p) => p.flagged,
        ).length,
        rowCount: rows.length,
        domain: complianceResult.domain,
      });
    } catch (err) {
      console.error(`[analyze] ❌ ${docRef.id}:`, err.message);
      await docRef
        .update({
          status: "error",
          errorMessage: err.message,
          failedAt: new Date(),
        })
        .catch(() => {});
    }
  })();
});

module.exports = router;
