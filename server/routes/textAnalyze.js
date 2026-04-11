const express = require("express");
const router = express.Router();
const {
  analyzeTextWithNLP,
  detectBiasPatterns,
} = require("../services/nlpClient");
const { generateContent } = require("../services/geminiClient");

router.post("/", async (req, res) => {
  const { text, documentType = "job_description" } = req.body;

  if (!text || text.trim().length < 50) {
    return res.status(400).json({
      error: "Please provide at least 50 characters of text to analyze",
    });
  }

  try {
    // Run NLP + bias detection in parallel
    const [nlpResult, biasResult] = await Promise.all([
      analyzeTextWithNLP(text),
      Promise.resolve(detectBiasPatterns(text)),
    ]);

    const { detectedBias, biasScore, grade, totalIssues } = biasResult;

    // Build highlighted text — mark biased words
    let highlightedText = text;
    const allBiasedWords = detectedBias.flatMap((b) => b.foundWords);

    // Sort by length descending to avoid partial replacements
    allBiasedWords.sort((a, b) => b.length - a.length);
    for (const word of allBiasedWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      highlightedText = highlightedText.replace(regex, `##${word}##`);
    }

    // Gemini rewrites the text bias-free
    let rewrittenText = "";
    let geminiExplanation = "";

    if (detectedBias.length > 0) {
      const biasedWordsList = detectedBias
        .map((b) => `${b.type}: ${b.foundWords.join(", ")}`)
        .join("\n");

      const prompt = `You are an expert in inclusive language and HR compliance.

Rewrite this ${documentType.replace("_", " ")} to be completely free of bias.

ORIGINAL TEXT:
${text}

BIAS ISSUES FOUND:
${biasedWordsList}

Requirements:
1. Remove ALL biased language listed above
2. Keep the same meaning and requirements
3. Make it inclusive for all genders, ages, abilities, and cultures
4. Keep it professional and compelling
5. Add a note about the company being an equal opportunity employer

Also provide a 2-sentence explanation of the main bias issues found.

Format your response as JSON:
{
  "rewritten": "...",
  "explanation": "..."
}`;

      try {
        const response = await generateContent(prompt, {
          maxTokens: 2000,
          temperature: 0.3,
        });
        const cleaned = response
          .replace(/^```json\s*/im, "")
          .replace(/```\s*$/im, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        rewrittenText = parsed.rewritten || "";
        geminiExplanation = parsed.explanation || "";
      } catch {
        rewrittenText = text;
        geminiExplanation = "Unable to generate rewrite.";
      }
    } else {
      rewrittenText = text;
      geminiExplanation =
        "No significant bias detected. This text appears to be inclusive.";
    }

    // Compliance implications
    const complianceRisks = [];
    for (const bias of detectedBias) {
      if (bias.severity === "CRITICAL" || bias.severity === "HIGH") {
        if (bias.category === "racial_cultural") {
          complianceRisks.push({
            law: "DPDP Act 2023 + Article 15",
            flag: "🇮🇳",
            risk: "Potential constitutional violation — discrimination on grounds of religion/race/caste",
            penalty: "Up to ₹250 crore",
          });
        }
        if (bias.category === "age_bias") {
          complianceRisks.push({
            law: "Age Discrimination in Employment Act",
            flag: "🇺🇸",
            risk: "Age bias in job requirements may constitute unlawful discrimination",
            penalty: "Civil liability + back pay",
          });
        }
        if (bias.category === "disability_bias") {
          complianceRisks.push({
            law: "Rights of Persons with Disabilities Act 2016",
            flag: "🇮🇳",
            risk: "Physical requirements may discriminate against qualified disabled applicants",
            penalty: "Legal action + remediation order",
          });
        }
      }
    }

    res.json({
      success: true,
      biasScore,
      grade,
      totalIssues,
      detectedBias,
      highlightedText,
      rewrittenText,
      geminiExplanation,
      complianceRisks,
      nlpEntities: nlpResult.entities.slice(0, 10),
      documentType,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[textAnalyze]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
