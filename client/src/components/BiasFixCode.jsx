import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const STRATEGIES = [
  {
    id: "auto",
    label: "Auto-detect",
    desc: "FairLens picks the best technique based on your bias severity",
    icon: "🤖",
  },
  {
    id: "reweighting",
    label: "Sample Reweighting",
    desc: "Upweight underrepresented groups during model training",
    icon: "⚖",
  },
  {
    id: "suppression",
    label: "Feature Suppression",
    desc: "Remove biased attributes and their proxy correlates",
    icon: "🚫",
  },
  {
    id: "threshold",
    label: "Threshold Optimisation",
    desc: "Set group-specific decision thresholds for equal outcomes",
    icon: "🎯",
  },
];

/* ─── Minimal syntax highlighter (no external dep) ────── */
function SyntaxLine({ line }) {
  // Keywords
  const highlighted = line
    .replace(
      /(import|from|def|class|return|if|else|elif|for|in|and|or|not|True|False|None|with|as|try|except|raise|print|lambda|pass)\b/g,
      "<kw>$1</kw>",
    )
    .replace(
      /("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"[^"]*"|\'[^\']*\')/g,
      "<str>$1</str>",
    )
    .replace(/(#.*)$/g, "<cmt>$1</cmt>")
    .replace(/\b(\d+\.?\d*)\b/g, "<num>$1</num>");

  return (
    <span
      dangerouslySetInnerHTML={{ __html: highlighted }}
      style={{
        "--kw": "#c084fc",
        "--str": "#86efac",
        "--cmt": "#64748b",
        "--num": "#fb923c",
      }}
    />
  );
}

/* ─── Line-numbered code block ───────────────────────── */
function CodeBlock({ code }) {
  const lines = code.split("\n");

  return (
    <div className="relative rounded-xl overflow-hidden border border-bg-border">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border-b border-bg-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-danger/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <span className="text-muted text-xs font-mono ml-2">fix_bias.py</span>
      </div>

      {/* Code */}
      <div
        className="overflow-auto max-h-[520px]"
        style={{ background: "#080812" }}
      >
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td
                  className="text-right pr-4 pl-3 py-0 select-none text-[11px] font-mono"
                  style={{
                    color: "#3d4760",
                    minWidth: "3rem",
                    verticalAlign: "top",
                    paddingTop: "1px",
                  }}
                >
                  {i + 1}
                </td>
                <td
                  className="text-[12px] font-mono py-0 pr-4"
                  style={{
                    color: "#c8d3f5",
                    whiteSpace: "pre",
                    paddingTop: "1px",
                    lineHeight: "1.65",
                  }}
                >
                  <style>{`
                    kw  { color: #c084fc; font-weight: 500; }
                    str { color: #86efac; }
                    cmt { color: #4c5a7a; font-style: italic; }
                    num { color: #fb923c; }
                  `}</style>
                  <SyntaxLine line={line} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function BiasFixCode({ analysisId, biasResults = [] }) {
  const [strategy, setStrategy] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { code, strategy, flaggedCount }
  const [copied, setCopied] = useState(false);

  const flaggedCount = biasResults.filter(
    (b) => b.disparateImpact?.flagged || b.statisticalParity?.flagged,
  ).length;

  const generate = async () => {
    setLoading(true);
    setResult(null);
    toast.loading("Fair Lens is writing your fix code…", { id: "fix" });
    try {
      const res = await fetch(`/api/fix/${analysisId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setResult(data);
      toast.success("Bias fix code generated!", { id: "fix" });
    } catch (err) {
      toast.error(err.message || "Code generation failed", { id: "fix" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.code) return;
    const blob = new Blob([result.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fix_bias.py";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("fix_bias.py downloaded!");
  };

  return (
    <div className="space-y-5">
      {/* Header + explainer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/25 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display font-700 text-white text-base">
                Bias Fix Code Generator
              </h3>
              {flaggedCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-danger/12 border border-danger/25 text-danger text-[10px] font-700">
                  {flaggedCount} attribute{flaggedCount > 1 ? "s" : ""} to fix
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-success/12 border border-success/25 text-success text-[10px] font-700">
                  No violations — code shows best practices
                </span>
              )}
            </div>
            <p className="text-muted text-xs font-body leading-relaxed max-w-2xl">
              Gemini 1.5 Pro writes production-ready Python code that applies
              your chosen mitigation strategy to reduce the detected bias. The
              generated script is self-contained — run it directly with{" "}
              <span className="font-mono text-subtle">python fix_bias.py</span>.
            </p>
          </div>
        </div>

        {/* The measure → flag → FIX pipeline */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {[
            { label: "① Measure", color: "text-muted", done: true },
            { label: "→", color: "text-muted/40", done: true },
            { label: "② Flag", color: "text-muted", done: true },
            { label: "→", color: "text-muted/40", done: true },
            { label: "③ FIX", color: "text-success", done: false },
          ].map(({ label, color, done }, i) => (
            <span
              key={i}
              className={`text-xs font-display font-700 ${color} ${done && label !== "→" ? "line-through opacity-50" : ""}`}
            >
              {label}
            </span>
          ))}
          <span className="text-success text-xs font-body ml-1">
            ← you are here
          </span>
        </div>
      </motion.div>

      {/* Strategy selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-5"
      >
        <p className="text-muted text-[10px] uppercase tracking-widest font-body mb-3">
          Choose mitigation strategy
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                strategy === s.id
                  ? "border-brand-500/60 bg-brand-500/10"
                  : "border-bg-border hover:border-brand-500/30 hover:bg-white/[0.02]"
              }`}
            >
              <span className="text-lg block mb-1">{s.icon}</span>
              <p
                className={`font-display font-700 text-xs mb-0.5 ${strategy === s.id ? "text-brand-400" : "text-white"}`}
              >
                {s.label}
              </p>
              <p className="text-muted text-[10px] font-body leading-snug">
                {s.desc}
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className={`btn-primary w-full justify-center py-3 ${loading ? "opacity-70 cursor-wait" : ""}`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Gemini is writing your fix code…</span>
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>
                {result ? "Regenerate fix code" : "Generate Python fix code"}
              </span>
            </>
          )}
        </button>
      </motion.div>

      {/* Code output */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Code action bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-success/10 border border-success/25 text-success text-[11px] font-700">
                  Strategy: {result.strategy}
                </span>
                <span className="text-muted text-xs font-body">
                  via {result.aiService}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-body transition-all ${
                    copied
                      ? "border-success/40 bg-success/8 text-success"
                      : "border-bg-border hover:border-brand-500/40 text-muted hover:text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy code
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bg-border hover:border-brand-500/40 text-muted hover:text-white text-xs font-body transition-all"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download .py
                </button>
              </div>
            </div>

            {/* Code block */}
            <CodeBlock code={result.code} />

            {/* Run instructions */}
            <div className="glass-card p-4">
              <p className="text-muted text-[10px] uppercase tracking-widest font-body mb-2">
                How to run
              </p>
              <div className="space-y-1.5">
                {[
                  "pip install pandas scikit-learn numpy",
                  `cp your_dataset.csv ${result.fileName}`,
                  "python fix_bias.py",
                ].map((cmd, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-success text-[11px] font-mono">
                      $
                    </span>
                    <code className="text-xs font-mono text-subtle bg-bg-secondary px-2 py-0.5 rounded flex-1">
                      {cmd}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
