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
    const [nlpResult, biasResult] = await Promise.all([
      analyzeTextWithNLP(text),
      Promise.resolve(detectBiasPatterns(text)),
    ]);

    const { detectedBias, biasScore, grade, totalIssues } = biasResult;

    let highlightedText = text;
    const allBiasedWords = detectedBias.flatMap((b) => b.foundWords);
    allBiasedWords.sort((a, b) => b.length - a.length);
    for (const word of allBiasedWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      highlightedText = highlightedText.replace(regex, `##${word}##`);
    }

    let rewrittenText = "";
    let geminiExplanation = "";

    if (detectedBias.length > 0) {
      const biasedWordsList = detectedBias
        .map((b) => `${b.foundWords.join(", ")}`)
        .join(", ");

      const rewritePrompt = `You are an inclusive language expert. Rewrite the following ${documentType.replace("_", " ")} to remove all biased language. Make it fully inclusive for all genders, ages, abilities, and cultures. Keep the same meaning. Add "Equal Opportunity Employer" at the end.

ORIGINAL TEXT:
${text}

BIASED WORDS TO REMOVE: ${biasedWordsList}

Write ONLY the rewritten text. No explanation. No JSON. No markdown. Just the plain rewritten text.`;

      const explanationPrompt = `In exactly 2 sentences, explain the main bias issues in this text: "${text.slice(0, 300)}". Be specific about which words are problematic and why.`;

      try {
        const [rewriteResponse, explanationResponse] = await Promise.all([
          generateContent(rewritePrompt, { maxTokens: 1500, temperature: 0.3 }),
          generateContent(explanationPrompt, {
            maxTokens: 200,
            temperature: 0.3,
          }),
        ]);

        rewrittenText = rewriteResponse
          .replace(/^```[\w]*\n?/im, "")
          .replace(/```$/im, "")
          .replace(/^(rewritten text|here is|here's|output|result):?\s*/im, "")
          .trim();

        geminiExplanation = explanationResponse
          .replace(/^```[\w]*\n?/im, "")
          .replace(/```$/im, "")
          .trim();

        console.log("[textAnalyze] Rewrite length:", rewrittenText.length);
        console.log(
          "[textAnalyze] Explanation:",
          geminiExplanation.slice(0, 80),
        );
      } catch (geminiErr) {
        console.error("[textAnalyze] Gemini error:", geminiErr.message);
        rewrittenText = "";
        geminiExplanation = `${detectedBias.length} bias pattern(s) detected including ${detectedBias.map((b) => b.type).join(", ")}. Remove highlighted words to make this document more inclusive.`;
      }
    } else {
      rewrittenText = text;
      geminiExplanation =
        "No significant bias detected. This text appears to be inclusive.";
    }

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
