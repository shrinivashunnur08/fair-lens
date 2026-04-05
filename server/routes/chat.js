const express = require("express");
const router = express.Router();
const { db } = require("../services/firebaseAdmin");
const {
  generateContentStream,
  getServiceInfo,
} = require("../services/geminiClient");

/* ─── Build system context from analysis Firestore doc ─── */
function buildSystemContext(analysisDoc) {
  const {
    fileName,
    outcomeCol,
    protectedCols = {},
    rowCount,
    results = {},
    aiService = {},
  } = analysisDoc;

  const {
    fairnessScore = {},
    biasResults = [],
    geminiInsights = {},
    intersectionalBias = {},
    complianceRadar = {},
  } = results;

  const biasSummary = biasResults
    .map(
      (b) => `
- Attribute: ${b.attribute} (${b.attributeType})
  DIR: ${(b.disparateImpact?.ratio ?? 1).toFixed(3)} ${b.disparateImpact?.flagged ? "[VIOLATION]" : "[OK]"}
  SPD: ${(b.statisticalParity?.difference ?? 0).toFixed(3)} ${b.statisticalParity?.flagged ? "[SIGNIFICANT]" : "[OK]"}
  Groups: ${(b.stats || []).map((s) => `${s.group}=${s.rate}%`).join(", ")}
`,
    )
    .join("");

  const intersectSummary = (intersectionalBias?.pairs || [])
    .map(
      (p) => `
- Pair: ${p.pairLabel}, DIR=${p.dir}, Gap=${p.maxGap}pp ${p.flagged ? "[BIASED]" : "[OK]"}
  Worst group: ${p.mostBiased?.group} (${p.mostBiased?.rate}%)
  Best group:  ${p.leastBiased?.group} (${p.leastBiased?.rate}%)
`,
    )
    .join("");

  const complianceSummary = (complianceRadar?.violations || [])
    .filter((v) => v.triggered)
    .map((v) => `- ${v.flag} ${v.shortName}: ${v.riskLevel} risk`)
    .join("\n");

  return `You are FairLens AI, an expert in algorithmic fairness and bias detection, powered by Google ${aiService.name || "Gemini 1.5 Pro"}.

You have just completed a bias analysis on a real dataset. Here is everything you know:

DATASET: "${fileName}"
DECISION COLUMN: "${outcomeCol}" 
ROWS ANALYZED: ${rowCount || "unknown"}
PROTECTED ATTRIBUTES: ${Object.keys(protectedCols).join(", ")}
OVERALL FAIRNESS GRADE: ${fairnessScore.grade || "?"} (${fairnessScore.score || 0}/100)

BIAS METRICS PER ATTRIBUTE:
${biasSummary || "No bias data available."}

INTERSECTIONAL BIAS:
${intersectSummary || "Only 1 attribute — no intersectional analysis."}

COMPLIANCE VIOLATIONS:
${complianceSummary || "No violations detected."}

GEMINI OVERALL SUMMARY:
${geminiInsights.overallSummary || "Not available."}

ANSWERING GUIDELINES:
- Be direct and specific. Reference actual numbers from the analysis above.
- Use plain English — the user may not be a data scientist.
- When mentioning laws, be specific: cite DPDP Act 2023 for India, EEOC for US hiring, ECOA for US lending.
- Keep answers concise — 3-5 sentences max unless asked for more.
- If asked about intersectional bias, explain what it means in simple terms.
- If asked for code, write clean Python using pandas/scikit-learn.
- If you don't know something specific to this dataset, say so clearly.
- Always end with a concrete next step the user can take.`;
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/chat/:analysisId
   SSE streaming endpoint for the Gemini chat assistant.
   Loads analysis from Firestore, injects as context, streams reply.
═══════════════════════════════════════════════════════════════ */
router.post("/:analysisId", async (req, res) => {
  const { analysisId } = req.params;
  const { message, history = [] } = req.body;

  if (!analysisId || !message?.trim()) {
    return res
      .status(400)
      .json({ error: "analysisId and message are required" });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  res.flushHeaders();

  const send = (data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Load analysis context from Firestore
    const snap = await db.collection("analyses").doc(analysisId).get();
    if (!snap.exists) {
      send({ type: "error", text: "Analysis not found." });
      return res.end();
    }

    const analysisDoc = snap.data();
    const systemContext = buildSystemContext(analysisDoc);

    // 2. Build conversation prompt with history
    const historyText = history
      .slice(-6)
      .map(
        (
          m, // last 6 messages for context window
        ) => `${m.role === "user" ? "User" : "FairLens AI"}: ${m.content}`,
      )
      .join("\n");

    const fullPrompt = `${systemContext}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ""}
User: ${message}

FairLens AI:`;

    // 3. Stream Gemini response via SSE
    send({ type: "start" });

    let fullText = "";
    await generateContentStream(
      fullPrompt,
      (chunk) => {
        fullText += chunk;
        send({ type: "chunk", text: chunk });
      },
      { maxTokens: 1024, temperature: 0.5 },
    );

    send({ type: "done", fullText });
    res.end();
  } catch (err) {
    console.error("[chat]", err.message);
    send({ type: "error", text: `Error: ${err.message}` });
    res.end();
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/chat/:analysisId/suggestions
   Returns 4 context-aware suggested questions based on the analysis
═══════════════════════════════════════════════════════════════ */
router.get("/:analysisId/suggestions", async (req, res) => {
  try {
    const snap = await db
      .collection("analyses")
      .doc(req.params.analysisId)
      .get();
    if (!snap.exists) return res.json({ suggestions: [] });

    const data = snap.data();
    const bias = data.results?.biasResults || [];
    const inter = data.results?.intersectionalBias?.pairs || [];
    const comp =
      data.results?.complianceRadar?.violations?.filter((v) => v.triggered) ||
      [];
    const grade = data.results?.fairnessScore?.grade || "?";
    const col = data.outcomeCol || "outcome";

    // Build relevant suggestions based on what was found
    const suggestions = [];

    // Always useful
    suggestions.push(`Why does this dataset have a ${grade} fairness grade?`);

    // Bias-specific
    const flagged = bias.filter(
      (b) => b.disparateImpact?.flagged || b.statisticalParity?.flagged,
    );
    if (flagged.length) {
      suggestions.push(
        `Which group is most disadvantaged in the ${flagged[0].attribute} attribute?`,
      );
    } else {
      suggestions.push(`What does a clean ${grade} grade mean for deployment?`);
    }

    // Intersectional
    if (inter.length && inter[0].mostBiased) {
      suggestions.push(
        `Explain the intersectional bias between ${inter[0].colA} and ${inter[0].colB}`,
      );
    } else {
      suggestions.push(
        `How do I check for bias in my model's predictions vs training data?`,
      );
    }

    // Compliance / fix
    if (comp.length) {
      suggestions.push(
        `What's the risk of deploying this ${col} model under the ${comp[0].shortName}?`,
      );
    } else {
      suggestions.push(
        `What Python code can I write to make this model fairer?`,
      );
    }

    res.json({ suggestions: suggestions.slice(0, 4) });
  } catch (err) {
    console.error("[chat/suggestions]", err.message);
    res.json({
      suggestions: [
        "Why does this dataset have bias?",
        "Which group is most affected?",
        "What are the legal risks?",
        "How do I fix this bias?",
      ],
    });
  }
});

module.exports = router;
