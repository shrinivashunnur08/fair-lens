const express = require("express");
const router = express.Router();
const { db } = require("../services/firebaseAdmin");

const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const { generateContent, getServiceInfo } = require("../services/geminiClient");

/* ─── colour helpers ─────────────────────────────────────── */
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
};

const gradeColor = (grade) => {
  if (!grade) return hexToRgb("#64748b");
  if (grade.startsWith("A")) return hexToRgb("#10b981");
  if (grade.startsWith("B")) return hexToRgb("#22c55e");
  if (grade.startsWith("C")) return hexToRgb("#f59e0b");
  if (grade.startsWith("D")) return hexToRgb("#f97316");
  return hexToRgb("#ef4444");
};

/* ─── text wrapper (pdf-lib has no word wrap) ────────────── */
function wrapText(text, font, size, maxWidth) {
  const words = (text || "").replace(/\n/g, " ").split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ─── draw text block with wrapping ─────────────────────── */
function drawWrapped(
  page,
  text,
  { font, size, color, x, y, maxWidth, lineHeight },
) {
  const lines = wrapText(text, font, size, maxWidth);
  let cy = y;
  for (const line of lines) {
    if (cy < 60) break; // page bottom guard
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= lineHeight;
  }
  return cy;
}

/* ─── Gemini: generate audit narrative ──────────────────── */
async function generateAuditNarrative(analysisData) {
  // const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const { fileName, outcomeCol, rowCount, results } = analysisData;
  const {
    biasResults = [],
    fairnessScore = {},
    geminiInsights = {},
  } = results || {};

  const biasText = biasResults
    .map(
      (b) => `
Attribute: ${b.attribute} (${b.attributeType})
  - Disparate Impact Ratio: ${(b.disparateImpact?.ratio ?? 1).toFixed(3)} ${b.disparateImpact?.flagged ? "[VIOLATION]" : "[OK]"}
  - Statistical Parity Diff: ${(b.statisticalParity?.difference ?? 0).toFixed(3)} ${b.statisticalParity?.flagged ? "[SIGNIFICANT]" : "[OK]"}
  - Group breakdown: ${(b.stats || []).map((s) => `${s.group}: ${s.rate}%`).join(", ")}
`,
    )
    .join("\n");

  const prompt = `You are a senior AI Ethics & Fairness Auditor writing an official bias audit report.

Dataset analyzed: ${fileName}
Decision column: ${outcomeCol}
Rows analyzed: ${rowCount || "N/A"}
Overall fairness grade: ${fairnessScore.grade} (${fairnessScore.score}/100)

Bias analysis results:
${biasText}

Write a professional audit report with EXACTLY these sections, clearly labeled:

EXECUTIVE SUMMARY
[2-3 sentences summarizing the overall finding, grade, and key concern]

METHODOLOGY
[2-3 sentences explaining the fairness metrics used: Disparate Impact Ratio, Statistical Parity Difference, and EEOC 4/5ths rule]

FINDINGS
[For each attribute: 2-3 sentences describing what was found, the numbers, and their significance. Be specific.]

RISK ASSESSMENT
[2-3 sentences about legal/regulatory risk (EEOC, ECOA, GDPR if applicable), severity level, and business impact]

RECOMMENDATIONS
[3-4 specific, actionable bullet points to reduce bias. Be concrete.]

CONCLUSION
[2-3 sentences wrapping up with next steps]

Keep each section concise. Use plain English — this report will be read by non-technical business stakeholders.`;

return await generateContent(prompt, { maxTokens: 3000, temperature: 0.3 });
}

/* ─── Build PDF with pdf-lib ─────────────────────────────── */
async function buildPDF(analysisData, narrative) {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const { fileName, outcomeCol, rowCount, results, createdAt, id } =
    analysisData;
  const {
    fairnessScore = {},
    biasResults = [],
    flaggedAttributes = 0,
  } = results || {};
  const grade = fairnessScore.grade || "?";
  const score = fairnessScore.score || 0;

  /* ─ page helpers ─ */
  const W = 595,
    H = 842; // A4
  const MARGIN = 56,
    CONTENT = W - MARGIN * 2;
  const DARK = hexToRgb("#0f172a");
  const MUTED = hexToRgb("#64748b");
  const WHITE = hexToRgb("#ffffff");
  const BRAND = hexToRgb("#6366f1");
  const BORDER = hexToRgb("#e2e8f0");
  const gradeCol = gradeColor(grade);

  let page = pdfDoc.addPage([W, H]);
  let y = H - 40;

  const newPage = () => {
    page = pdfDoc.addPage([W, H]);
    y = H - 50;
    // Footer
    page.drawLine({
      start: { x: MARGIN, y: 36 },
      end: { x: W - MARGIN, y: 36 },
      thickness: 0.5,
      color: BORDER,
    });
    page.drawText("FairLens AI Bias Audit Report · Confidential", {
      x: MARGIN,
      y: 22,
      size: 8,
      font: regularFont,
      color: MUTED,
    });
    page.drawText(
      `Powered by Gemini 1.5 Pro · Google Solution Challenge 2026`,
      {
        x: W - MARGIN - 230,
        y: 22,
        size: 8,
        font: regularFont,
        color: MUTED,
      },
    );
    return page;
  };

  const ensureSpace = (needed) => {
    if (y - needed < 60) {
      newPage();
      return true;
    }
    return false;
  };

  /* ══ PAGE 1: COVER ══════════════════════════════════════ */

  // Header bar
  page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: DARK });
  page.drawText("FAIRLENS", {
    x: MARGIN,
    y: H - 38,
    size: 11,
    font: boldFont,
    color: hexToRgb("#818cf8"),
  });
  page.drawText("AI BIAS AUDIT REPORT", {
    x: MARGIN,
    y: H - 56,
    size: 8,
    font: regularFont,
    color: MUTED,
  });

  // Report title area
  y = H - 130;
  page.drawText("Bias Audit Report", {
    x: MARGIN,
    y,
    size: 28,
    font: boldFont,
    color: DARK,
  });
  y -= 28;
  const shortName =
    (fileName || "dataset.csv").length > 50
      ? (fileName || "dataset.csv").slice(0, 47) + "…"
      : fileName || "dataset.csv";
  page.drawText(shortName, {
    x: MARGIN,
    y,
    size: 14,
    font: regularFont,
    color: MUTED,
  });
  y -= 40;

  // Divider
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: W - MARGIN, y },
    thickness: 1,
    color: BORDER,
  });
  y -= 30;

  // Grade badge box
  const BADGE_W = 160,
    BADGE_H = 100;
  page.drawRectangle({
    x: MARGIN,
    y: y - BADGE_H + 20,
    width: BADGE_W,
    height: BADGE_H,
    color: hexToRgb("#f8fafc"),
    borderColor: BORDER,
    borderWidth: 1,
  });
  page.drawText(grade, {
    x: MARGIN + 40,
    y: y - 30,
    size: 42,
    font: boldFont,
    color: gradeCol,
  });
  page.drawText(`${score}/100`, {
    x: MARGIN + 52,
    y: y - 52,
    size: 12,
    font: regularFont,
    color: MUTED,
  });
  page.drawText("FAIRNESS SCORE", {
    x: MARGIN + 20,
    y: y - 72,
    size: 7,
    font: boldFont,
    color: MUTED,
  });

  // Summary stats
  const statsX = MARGIN + BADGE_W + 24;
  const statRows = [
    ["Decision column", outcomeCol || "—"],
    ["Rows analyzed", (rowCount || 0).toLocaleString()],
    ["Attributes", String(biasResults.length)],
    ["Violations found", String(flaggedAttributes)],
    [
      "Analyzed on",
      createdAt?.toDate?.()?.toLocaleDateString("en-IN") ||
        new Date().toLocaleDateString("en-IN"),
    ],
    ["Analysis ID", (id || "").slice(0, 20) + (id?.length > 20 ? "…" : "")],
  ];
  let sy = y;
  for (const [label, val] of statRows) {
    page.drawText(label, {
      x: statsX,
      y: sy,
      size: 9,
      font: regularFont,
      color: MUTED,
    });
    page.drawText(val, {
      x: statsX + 130,
      y: sy,
      size: 9,
      font: boldFont,
      color: DARK,
    });
    sy -= 16;
  }
  y -= BADGE_H + 20;

  // Violation banner (if any)
  if (flaggedAttributes > 0) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 36,
      width: CONTENT,
      height: 36,
      color: hexToRgb("#fef2f2"),
      borderColor: hexToRgb("#fca5a5"),
      borderWidth: 1,
    });
    page.drawText(
      `[!] ${flaggedAttributes} protected attribute${flaggedAttributes > 1 ? "s" : ""} with bias violations detected — action required`,
      {
        x: MARGIN + 12,
        y: y - 20,
        size: 10,
        font: boldFont,
        color: hexToRgb("#dc2626"),
      },
    );
    y -= 52;
  } else {
    page.drawRectangle({
      x: MARGIN,
      y: y - 36,
      width: CONTENT,
      height: 36,
      color: hexToRgb("#f0fdf4"),
      borderColor: hexToRgb("#86efac"),
      borderWidth: 1,
    });
    page.drawText(
      "[OK] No bias violations detected across all protected attributes",
      {
        x: MARGIN + 12,
        y: y - 20,
        size: 10,
        font: boldFont,
        color: hexToRgb("#16a34a"),
      },
    );
    y -= 52;
  }

  // Attribute summary table
  y -= 20;
  page.drawText("ATTRIBUTE SUMMARY", {
    x: MARGIN,
    y,
    size: 8,
    font: boldFont,
    color: MUTED,
  });
  y -= 16;
  page.drawRectangle({
    x: MARGIN,
    y: y - 20,
    width: CONTENT,
    height: 20,
    color: DARK,
  });
  page.drawText("Attribute", {
    x: MARGIN + 8,
    y: y - 14,
    size: 8,
    font: boldFont,
    color: WHITE,
  });
  page.drawText("Type", {
    x: MARGIN + 130,
    y: y - 14,
    size: 8,
    font: boldFont,
    color: WHITE,
  });
  page.drawText("DIR", {
    x: MARGIN + 210,
    y: y - 14,
    size: 8,
    font: boldFont,
    color: WHITE,
  });
  page.drawText("SPD", {
    x: MARGIN + 270,
    y: y - 14,
    size: 8,
    font: boldFont,
    color: WHITE,
  });
  page.drawText("Groups", {
    x: MARGIN + 340,
    y: y - 14,
    size: 8,
    font: boldFont,
    color: WHITE,
  });
  page.drawText("Status", {
    x: MARGIN + 400,
    y: y - 14,
    size: 8,
    font: boldFont,
    color: WHITE,
  });
  y -= 20;

  for (let i = 0; i < biasResults.length; i++) {
    const b = biasResults[i];
    const rowY = y - 18;
    const isOdd = i % 2 === 0;
    if (isOdd) {
      page.drawRectangle({
        x: MARGIN,
        y: rowY,
        width: CONTENT,
        height: 18,
        color: hexToRgb("#f8fafc"),
      });
    }
    const flagged = b.disparateImpact?.flagged || b.statisticalParity?.flagged;
    page.drawText((b.attribute || "").slice(0, 18), {
      x: MARGIN + 8,
      y: rowY + 5,
      size: 8,
      font: regularFont,
      color: DARK,
    });
    page.drawText((b.attributeType || "").slice(0, 12), {
      x: MARGIN + 130,
      y: rowY + 5,
      size: 8,
      font: regularFont,
      color: MUTED,
    });
    page.drawText((b.disparateImpact?.ratio ?? 1).toFixed(3), {
      x: MARGIN + 210,
      y: rowY + 5,
      size: 8,
      font: monoFont,
      color: b.disparateImpact?.flagged
        ? hexToRgb("#dc2626")
        : hexToRgb("#16a34a"),
    });
    page.drawText((b.statisticalParity?.difference ?? 0).toFixed(3), {
      x: MARGIN + 270,
      y: rowY + 5,
      size: 8,
      font: monoFont,
      color: b.statisticalParity?.flagged
        ? hexToRgb("#ea580c")
        : hexToRgb("#16a34a"),
    });
    page.drawText(String(b.stats?.length ?? 0), {
      x: MARGIN + 340,
      y: rowY + 5,
      size: 8,
      font: regularFont,
      color: DARK,
    });
    page.drawText(flagged ? "VIOLATION" : "FAIR", {
      x: MARGIN + 400,
      y: rowY + 5,
      size: 8,
      font: boldFont,
      color: flagged ? hexToRgb("#dc2626") : hexToRgb("#16a34a"),
    });
    y -= 18;
  }

  // Footer for page 1
  page.drawLine({
    start: { x: MARGIN, y: 36 },
    end: { x: W - MARGIN, y: 36 },
    thickness: 0.5,
    color: BORDER,
  });
  page.drawText("FairLens AI Bias Audit Report · Confidential", {
    x: MARGIN,
    y: 22,
    size: 8,
    font: regularFont,
    color: MUTED,
  });
  page.drawText("Powered by Gemini 1.5 Pro · Google Solution Challenge 2026", {
    x: W - MARGIN - 230,
    y: 22,
    size: 8,
    font: regularFont,
    color: MUTED,
  });

  /* ══ PAGES 2+: NARRATIVE ════════════════════════════════ */
  newPage();

  // Section patterns in Gemini's output
  const SECTION_HEADERS = [
    "EXECUTIVE SUMMARY",
    "METHODOLOGY",
    "FINDINGS",
    "RISK ASSESSMENT",
    "RECOMMENDATIONS",
    "CONCLUSION",
  ];

  // Parse narrative into sections
  let sections = [];
  let current = null;
  const lines = (narrative || "").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = SECTION_HEADERS.some((h) =>
      trimmed.toUpperCase().includes(h),
    );
    if (isHeader) {
      if (current) sections.push(current);
      current = { title: trimmed.replace(/[*#]/g, "").trim(), body: "" };
    } else if (current && trimmed) {
      current.body += (current.body ? " " : "") + trimmed;
    }
  }
  if (current) sections.push(current);

  // Fallback: render as one block
  if (!sections.length) {
    sections = [{ title: "DETAILED ANALYSIS", body: narrative }];
  }

  for (const section of sections) {
    ensureSpace(80);

    // Section title
    page.drawRectangle({
      x: MARGIN,
      y: y - 22,
      width: 4,
      height: 22,
      color: BRAND,
    });
    const titleLines = wrapText(
      section.title.toUpperCase(),
      boldFont,
      11,
      CONTENT - 16,
    );
    page.drawRectangle({
      x: MARGIN,
      y: y - titleLines.length * 16 - 6,
      width: 4,
      height: titleLines.length * 16 + 6,
      color: BRAND,
    });
    for (const tl of titleLines) {
      page.drawText(tl, {
        x: MARGIN + 12,
        y: y - 16,
        size: 11,
        font: boldFont,
        color: DARK,
      });
      y -= 16;
    }
    y -= 18;

    // Body text
    const bodyLines = wrapText(section.body, regularFont, 10, CONTENT);
    for (const line of bodyLines) {
      if (y < 70) {
        newPage();
      }
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 10,
        font: regularFont,
        color: DARK,
      });
      y -= 16;
    }
    y -= 16;
  }

  /* ══ DISCLAIMER PAGE ════════════════════════════════════ */
  newPage();
  y -= 20;
  page.drawText("DISCLAIMER", {
    x: MARGIN,
    y,
    size: 11,
    font: boldFont,
    color: DARK,
  });
  y -= 20;
  const disclaimer = `This report was generated automatically by FairLens, an AI-powered bias detection platform built for the Google Solution Challenge 2026. The bias analysis uses industry-standard fairness metrics including Disparate Impact Ratio and Statistical Parity Difference. This report is intended as a screening tool to assist data scientists and compliance teams in identifying potential areas of concern. It should not be used as the sole basis for legal, regulatory, or business decisions. AI-generated explanations are provided by Google Gemini 1.5 Pro and should be reviewed by qualified human experts before action is taken. FairLens and its creators make no warranties regarding the completeness or accuracy of this report.`;

  drawWrapped(page, disclaimer, {
    font: regularFont,
    size: 9,
    color: MUTED,
    x: MARGIN,
    y,
    maxWidth: CONTENT,
    lineHeight: 15,
  });

  return pdfDoc;
}

