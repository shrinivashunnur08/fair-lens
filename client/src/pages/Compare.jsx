import { useState } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import toast from "react-hot-toast";

const gradeColor = (g) => {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

function computeDIR(rows, outcomeCol, protectedCol, positiveVal) {
  const groups = {};
  for (const row of rows) {
    const key = String(row[protectedCol] ?? "unknown").trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  const rates = {};
  for (const [g, r] of Object.entries(groups)) {
    const pos = r.filter(
      (row) => String(row[outcomeCol]).trim().toLowerCase() === positiveVal.toLowerCase()
    ).length;
    rates[g] = r.length > 0 ? pos / r.length : 0;
  }
  const vals = Object.values(rates);
  const mx = Math.max(...vals), mn = Math.min(...vals);
  const ratio = mx > 0 ? mn / mx : 1;
  const score = Math.max(0, Math.min(100, Math.round(100 - (1 - ratio) * 60)));
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";
  return { ratio: Math.round(ratio * 1000) / 1000, score, grade };
}

export default function Compare() {
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforeRows, setBeforeRows] = useState([]);
  const [afterRows, setAfterRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [outcomeCol, setOutcomeCol] = useState("");
  const [protectedCol, setProtectedCol] = useState("");
  const [positiveVal, setPositiveVal] = useState("1");
  const [result, setResult] = useState(null);

  const parseFile = (file, setter) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setter(data);
        if (!headers.length) {
          setHeaders(meta.fields || []);
          setOutcomeCol(meta.fields?.[meta.fields.length - 1] || "");
          setProtectedCol(meta.fields?.[0] || "");
        }
        toast.success(`${file.name} loaded — ${data.length} rows`);
      },
    });
  };

  const handleCompare = () => {
    if (!beforeRows.length || !afterRows.length || !outcomeCol || !protectedCol) {
      toast.error("Please upload both files and configure columns");
      return;
    }
    const before = computeDIR(beforeRows, outcomeCol, protectedCol, positiveVal);
    const after = computeDIR(afterRows, outcomeCol, protectedCol, positiveVal);
    setResult({ before, after, improvement: after.score - before.score });
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display font-800 text-3xl text-white mb-2">
            Before vs After Comparison
          </h1>
          <p className="text-muted font-body">
            Upload your original biased dataset and your debiased version to measure fairness improvement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[
            { label: "Original (Biased) Dataset", setter: setBeforeFile, file: beforeFile, color: "danger" },
            { label: "Debiased Dataset", setter: setAfterFile, file: afterFile, color: "success" },
          ].map(({ label, setter, file, color }) => (
            <div key={label} className="glass-card p-6">
              <p className={`font-display font-700 text-sm text-${color} mb-4`}>{label}</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) { setter(f); parseFile(f, color === "danger" ? setBeforeRows : setAfterRows); }
                }}
                className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-brand-500/20 file:text-brand-400 file:font-body hover:file:bg-brand-500/30"
              />
              {file && (
                <p className="text-success text-xs font-body mt-2">✓ {file.name}</p>
              )}
            </div>
          ))}
        </div>

        {headers.length > 0 && (
          <div className="glass-card p-5 mb-6">
            <p className="text-muted text-xs font-body uppercase tracking-widest mb-3">Configure Analysis</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-muted text-xs font-body block mb-1">Outcome Column</label>
                <select value={outcomeCol} onChange={(e) => setOutcomeCol(e.target.value)}
                  className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-white text-sm">
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-muted text-xs font-body block mb-1">Protected Attribute</label>
                <select value={protectedCol} onChange={(e) => setProtectedCol(e.target.value)}
                  className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-white text-sm">
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-muted text-xs font-body block mb-1">Positive Value</label>
                <input value={positiveVal} onChange={(e) => setPositiveVal(e.target.value)}
                  className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-white text-sm font-mono" />
              </div>
            </div>
            <button onClick={handleCompare} className="btn-primary mt-4">
              Compare Datasets
            </button>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8">
            <p className="text-muted text-xs font-body uppercase tracking-widest mb-6 text-center">
              Fairness Improvement
            </p>
            <div className="flex items-center justify-center gap-12">
              {[
                { label: "Before (Biased)", data: result.before },
                { label: "After (Debiased)", data: result.after },
              ].map(({ label, data }) => (
                <div key={label} className="text-center">
                  <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-3 border-2 mx-auto"
                    style={{ background: `${gradeColor(data.grade)}15`, borderColor: `${gradeColor(data.grade)}40` }}>
                    <span className="font-display font-800 text-4xl" style={{ color: gradeColor(data.grade) }}>
                      {data.grade}
                    </span>
                  </div>
                  <p className="font-display font-700 text-white text-xl">{data.score}/100</p>
                  <p className="text-muted text-xs font-body mt-1">DIR: {data.ratio}</p>
                  <p className="text-muted text-xs font-body">{label}</p>
                </div>
              ))}
            </div>

            <div className={`mt-8 rounded-xl px-6 py-4 text-center ${
              result.improvement > 0 ? "bg-success/10 border border-success/30" : "bg-danger/10 border border-danger/30"
            }`}>
              <p className={`font-display font-800 text-3xl mb-1 ${result.improvement > 0 ? "text-success" : "text-danger"}`}>
                {result.improvement > 0 ? "+" : ""}{result.improvement} points
              </p>
              <p className={`text-sm font-body ${result.improvement > 0 ? "text-success/80" : "text-danger/80"}`}>
                {result.improvement > 0
                  ? `Fairness improved significantly — your debiasing strategy is working!`
                  : `No improvement detected — try a different mitigation strategy`}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}