const { LanguageServiceClient } = require("@google-cloud/language");

let client = null;

function getNLPClient() {
  if (client) return client;
  client = new LanguageServiceClient({
    projectId: process.env.GCP_PROJECT_ID || "fairlens-14363",
  });
  return client;
}

// Comprehensive bias word dictionaries
const BIAS_PATTERNS = {
  caste_bias: {
    words: [
      "upper caste",
      "lower caste",
      "scheduled caste",
      "general category",
      "brahmin",
      "forward caste",
      "backward class",
      "obc",
      "sc/st",
      "community certificate",
      "caste certificate",
      "gotra",
      "jati",
      "clean background",
      "good family",
      "traditional family values",
      "cultured family",
      "well-settled family",
    ],
    replacements: {
      "upper caste": "qualified candidate",
      "good family": "professional background",
      "traditional family values": "strong work ethic",
      "clean background": "verified background",
    },
    severity: "CRITICAL",
    type: "Caste Discrimination",
    description:
      "Violates SC/ST (Prevention of Atrocities) Act 1989 and Article 15 of Indian Constitution",
    category: "caste_bias",
  },
  socioeconomic_bias: {
    words: [
      "elite institution",
      "premium college",
      "tier 1 college",
      "iit only",
      "iim only",
      "ivy league",
      "premier institute",
      "top school background",
      "privileged background",
    ],
    replacements: {
      "elite institution": "accredited institution",
      "tier 1 college": "qualified institution",
      "premier institute": "recognized institution",
    },
    severity: "HIGH",
    type: "Socioeconomic Bias",
    description:
      "May discriminate based on socioeconomic background — violates equal opportunity principles",
    category: "socioeconomic_bias",
  },
  gender_male: {
    words: [
      "rockstar",
      "ninja",
      "wizard",
      "hacker",
      "aggressive",
      "dominant",
      "competitive",
      "assertive",
      "fearless",
      "hero",
      "guru",
      "master",
      "strong",
      "ambitious",
      "driven",
      "confident",
      "headstrong",
      "mankind",
    ],
    replacements: {
      rockstar: "skilled professional",
      ninja: "expert",
      wizard: "specialist",
      hacker: "developer",
      aggressive: "proactive",
      dominant: "leading",
      competitive: "results-oriented",
      mankind: "humanity",
      master: "expert",
      guru: "specialist",
    },
    severity: "MEDIUM",
    type: "Gender (Male-coded language)",
    description: "These words statistically attract fewer female applicants",
  },
  gender_female: {
    words: [
      "nurturing",
      "supportive",
      "warm",
      "cheerful",
      "collaborative",
      "gentle",
      "communal",
      "interpersonal",
      "passionate",
    ],
    replacements: {
      nurturing: "mentoring",
      supportive: "helpful",
    },
    severity: "LOW",
    type: "Gender (Female-coded language)",
    description: "May deter male applicants in some contexts",
  },
  age_bias: {
    words: [
      "young",
      "energetic",
      "fresh",
      "recent graduate",
      "digital native",
      "junior",
      "entry-level candidate",
      "youthful",
      "new blood",
      "early career",
      "millennials",
      "gen z",
      "young professional",
    ],
    replacements: {
      young: "motivated",
      energetic: "enthusiastic",
      fresh: "new perspective",
      youthful: "dynamic",
      "new blood": "fresh perspective",
    },
    severity: "HIGH",
    type: "Age Discrimination",
    description: "Violates Age Discrimination in Employment Act",
  },
  disability_bias: {
    words: [
      "physically fit",
      "able-bodied",
      "normal",
      "unrestricted mobility",
      "physically demanding",
      "must be able to stand",
      "healthy",
      "clean background",
    ],
    replacements: {
      "physically fit": "capable of performing job duties",
      "able-bodied": "qualified",
      healthy: "capable",
    },
    severity: "HIGH",
    type: "Disability Discrimination",
    description: "May violate ADA and persons with disabilities rights",
  },
  racial_cultural: {
    words: [
      "culture fit",
      "native english",
      "native speaker only",
      "traditional",
      "local candidate preferred",
      "mother tongue",
      "ethnic",
      "tribal",
    ],
    replacements: {
      "culture fit": "values alignment",
      "native english": "proficient English",
      "local candidate preferred": "candidates in [location]",
    },
    severity: "CRITICAL",
    type: "Racial/Cultural Bias",
    description: "Directly discriminatory under DPDP Act 2023 and Article 15",
  },
  experience_bias: {
    words: [
      "10+ years",
      "15+ years",
      "20+ years",
      "seasoned professional",
      "veteran",
      "proven track record of 10",
    ],
    replacements: {
      "10+ years": "extensive experience",
      "15+ years": "extensive experience",
    },
    severity: "MEDIUM",
    type: "Experience/Age Proxy Bias",
    description:
      "Excessive experience requirements may indicate age discrimination",
  },
};

async function analyzeTextWithNLP(text) {
  try {
    const nlp = getNLPClient();
    const document = {
      content: text,
      type: "PLAIN_TEXT",
    };

    // Run entity and syntax analysis in parallel
    const [entityResult, syntaxResult] = await Promise.all([
      nlp.analyzeEntities({ document }),
      nlp.analyzeSyntax({ document }),
    ]);

    return {
      entities: entityResult[0].entities || [],
      tokens: syntaxResult[0].tokens || [],
    };
  } catch (err) {
    console.error("[NLP] Analysis failed:", err.message);
    return { entities: [], tokens: [] };
  }
}

function detectBiasPatterns(text) {
  const lowerText = text.toLowerCase();
  const detectedBias = [];
  let totalBiasScore = 0;

  for (const [category, config] of Object.entries(BIAS_PATTERNS)) {
    const foundWords = config.words.filter((word) =>
      lowerText.includes(word.toLowerCase()),
    );

    if (foundWords.length > 0) {
      const severityScore = { CRITICAL: 30, HIGH: 20, MEDIUM: 10, LOW: 5 };
      totalBiasScore +=
        foundWords.length * (severityScore[config.severity] || 10);

      detectedBias.push({
        category,
        type: config.type,
        severity: config.severity,
        description: config.description,
        foundWords,
        replacements: config.replacements,
        count: foundWords.length,
      });
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  detectedBias.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const biasScore = Math.max(0, 100 - Math.min(totalBiasScore, 100));
  const grade =
    biasScore >= 90
      ? "A+"
      : biasScore >= 80
        ? "A"
        : biasScore >= 70
          ? "B"
          : biasScore >= 60
            ? "C"
            : biasScore >= 50
              ? "D"
              : "F";

  return { detectedBias, biasScore, grade, totalIssues: detectedBias.length };
}

module.exports = { analyzeTextWithNLP, detectBiasPatterns, BIAS_PATTERNS };
