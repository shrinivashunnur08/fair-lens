const express = require("express");
const router = express.Router();
const { db } = require("../services/firebaseAdmin");
const { generateContent, getServiceInfo } = require("../services/geminiClient");

/* ═══════════════════════════════════════════════════════════════
   POST /api/fix/:analysisId
   Gemini writes production-ready Python code to mitigate
   the detected bias — using pandas, scikit-learn, and
   the AI Fairness 360 (AIF360) library where appropriate.
═══════════════════════════════════════════════════════════════ */
router.post("/:analysisId", async (req, res) => {
  const { analysisId } = req.params;
  const { strategy = "auto" } = req.body; // auto | reweighting | suppression | threshold

  try {
    const snap = await db.collection("analyses").doc(analysisId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    const data = snap.data();
    const { results = {}, outcomeCol, protectedCols = {}, fileName } = data;
    const {
      biasResults = [],
      fairnessScore = {},
      intersectionalBias = {},
    } = results;

    const flaggedAttrs = biasResults.filter(
      (b) => b.disparateImpact?.flagged || b.statisticalParity?.flagged,
    );

    const serviceInfo = getServiceInfo();

    // Build rich context for Gemini
    const biasSummary = biasResults
      .map(
        (b) => `
  Column: ${b.attribute} (${b.attributeType})
  - DIR=${(b.disparateImpact?.ratio ?? 1).toFixed(3)} ${b.disparateImpact?.flagged ? "[VIOLATION]" : "[OK]"}
  - SPD=${(b.statisticalParity?.difference ?? 0).toFixed(3)} ${b.statisticalParity?.flagged ? "[SIGNIFICANT]" : "[OK]"}
  - Groups: ${(b.stats || []).map((s) => `${s.group}:${s.rate}%`).join(", ")}
`,
      )
      .join("");

    const intersectSummary = (intersectionalBias?.pairs || [])
      .filter((p) => p.flagged)
      .map(
        (p) =>
          `  - ${p.colA} × ${p.colB}: worst group "${p.mostBiased?.group}" at ${p.mostBiased?.rate}%`,
      )
      .join("\n");

    // Determine best strategy based on bias characteristics
    const worstDIR = Math.min(
      ...biasResults.map((b) => b.disparateImpact?.ratio ?? 1),
    );
    const autoStrategy =
      worstDIR < 0.6
        ? "reweighting" // severe bias → reweighting
        : flaggedAttrs.some((b) =>
              ["gender", "sex", "race", "ethnicity"].includes(
                (b.attributeType || "").toLowerCase(),
              ),
            )
          ? "suppression" // protected attributes → feature suppression
          : "threshold"; // mild bias → threshold optimization

    const chosenStrategy = strategy === "auto" ? autoStrategy : strategy;

    const strategyHints = {
      reweighting:
        "Use sample reweighting (assign higher weights to underrepresented groups) with sklearn sample_weight parameter.",
      suppression:
        "Remove the biased protected attributes and their proxy features from the training data. Identify proxy features using correlation analysis.",
      threshold:
        "Optimize the decision threshold separately per demographic group to equalize false positive/negative rates.",
    };

    const prompt = `You are a senior ML fairness engineer. Write production-ready Python code to mitigate the bias found in this dataset.

DATASET CONTEXT:
- File: ${fileName || "dataset.csv"}
- Decision column: ${outcomeCol}
- Protected attributes: ${Object.keys(protectedCols).join(", ")}
- Fairness grade: ${fairnessScore.grade} (${fairnessScore.score}/100)

BIAS FINDINGS:
${biasSummary}

${intersectSummary ? `INTERSECTIONAL BIAS:\n${intersectSummary}\n` : ""}

MITIGATION STRATEGY: ${chosenStrategy}
${strategyHints[chosenStrategy]}

Write a complete, self-contained Python script that:
1. Loads the CSV dataset
2. Identifies and handles the biased features
3. Applies the ${chosenStrategy} mitigation technique
4. Trains a fair classifier (LogisticRegression or RandomForest)
5. Evaluates fairness metrics BEFORE and AFTER mitigation using disparate_impact_ratio
6. Prints a clear comparison table showing improvement
7. Saves the fair model predictions to a CSV

Requirements:
- Use pandas, scikit-learn, numpy only (no AIF360 — it's hard to install)
- Include clear comments explaining WHY each step helps fairness
- Handle missing values gracefully
- Make it runnable with: pip install pandas scikit-learn numpy && python fix_bias.py
- Include a function compute_fairness_metrics() that returns DIR and SPD
- Show actual numbers from the analysis (use the real column names and group values)
- At the top, print a header explaining what this script does
- At the end, print a clear BEFORE vs AFTER table

Return ONLY the Python code. No markdown, no backticks, no explanation outside comments.`;

    const code = await generateContent(prompt, {
      maxTokens: 3000,
      temperature: 0.3,
    });

    // Clean up any accidental markdown fences
    const cleanCode = code
      .replace(/^```python\n?/im, "")
      .replace(/^```\n?/im, "")
      .replace(/```$/im, "")
      .trim();

    res.json({
      success: true,
      code: cleanCode,
      strategy: chosenStrategy,
      flaggedCount: flaggedAttrs.length,
      aiService: serviceInfo.serviceName,
      fileName: fileName || "dataset.csv",
    });
  } catch (err) {
    console.error("[fix]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
