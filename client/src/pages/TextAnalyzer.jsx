import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { api } from "../utils/api";

const gradeColor = (g) => {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

const severityConfig = {
  CRITICAL: {
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
    icon: "🔴",
  },
  HIGH: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: "🟠",
  },
  MEDIUM: {
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: "🟡",
  },
  LOW: {
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    icon: "🟢",
  },
};

const SAMPLE_TEXTS = {
  job_description: `We are looking for a young, energetic rockstar developer to join our aggressive startup team. The ideal candidate is a ninja programmer with 10+ years experience. Must be physically fit and a native English speaker. We want someone who is a culture fit and can dominate in a competitive environment. Recent graduates preferred. Looking for the next coding guru to join our all-star team.`,

  loan_policy: `Loan applicants must be healthy and able-bodied. Young professionals with stable employment are preferred. Local candidates preferred. Native residents will be given priority. Strong family men with traditional values are ideal applicants.`,

  medical_intake: `Patient must be physically fit and mobile. Young patients are better candidates for this procedure. Ethnic background must be documented. Native language proficiency required for all documentation.`,
};

function HighlightedText({ text }) {
  const parts = text.split(/(##[^#]+##)/g);
  return (
    <p className="text-subtle text-sm font-body leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("##") && part.endsWith("##")) {
          const word = part.slice(2, -2);
          return (
            <mark
              key={i}
              className="bg-danger/25 text-danger rounded px-0.5 font-600 not-italic"
            >
              {word}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export default function TextAnalyzer() {
  const [text, setText] = useState("");
  const [docType, setDocType] = useState("job_description");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("original"); // original | rewritten

  const handleAnalyze = async () => {
    if (text.trim().length < 50) {
      toast.error("Please enter at least 50 characters");
      return;
    }
    setLoading(true);
    setResult(null);
    toast.loading("Analyzing text for bias…", { id: "text-analyze" });

    try {
      const res = await fetch(api("/api/text-analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, documentType: docType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      toast.success("Text analyzed!", { id: "text-analyze" });
    } catch (err) {
      toast.error(err.message, { id: "text-analyze" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const gradeCol = gradeColor(result?.grade);

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-display font-800 text-3xl text-white">
                ProBias Shield
              </h1>
              <p className="text-muted font-body text-sm">
                Detect bias in job descriptions, policies & forms — powered by
                <span className="text-brand-400 font-600">
                  {" "}
                  Cloud Natural Language API
                </span>
              </p>
            </div>
          </div>

          {/* Value prop */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {[
              { icon: "🔍", label: "Proactive Detection" },
              { icon: "🤖", label: "Cloud NLP API" },
              { icon: "✍️", label: "Gemini Rewrite" },
              { icon: "⚖️", label: "Legal Compliance" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full bg-bg-card border border-bg-border text-xs text-muted font-body"
              >
                {icon} {label}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            {/* Document type */}
            <div className="glass-card p-4">
              <p className="text-muted text-xs font-body uppercase tracking-widest mb-3">
                Document Type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "job_description",
                    label: "Job Description",
                    icon: "💼",
                  },
                  { id: "loan_policy", label: "Loan Policy", icon: "🏦" },
                  { id: "medical_intake", label: "Medical Form", icon: "🏥" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDocType(t.id)}
                    className={`p-2.5 rounded-xl border text-xs font-body transition-all text-center ${
                      docType === t.id
                        ? "border-brand-500/60 bg-brand-500/10 text-brand-400"
                        : "border-bg-border text-muted hover:border-brand-500/30"
                    }`}
                  >
                    <span className="block text-lg mb-1">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted text-xs font-body uppercase tracking-widest">
                  Paste Your Text
                </p>
                <div className="flex gap-2">
                  {Object.keys(SAMPLE_TEXTS).map(
                    (key) =>
                      key === docType && (
                        <button
                          key={key}
                          onClick={() => setText(SAMPLE_TEXTS[key])}
                          className="text-[10px] text-brand-400 hover:text-brand-300 font-body border border-brand-500/30 px-2 py-0.5 rounded"
                        >
                          Try sample
                        </button>
                      ),
                  )}
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste your ${docType.replace("_", " ")} here…`}
                rows={12}
                className="w-full bg-bg-secondary border border-bg-border rounded-xl px-4 py-3 text-sm text-white font-body placeholder:text-muted/50 resize-none focus:outline-none focus:border-brand-500/50 transition-colors"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-muted text-[10px] font-body">
                  {text.length} characters
                </span>
                <button
                  onClick={() => setText("")}
                  className="text-muted text-[10px] font-body hover:text-danger transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || text.length < 50}
              className={`btn-primary w-full justify-center py-3 ${loading ? "opacity-70 cursor-wait" : ""}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Analyzing with Cloud NLP…</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span>Analyze for Bias</span>
                </>
              )}
            </button>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {!result && !loading && (
              <div className="glass-card p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-white font-display font-700 text-base mb-2">
                  Paste text to analyze
                </p>
                <p className="text-muted text-xs font-body text-center leading-relaxed">
                  ProBias Shield detects gender-coded language, age bias,
                  disability discrimination, and cultural bias before your
                  documents go live.
                </p>
              </div>
            )}

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Score card */}
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-800 text-2xl border-2"
                        style={{
                          background: `${gradeCol}15`,
                          borderColor: `${gradeCol}40`,
                          color: gradeCol,
                        }}
                      >
                        {result.grade}
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-700 text-white text-lg">
                          {result.biasScore}/100 Inclusivity Score
                        </p>
                        <p className="text-muted text-xs font-body">
                          {result.totalIssues} bias pattern
                          {result.totalIssues !== 1 ? "s" : ""} detected via
                          Cloud Natural Language API
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                          <span className="text-blue-400 text-[10px] font-body">
                            Powered by Cloud Natural Language API
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="mt-4">
                      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${result.biasScore}%`,
                            background: gradeCol,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted font-body mt-1">
                        <span>Highly Biased</span>
                        <span>Fully Inclusive</span>
                      </div>
                    </div>
                  </div>

                  {/* Gemini explanation */}
                  {result.geminiExplanation && (
                    <div className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                          <span className="text-white text-[8px] font-700">
                            G
                          </span>
                        </div>
                        <span className="text-brand-400 text-xs font-display font-600">
                          Gemini 2.5 Flash Analysis
                        </span>
                      </div>
                      <p className="text-subtle text-xs font-body leading-relaxed">
                        {result.geminiExplanation}
                      </p>
                    </div>
                  )}

                  {/* Bias findings */}
                  {result.detectedBias.length > 0 && (
                    <div className="glass-card p-4 space-y-3">
                      <p className="text-muted text-[10px] uppercase tracking-widest font-body">
                        Bias Patterns Detected
                      </p>
                      {result.detectedBias.map((bias, i) => {
                        const cfg = severityConfig[bias.severity];
                        return (
                          <div
                            key={i}
                            className={`rounded-xl ${cfg.bg} border ${cfg.border} p-3`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span>{cfg.icon}</span>
                              <span
                                className={`font-display font-700 text-xs ${cfg.color}`}
                              >
                                {bias.type}
                              </span>
                              <span
                                className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-700 ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                              >
                                {bias.severity}
                              </span>
                            </div>
                            <p className="text-muted text-[11px] font-body mb-2">
                              {bias.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {bias.foundWords.map((word) => (
                                <span
                                  key={word}
                                  className="flex items-center gap-1"
                                >
                                  <span className="px-2 py-0.5 rounded bg-danger/20 text-danger text-[10px] font-mono line-through">
                                    {word}
                                  </span>
                                  {bias.replacements[word] && (
                                    <>
                                      <span className="text-muted text-[10px]">
                                        →
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[10px] font-mono">
                                        {bias.replacements[word]}
                                      </span>
                                    </>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Compliance risks */}
                  {result.complianceRisks.length > 0 && (
                    <div className="glass-card p-4 space-y-2">
                      <p className="text-muted text-[10px] uppercase tracking-widest font-body">
                        Legal Compliance Risks
                      </p>
                      {result.complianceRisks.map((risk, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-3 rounded-xl bg-danger/5 border border-danger/20"
                        >
                          <span className="text-base flex-shrink-0">
                            {risk.flag}
                          </span>
                          <div>
                            <p className="text-danger text-xs font-display font-700">
                              {risk.law}
                            </p>
                            <p className="text-danger/70 text-[11px] font-body">
                              {risk.risk}
                            </p>
                            <p className="text-danger/50 text-[10px] font-body mt-0.5">
                              Penalty: {risk.penalty}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Original vs Rewritten */}
                  {result.rewrittenText && result.totalIssues > 0 && (
                    <div className="glass-card p-4">
                      <div className="flex gap-1 mb-4 p-1 bg-bg-secondary rounded-lg w-fit">
                        {["original", "rewritten"].map((view) => (
                          <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`px-3 py-1.5 rounded-md text-xs font-display font-600 transition-all capitalize ${
                              activeView === view
                                ? "bg-brand-500 text-white"
                                : "text-muted hover:text-white"
                            }`}
                          >
                            {view === "original"
                              ? "⚠ Original"
                              : "✓ Bias-Free Rewrite"}
                          </button>
                        ))}
                      </div>

                      <div className="bg-bg-secondary rounded-xl p-4 relative">
                        {activeView === "original" ? (
                          <HighlightedText text={result.highlightedText} />
                        ) : (
                          <p className="text-subtle text-sm font-body leading-relaxed">
                            {result.rewrittenText}
                          </p>
                        )}

                        {activeView === "rewritten" && (
                          <button
                            onClick={() => handleCopy(result.rewrittenText)}
                            className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-success/10 border border-success/25 text-success text-[10px] font-body hover:bg-success/20 transition-colors"
                          >
                            Copy
                          </button>
                        )}
                      </div>

                      {activeView === "rewritten" && (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-success/5 border border-success/15">
                          <svg
                            className="w-3.5 h-3.5 text-success flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-success text-[11px] font-body">
                            Rewritten by Gemini 2.5 Flash — inclusive, legally
                            compliant, ready to publish
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* All clear */}
                  {result.totalIssues === 0 && (
                    <div className="glass-card p-6 text-center">
                      <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center mx-auto mb-3">
                        <svg
                          className="w-6 h-6 text-success"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <p className="font-display font-700 text-success text-base mb-1">
                        Excellent! No Bias Detected
                      </p>
                      <p className="text-muted text-xs font-body">
                        This text appears inclusive and compliant.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
