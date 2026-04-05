import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
} from "recharts";
import toast from "react-hot-toast";
import { db } from "../firebase";
import WhatIfSimulator from "../components/WhatIfSimulator";
import IntersectionalBias from "../components/IntersectionalBias";
import ComplianceRadar from "../components/ComplianceRadar";
import GeminiChat from "../components/GeminiChat";
import BiasFixCode from "../components/BiasFixCode";
/* ─── helpers ───────────────────────────────────────────── */
const gradeColor = (g) => {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

const severityColor = (s) =>
  ({
    LOW: "#10b981",
    MEDIUM: "#f59e0b",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  })[s] || "#64748b";

const round2 = (n) => Math.round((n ?? 0) * 100) / 100;

/* ─── Animated counter ──────────────────────────────────── */
function AnimCounter({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    const inc = end / 40;
    const t = setInterval(() => {
      start += inc;
      if (start >= end) {
        setDisplay(end);
        clearInterval(t);
      } else setDisplay(start);
    }, 18);
    return () => clearInterval(t);
  }, [value]);
  return (
    <span>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}
    </span>
  );
}

/* ─── Metric card ───────────────────────────────────────── */
function MetricCard({ label, children, sub, color, icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-muted text-xs font-body uppercase tracking-wide">
          {label}
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}
        >
          {icon}
        </div>
      </div>
      <div className="font-display font-800 text-2xl mb-0.5">{children}</div>
      {sub && (
        <p className="text-muted text-xs font-body leading-snug mt-1">{sub}</p>
      )}
    </motion.div>
  );
}