/* ══════════════════════════════════════════════════════════
   POST /api/report/:analysisId
   Generate and stream a PDF audit report
══════════════════════════════════════════════════════════ */
router.post("/:analysisId", async (req, res) => {
  const { analysisId } = req.params;

  try {
    // 1. Load analysis from Firestore
    const snap = await db.collection("analyses").doc(analysisId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    const data = { id: analysisId, ...snap.data() };

    if (!data.results) {
      return res.status(400).json({ error: "Analysis is not complete yet" });
    }

    // 2. Generate Gemini narrative
    let narrative = "";
    try {
      narrative = await generateAuditNarrative(data);

      narrative = narrative
        .replace(/\*\*(.*?)\*\*/g, "$1") // remove **bold**
        .replace(/\*(.*?)\*/g, "$1") // remove *italic*
        .replace(/#{1,6}\s/g, "") // remove # headers
        .replace(/^\s*\*\s+/gm, "- "); // normalize bullet points
    } catch (err) {
      console.error("[report] Gemini error:", err.message);
      narrative = `EXECUTIVE SUMMARY\nThis automated bias audit report was generated by FairLens. The dataset "${data.fileName}" received a fairness grade of ${data.results?.fairnessScore?.grade} (${data.results?.fairnessScore?.score}/100).\n\nFINDINGS\n${(
        data.results?.biasResults || []
      )
        .map(
          (b) =>
            `${b.attribute}: DIR=${(b.disparateImpact?.ratio ?? 1).toFixed(3)}, SPD=${(b.statisticalParity?.difference ?? 0).toFixed(3)}. ${
              b.disparateImpact?.flagged || b.statisticalParity?.flagged
                ? "BIAS DETECTED."
                : "No violation."
            }`,
        )
        .join(
          " ",
        )}\n\nRECOMMENDATIONS\nReview flagged attributes with a qualified fairness expert. Consider using fairness-aware training methods. Regularly audit model outputs for disparate impact.`;
    }

    // 3. Clean markdown
    narrative = narrative.replace(/\*\*(.*?)\*\*/g, "$1");
    narrative = narrative.replace(/\*(.*?)\*/g, "$1");
    narrative = narrative.replace(/#{1,6}\s/g, "");

    // 3. Build PDF
    const pdfDoc = await buildPDF(data, narrative);
    const pdfBytes = await pdfDoc.save();

    // 4. Stream PDF to client
    const safeFileName = (data.fileName || "dataset")
      .replace(/[^a-z0-9_-]/gi, "_")
      .replace(/\.csv$/, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="FairLens_Audit_${safeFileName}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBytes.length);
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[report]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