/* ─── Custom chart tooltip ──────────────────────────────── */
function BiasTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0c0c1e",
        border: "1px solid #1e1e3f",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <p style={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

/* ─── Analyzing animation screen ────────────────────────── */
function AnalyzingScreen({ fileName }) {
  const steps = [
    "Parsing dataset rows…",
    "Detecting protected attributes…",
    "Computing Disparate Impact Ratio…",
    "Computing Statistical Parity…",
    "Sending to Gemini 2.5 flash…",
    "Generating explanations…",
    "Building Fairness Score…",
  ];
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setCur((c) => (c < steps.length - 1 ? c + 1 : c)),
      1800,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 bg-bg-primary">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 rounded-full bg-brand-500/20 animate-ping" />
          <div className="absolute w-16 h-16 rounded-full bg-brand-500/30 animate-pulse" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center glow-brand z-10">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="white" />
              <circle cx="3" cy="4" r="1.5" fill="white" opacity="0.6" />
              <circle cx="13" cy="4" r="1.5" fill="white" opacity="0.6" />
            </svg>
          </div>
        </div>
        <h1 className="font-display font-700 text-2xl text-white mb-2">
          Analyzing for Bias
        </h1>
        <p className="text-muted text-sm font-body mb-8">{fileName}</p>
        <div className="glass-card p-5 text-left space-y-2 mb-6">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  i < cur
                    ? "bg-success"
                    : i === cur
                      ? "bg-brand-500 animate-pulse"
                      : "border border-bg-border"
                }`}
              >
                {i < cur && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span
                className={`text-xs font-body ${i <= cur ? "text-subtle" : "text-muted/30"}`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
        <p className="text-muted text-xs font-body">
          Powered by <span className="text-brand-400">Gemini 2.5 flash</span> ·
          Usually takes 20–60 seconds
        </p>
      </div>
    </div>
  );
}

/* ─── Gemini finding accordion card ─────────────────────── */
function FindingCard({ finding, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
          <span className="font-display font-600 text-white text-sm">
            {finding.headline || finding.attribute}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger text-[10px] font-600 uppercase">
            bias detected
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-muted transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-bg-border"
          >
            <div className="px-5 pb-5 space-y-4 pt-4">
              {finding.explanation && (
                <div>
                  <p className="text-muted text-[10px] uppercase tracking-widest mb-1.5 font-600">
                    What it means
                  </p>
                  <p className="text-subtle text-sm font-body leading-relaxed">
                    {finding.explanation}
                  </p>
                </div>
              )}
              {finding.legalRisk && (
                <div className="rounded-xl bg-warning/8 border border-warning/20 px-4 py-3">
                  <p className="text-warning text-[10px] uppercase tracking-widest mb-1 font-600">
                    Legal / regulatory risk
                  </p>
                  <p className="text-warning/80 text-xs font-body leading-relaxed">
                    {finding.legalRisk}
                  </p>
                </div>
              )}
              {finding.recommendation && (
                <div className="rounded-xl bg-success/8 border border-success/20 px-4 py-3">
                  <p className="text-success text-[10px] uppercase tracking-widest mb-1 font-600">
                    Recommended fix
                  </p>
                  <p className="text-success/80 text-xs font-body leading-relaxed">
                    {finding.recommendation}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Per-attribute bias section ─────────────────────────── */
function BiasAttributeSection({ result, index }) {
  const {
    attribute,
    attributeType,
    disparateImpact,
    statisticalParity,
    stats,
  } = result;
  const COLORS = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#22d3ee",
    "#fb923c",
  ];

  const barData = (stats || []).map((s) => ({
    name: s.group.length > 12 ? s.group.slice(0, 12) + "…" : s.group,
    rate: round2((s.rate ?? 0) / 100),
    total: s.total,
  }));

  const dirFlagged = disparateImpact?.flagged;
  const spdFlagged = statisticalParity?.flagged;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-card p-6"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-700 text-xs text-white ${
              dirFlagged || spdFlagged
                ? "bg-danger/20 border border-danger/30"
                : "bg-success/20 border border-success/30"
            }`}
          >
            {attribute.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display font-700 text-white text-base capitalize">
              {attribute}
            </p>
            <p className="text-muted text-xs font-body capitalize">
              {attributeType} attribute
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-xs font-600 border ${
              dirFlagged
                ? "bg-danger/10 border-danger/30 text-danger"
                : "bg-success/10 border-success/30 text-success"
            }`}
          >
            DIR {round2(disparateImpact?.ratio)} {dirFlagged ? "⚠ < 0.8" : "✓"}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-600 border ${
              spdFlagged
                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                : "bg-success/10 border-success/30 text-success"
            }`}
          >
            SPD {round2(statisticalParity?.difference)}{" "}
            {spdFlagged ? "⚠ > 0.1" : "✓"}
          </span>
        </div>
      </div>

      {/* Bar chart */}
      {barData.length > 0 && (
        <div className="mb-5">
          <p className="text-muted text-xs font-body mb-3 uppercase tracking-wide">
            Approval rate by group
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={barData}
              margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e1e3f"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BiasTooltip />} />
              <Bar
                dataKey="rate"
                name="Approval rate"
                radius={[4, 4, 0, 0]}
                maxBarSize={52}
              >
                {barData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats table */}
      <div className="rounded-xl overflow-hidden border border-bg-border mb-4">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="bg-bg-card">
              <th className="px-3 py-2.5 text-left text-muted font-600">
                Group
              </th>
              <th className="px-3 py-2.5 text-right text-muted font-600">
                Total
              </th>
              <th className="px-3 py-2.5 text-right text-muted font-600">
                Approved
              </th>
              <th className="px-3 py-2.5 text-right text-muted font-600">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {(stats || []).map((s, i) => (
              <tr
                key={s.group}
                className={`border-t border-bg-border/50 ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
              >
                <td className="px-3 py-2 text-white font-600 capitalize">
                  {s.group}
                </td>
                <td className="px-3 py-2 text-right text-muted">
                  {s.total?.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right text-muted">
                  {s.positive?.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono font-600">
                  <span
                    className={
                      (s.rate ?? 0) < 30
                        ? "text-danger"
                        : (s.rate ?? 0) < 50
                          ? "text-warning"
                          : "text-success"
                    }
                  >
                    {s.rate ?? 0}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warning banner */}
      {dirFlagged && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-danger/8 border border-danger/20">
          <svg
            className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-danger/90 text-xs font-body leading-relaxed">
            DIR of <strong>{round2(disparateImpact?.ratio)}</strong> is below
            the 0.8 threshold — likely constitutes illegal discrimination under
            EEOC 4/5ths rule.
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [rows, setRows] = useState([]); // for What-If Simulator
  const [downloading, setDownloading] = useState(false); // PDF report
  const [chatOpen, setChatOpen] = useState(false);
  /* Real-time Firestore listener */
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, "analyses", id),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        setAnalysis({ id: snap.id, ...snap.data() });
      },
      () => setNotFound(true),
    );
    return unsub;
  }, [id]);

  /* Fetch dataset rows from Firestore for What-If Simulator */
  useEffect(() => {
    if (!analysis?.datasetId || rows.length) return;
    getDoc(doc(db, "datasets", analysis.datasetId))
      .then((snap) => {
        if (snap.exists()) setRows(snap.data().rows || []);
      })
      .catch(console.error);
  }, [analysis?.datasetId, rows.length]);

  /* Download PDF audit report */
  const handleDownloadReport = useCallback(async () => {
    if (!id || downloading) return;
    setDownloading(true);
    toast.loading("Generating audit report… ", {
      id: "report",
    });
    try {
      const res = await fetch(`/api/report/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FairLens_Audit_${(analysis?.fileName || "report").replace(/\.csv$/, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!", { id: "report" });
    } catch (err) {
      toast.error(err.message || "Download failed", { id: "report" });
    } finally {
      setDownloading(false);
    }
  }, [id, downloading, analysis?.fileName]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 bg-bg-primary">
        <div>
          <p className="font-display font-700 text-2xl text-white mb-2">
            Analysis not found
          </p>
          <p className="text-muted font-body mb-6">
            This analysis doesn't exist or you don't have access.
          </p>
          <button onClick={() => navigate("/upload")} className="btn-primary">
            Start new analysis
          </button>
          <button
            onClick={() => setChatOpen(true)}
            className="btn-ghost text-sm border-brand-500/40 text-brand-400 hover:bg-brand-500/8"
          >
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Ask AI
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (analysis.status === "pending" || analysis.status === "analyzing") {
    return <AnalyzingScreen fileName={analysis.fileName} />;
  }

  if (analysis.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 pt-16 bg-bg-primary">
        <div className="glass-card p-10 max-w-md w-full">
          <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="font-display font-700 text-xl text-white mb-2">
            Analysis failed
          </h2>
          <p className="text-muted font-body text-sm mb-6">
            {analysis.errorMessage || "Unexpected error."}
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="btn-primary justify-center w-full"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ── Extract result data ─────────────────────────────── */
  const results = analysis.results || {};
  const fairScore = results.fairnessScore || { grade: "?", score: 0 };
  const biasResults = results.biasResults || [];
  const gemini = results.geminiInsights || {};
  const aiService = analysis.aiService || {
    name: "Gemini 2.5 Flash",
    isVertexAI: false,
  };
  const effectiveSeverity =
    fairScore.score >= 80
      ? fairScore.score >= 90
        ? "LOW"
        : "MEDIUM"
      : gemini.severity;
  const flaggedCount = results.flaggedAttributes ?? 0;
  const intersectionalData = results.intersectionalBias || { pairs: [] };
  const intersectionalFlagged = results.intersectionalFlagged ?? 0;
  const complianceData = results.complianceRadar || {
    violations: [],
    failCount: 0,
    passCount: 0,
  };
  const complianceViolations =
    results.complianceViolations ?? complianceData.failCount ?? 0;
  const totalAttrCount = results.totalAttributes ?? biasResults.length;
  const gradeCol = gradeColor(fairScore.grade);

  const radarData = biasResults.map((b) => ({
    subject: (b.attribute || "").slice(0, 10),
    Fairness: Math.round(Math.min(100, (b.disparateImpact?.ratio ?? 1) * 100)),
  }));

  /* ══ RENDER ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display font-800 text-2xl text-white">
                {analysis.fileName}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-success text-sm font-body">Complete</span>
              </div>
              {flaggedCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-danger/15 border border-danger/30 text-danger text-xs font-600">
                  {flaggedCount} violation{flaggedCount !== 1 ? "s" : ""}{" "}
                  detected
                </span>
              )}
              {intersectionalFlagged > 0 && (
                <span
                  className="px-2.5 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-600 cursor-pointer hover:bg-brand-500/25 transition-colors"
                  onClick={() => setActiveTab("intersectional")}
                >
                  {intersectionalFlagged} intersectional bias
                </span>
              )}
              {complianceViolations > 0 && (
                <span
                  className="px-2.5 py-0.5 rounded-full bg-danger/12 border border-danger/25 text-danger text-xs font-600 cursor-pointer hover:bg-danger/20 transition-colors"
                  onClick={() => setActiveTab("compliance")}
                >
                  ⚖ {complianceViolations} compliance risk
                  {complianceViolations !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-muted text-sm font-body">
              {(analysis.headers || []).length} columns · Outcome:{" "}
              <span className="text-success font-mono font-600">
                {analysis.outcomeCol}
              </span>{" "}
              · {totalAttrCount} attribute{totalAttrCount !== 1 ? "s" : ""}{" "}
              {analysis.rowCount
                ? `· ${analysis.rowCount.toLocaleString()} rows`
                : ""}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {aiService.isVertexAI ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25">
                  <span className="text-blue-400 text-[11px] font-display font-700">
                    Google Vertex AI
                  </span>
                  <span className="text-blue-400/60 text-[11px] font-body">
                    · Gemini 2.5 Flash
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <span className="text-brand-400 text-[11px] font-display font-700">
                    Gemini 2.5 Flash
                  </span>
                  <span className="text-brand-400/60 text-[11px] font-body">
                    · Google AI Studio
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/upload")}
            className="btn-ghost text-sm"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Analysis
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className={`btn-primary text-sm ${downloading ? "opacity-70 cursor-wait" : ""}`}
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            <span>{downloading ? "Generating…" : "Download Report"}</span>
          </button>
        </motion.div>

        {/* ── 4 metric cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            delay={0}
            label="Fairness Score"
            sub={
              fairScore.score >= 80
                ? "Low bias"
                : fairScore.score >= 60
                  ? "Moderate bias"
                  : "High bias — act now"
            }
            color={gradeCol}
            icon={
              <svg
                className="w-4 h-4"
                style={{ color: gradeCol }}
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
            }
          >
            <span style={{ color: gradeCol }}>
              {fairScore.grade}
              <span
                className="text-sm font-600 ml-1.5"
                style={{ color: `${gradeCol}99` }}
              >
                {fairScore.score}/100
              </span>
            </span>
          </MetricCard>

          <MetricCard
            delay={0.08}
            label="Disparate Impact"
            sub={`${biasResults.filter((b) => b.disparateImpact?.flagged).length} below 0.8 threshold`}
            color={
              biasResults.some((b) => b.disparateImpact?.flagged)
                ? "#ef4444"
                : "#10b981"
            }
            icon={
              <svg
                className="w-4 h-4"
                style={{
                  color: biasResults.some((b) => b.disparateImpact?.flagged)
                    ? "#ef4444"
                    : "#10b981",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
            }
          >
            <span
              style={{
                color: biasResults.some((b) => b.disparateImpact?.flagged)
                  ? "#ef4444"
                  : "#10b981",
              }}
            >
              <AnimCounter
                value={biasResults[0]?.disparateImpact?.ratio ?? 1}
                decimals={2}
              />
            </span>
          </MetricCard>

          <MetricCard
            delay={0.16}
            label="Statistical Parity"
            sub={`${biasResults.filter((b) => b.statisticalParity?.flagged).length} above 0.1 gap`}
            color={
              biasResults.some((b) => b.statisticalParity?.flagged)
                ? "#f97316"
                : "#10b981"
            }
            icon={
              <svg
                className="w-4 h-4"
                style={{
                  color: biasResults.some((b) => b.statisticalParity?.flagged)
                    ? "#f97316"
                    : "#10b981",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          >
            <span
              style={{
                color: biasResults.some((b) => b.statisticalParity?.flagged)
                  ? "#f97316"
                  : "#10b981",
              }}
            >
              <AnimCounter
                value={biasResults[0]?.statisticalParity?.difference ?? 0}
                decimals={2}
              />
            </span>
          </MetricCard>

          <MetricCard
            delay={0.24}
            label="Attributes Checked"
            sub={`${flaggedCount} flagged · ${totalAttrCount - flaggedCount} clean`}
            color="#818cf8"
            icon={
              <svg
                className="w-4 h-4 text-brand-400"
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
            }
          >
            <span style={{ color: "#818cf8" }}>
              <AnimCounter value={totalAttrCount} />
            </span>
          </MetricCard>
        </div>

        {/* ── Tab nav ─────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 p-1 bg-bg-card rounded-xl border border-bg-border w-fit flex-wrap">
          {[
            { id: "overview", label: "Overview" },
            { id: "attributes", label: `Attributes (${totalAttrCount})` },
            {
              id: "intersectional",
              label: `⬡ Intersectional${intersectionalFlagged > 0 ? ` (${intersectionalFlagged})` : ""}`,
            },
            {
              id: "compliance",
              label: `⚖ Compliance${complianceViolations > 0 ? ` (${complianceViolations})` : ""}`,
            },
            { id: "whatif", label: "⚡ What-If" },
            { id: "fix", label: "🔧 Fix Code" },
            { id: "gemini", label: "✦ Gemini Insights" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-display font-600 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-brand-500 text-white shadow"
                  : "text-muted hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: OVERVIEW ════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Grade card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 flex flex-col items-center justify-center text-center"
              >
                <p className="text-muted text-xs font-body uppercase tracking-widest mb-4">
                  Overall Fairness Grade
                </p>
                <div
                  className="w-28 h-28 rounded-3xl flex items-center justify-center mb-4 border-2"
                  style={{
                    background: `${gradeCol}15`,
                    borderColor: `${gradeCol}40`,
                    boxShadow: `0 0 40px ${gradeCol}25`,
                  }}
                >
                  <span
                    className="font-display font-800 text-5xl"
                    style={{ color: gradeCol }}
                  >
                    {fairScore.grade}
                  </span>
                </div>
                <p className="font-display font-700 text-white text-2xl mb-1">
                  {fairScore.score}/100
                </p>
                <p className="text-muted text-xs font-body">
                  {fairScore.score >= 90
                    ? "Excellent — minimal bias"
                    : fairScore.score >= 80
                      ? "Good — minor disparities"
                      : fairScore.score >= 60
                        ? "Moderate — action recommended"
                        : fairScore.score >= 40
                          ? "Poor — significant bias"
                          : "Critical — severe violations"}
                </p>
                {effectiveSeverity && (
                  <div
                    className="mt-4 px-3 py-1 rounded-full text-xs font-600 border"
                    style={{
                      background: `${severityColor(effectiveSeverity)}15`,
                      borderColor: `${severityColor(effectiveSeverity)}40`,
                      color: severityColor(effectiveSeverity),
                    }}
                  >
                    {effectiveSeverity} severity
                  </div>
                )}
              </motion.div>

              {/* Radar chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5 lg:col-span-2"
              >
                <p className="text-muted text-xs font-body uppercase tracking-wide mb-3">
                  Fairness by attribute{" "}
                  <span className="normal-case">
                    (DIR × 100, higher = fairer)
                  </span>
                </p>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1e1e3f" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <Radar
                        name="Fairness"
                        dataKey="Fairness"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-muted text-sm font-body">
                    No attribute data
                  </div>
                )}
              </motion.div>
            </div>

            {/* Gemini summary */}
            {gemini.overallSummary && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-700">G</span>
                  </div>
                  <span className="text-brand-400 font-display font-600 text-sm">
                    Gemini 2.5 flash — Summary
                  </span>
                </div>
                <p className="text-subtle font-body text-sm leading-relaxed">
                  {gemini.overallSummary}
                </p>
              </motion.div>
            )}

            {/* Attribute quick-cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {biasResults.map((b, i) => (
                <motion.div
                  key={b.attribute}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="glass-card p-4 cursor-pointer hover:border-brand-500/40 transition-colors"
                  onClick={() => setActiveTab("attributes")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display font-700 text-white text-sm capitalize">
                      {b.attribute}
                    </span>
                    <span
                      className={`text-xs font-600 px-2 py-0.5 rounded-full ${
                        b.disparateImpact?.flagged ||
                        b.statisticalParity?.flagged
                          ? "bg-danger/15 text-danger"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      {b.disparateImpact?.flagged ||
                      b.statisticalParity?.flagged
                        ? "biased"
                        : "fair"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs font-body">
                    <div className="flex justify-between">
                      <span className="text-muted">Disparate Impact Ratio</span>
                      <span
                        className={`font-mono font-600 ${b.disparateImpact?.flagged ? "text-danger" : "text-success"}`}
                      >
                        {round2(b.disparateImpact?.ratio)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Statistical Parity Gap</span>
                      <span
                        className={`font-mono font-600 ${b.statisticalParity?.flagged ? "text-orange-400" : "text-success"}`}
                      >
                        {round2(b.statisticalParity?.difference)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Groups detected</span>
                      <span className="text-subtle font-mono">
                        {b.stats?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Intersectional teaser */}
            {intersectionalData.pairs?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-4 cursor-pointer hover:border-brand-500/30 transition-colors"
                onClick={() => setActiveTab("intersectional")}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-700 text-white text-sm">
                      Intersectional Analysis
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-brand-500/15 text-brand-400 border border-brand-500/20 font-700 uppercase">
                      Novel
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <div className="flex gap-4 text-xs font-body">
                  <span className="text-muted">
                    {intersectionalData.pairs.length} pairs analysed
                  </span>
                  {intersectionalFlagged > 0 ? (
                    <span className="text-danger font-600">
                      {intersectionalFlagged} with compounded bias
                    </span>
                  ) : (
                    <span className="text-success font-600">
                      No compounded bias found
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Compliance teaser */}
            {complianceViolations > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass-card p-4 cursor-pointer hover:border-danger/40 transition-colors border-danger/20"
                onClick={() => setActiveTab("compliance")}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-700 text-white text-sm">
                      Compliance Radar
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-danger/15 text-danger border border-danger/20 font-700 uppercase">
                      {complianceViolations} risk
                      {complianceViolations !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <div className="flex gap-3 text-[11px] font-body flex-wrap">
                  {(complianceData.violations || [])
                    .filter((v) => v.triggered)
                    .slice(0, 3)
                    .map((v) => (
                      <span key={v.id} className="flex items-center gap-1">
                        <span>{v.flag}</span>
                        <span className="text-muted">{v.shortName}</span>
                        <span
                          className={`font-600 ${v.riskLevel === "CRITICAL" ? "text-danger" : v.riskLevel === "HIGH" ? "text-orange-400" : "text-warning"}`}
                        >
                          · {v.riskLevel}
                        </span>
                      </span>
                    ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ══ TAB: ATTRIBUTES ══════════════════════════════ */}
        {activeTab === "attributes" && (
          <div className="space-y-5">
            {biasResults.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <p className="text-muted font-body">
                  No attribute data. Check that analysis completed successfully.
                </p>
              </div>
            ) : (
              biasResults.map((result, i) => (
                <BiasAttributeSection
                  key={result.attribute}
                  result={result}
                  index={i}
                />
              ))
            )}
          </div>
        )}
        {/* ══ TAB: INTERSECTIONAL BIAS ════════════════════════ */}
        {activeTab === "intersectional" && (
          <IntersectionalBias intersectionalData={intersectionalData} />
        )}
        {/* ══ TAB: COMPLIANCE RADAR ══════════════════════════ */}
        {activeTab === "compliance" && (
          <ComplianceRadar complianceData={complianceData} />
        )}
        {/* ══ TAB: WHAT-IF SIMULATOR ═══════════════════════ */}
        {activeTab === "whatif" &&
          (rows.length > 0 ? (
            <WhatIfSimulator analysis={analysis} rows={rows} />
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted font-body text-sm">
                Loading dataset for simulation…
              </p>
              <p className="text-muted/60 font-body text-xs mt-1">
                Fetching rows from Firestore
              </p>
            </div>
          ))}
        {/* ══ TAB: FIX CODE ═══════════════════════════════════ */}
        {activeTab === "fix" && (
          <BiasFixCode analysisId={id} biasResults={biasResults} />
        )}
        {/* ══ TAB: GEMINI INSIGHTS ═════════════════════════ */}

        {activeTab === "gemini" && (
          <div className="space-y-5">
            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-700">G</span>
                </div>
                <div>
                  <p className="font-display font-700 text-white text-base">
                    Gemini 2.5 flash Analysis
                  </p>
                  <p className="text-muted text-xs font-body">
                    AI-generated bias explanation and remediation advice
                  </p>
                </div>
                {effectiveSeverity && (
                  <div
                    className="ml-auto px-3 py-1 rounded-full text-xs font-700 border"
                    style={{
                      background: `${severityColor(effectiveSeverity)}15`,
                      borderColor: `${severityColor(effectiveSeverity)}40`,
                      color: severityColor(effectiveSeverity),
                    }}
                  >
                    {effectiveSeverity} SEVERITY
                  </div>
                )}
              </div>
              {gemini.overallSummary && (
                <p className="text-subtle font-body text-sm leading-relaxed border-t border-bg-border pt-3">
                  {gemini.overallSummary}
                </p>
              )}
            </motion.div>

            {/* Findings */}
            {(gemini.findings || []).length > 0 ? (
              <>
                <p className="text-muted text-xs font-body uppercase tracking-widest">
                  {gemini.findings.length} finding
                  {gemini.findings.length !== 1 ? "s" : ""}
                </p>
                {gemini.findings.map((f, i) => (
                  <FindingCard key={f.attribute || i} finding={f} index={i} />
                ))}
              </>
            ) : gemini.rawText ? (
              <div className="glass-card p-5">
                <p className="text-muted text-xs mb-3 font-body uppercase tracking-wide">
                  Gemini response
                </p>
                <p className="text-subtle text-sm font-body leading-relaxed whitespace-pre-wrap">
                  {gemini.rawText}
                </p>
              </div>
            ) : !gemini.overallSummary ? (
              <div className="glass-card p-10 text-center">
                <p className="text-muted font-body text-sm">
                  Gemini insights not available.
                </p>
              </div>
            ) : null}

            {/* Metadata footer */}
            <div className="glass-card p-4">
              <p className="text-muted text-[10px] font-body uppercase tracking-widest mb-3">
                Analysis metadata
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-body">
                <div>
                  <span className="text-muted block mb-0.5">Analysis ID</span>
                  <span className="font-mono text-subtle text-[10px] break-all">
                    {id}
                  </span>
                </div>
                <div>
                  <span className="text-muted block mb-0.5">Rows analyzed</span>
                  <span className="text-white font-600">
                    {analysis.rowCount?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block mb-0.5">Attributes</span>
                  <span className="text-white font-600">{totalAttrCount}</span>
                </div>
                <div>
                  <span className="text-muted block mb-0.5">Violations</span>
                  <span
                    className={`font-600 ${flaggedCount > 0 ? "text-danger" : "text-success"}`}
                  >
                    {flaggedCount}
                  </span>
                </div>
              </div>
            </div>
            {/* Intersectional teaser */}
            {intersectionalData.pairs?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-4 cursor-pointer hover:border-brand-500/30 transition-colors"
                onClick={() => setActiveTab("intersectional")}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-700 text-white text-sm">
                      Intersectional Analysis
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-brand-500/15 text-brand-400 border border-brand-500/20 font-700 uppercase">
                      Novel
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <div className="flex gap-4 text-xs font-body">
                  <span className="text-muted">
                    {intersectionalData.pairs.length} pairs analysed
                  </span>
                  {intersectionalFlagged > 0 ? (
                    <span className="text-danger font-600">
                      {intersectionalFlagged} with compounded bias
                    </span>
                  ) : (
                    <span className="text-success font-600">
                      No compounded bias found
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
      {/* ── Floating Ask AI button ── */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl shadow-xl shadow-black/50 border border-brand-500/40"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6d28d9)" }}
          >
            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span className="text-white text-xs font-display font-700">
              Ask AI about results
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Gemini Chat Panel ── */}
      <GeminiChat
        analysisId={id}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
