import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ─── helpers (client-side re-computation) ───────────────── */
function groupBy(rows, col) {
  return rows.reduce((acc, row) => {
    const key = String(row[col] ?? "unknown")
      .trim()
      .toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

function disparateImpact(groups, outcomeCol, positiveVal) {
  const rates = {};
  for (const [g, rows] of Object.entries(groups)) {
    const pos = rows.filter(
      (r) =>
        String(r[outcomeCol]).trim().toLowerCase() ===
        positiveVal.toLowerCase(),
    ).length;
    rates[g] = rows.length > 0 ? pos / rows.length : 0;
  }
  const vals = Object.values(rates);
  const mx = Math.max(...vals),
    mn = Math.min(...vals);
  return mx > 0 ? mn / mx : 1;
}

function statisticalParity(groups, outcomeCol, positiveVal) {
  const rates = {};
  for (const [g, rows] of Object.entries(groups)) {
    const pos = rows.filter(
      (r) =>
        String(r[outcomeCol]).trim().toLowerCase() ===
        positiveVal.toLowerCase(),
    ).length;
    rates[g] = rows.length > 0 ? pos / rows.length : 0;
  }
  const vals = Object.values(rates);
  return Math.max(...vals) - Math.min(...vals);
}

function computeScore(biasArr) {
  if (!biasArr.length) return 100;
  const dirs = biasArr.map((b) => b.dir);
  const spds = biasArr.map((b) => b.spd);
  let score = 100;
  score -= (1 - Math.min(...dirs)) * 60;
  score -= Math.max(...spds) * 60;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeFromScore(s) {
  return s >= 90
    ? "A+"
    : s >= 80
      ? "A"
      : s >= 70
        ? "B"
        : s >= 60
          ? "C"
          : s >= 50
            ? "D"
            : "F";
}

function gradeColor(g) {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
}

/* ─── Score ring ─────────────────────────────────────────── */
function ScoreRing({ score, grade, label, size = 100 }) {
  const r = 38,
    c = 2 * Math.PI * r;
  const fill = (score / 100) * c;
  const col = gradeColor(grade);
  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1e1e3f"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={col}
            strokeWidth="8"
            strokeDasharray={`${fill} ${c}`}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 0.8s ease, stroke 0.4s ease",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 22,
              color: col,
              lineHeight: 1,
            }}
          >
            {grade}
          </span>
          <span
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 11,
              color: "#64748b",
              lineHeight: 1.2,
            }}
          >
            {score}/100
          </span>
        </div>
      </div>
      <p className="text-muted text-xs font-body">{label}</p>
    </div>
  );
}

/* ─── Delta badge ────────────────────────────────────────── */
function Delta({ before, after }) {
  const diff = after - before;
  if (diff === 0)
    return <span className="text-muted text-xs font-mono">—</span>;
  const positive = diff > 0;
  return (
    <span
      className={`text-xs font-mono font-600 ${positive ? "text-success" : "text-danger"}`}
    >
      {positive ? "+" : ""}
      {diff}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function WhatIfSimulator({ analysis, rows }) {
  const {
    results,
    outcomeCol,
    positiveOutcomeValue = "1",
    protectedCols = {},
  } = analysis;
  const biasResults = results?.biasResults || [];
  const originalScore = results?.fairnessScore?.score || 0;
  const originalGrade = results?.fairnessScore?.grade || "?";

  // Which attributes are currently "enabled" in the simulation
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(biasResults.map((b) => [b.attribute, true])),
  );

  // Re-compute bias metrics client-side for enabled attributes only
  const simulated = useMemo(() => {
    if (!rows?.length) return null;
    const activeAttrs = biasResults.filter((b) => enabled[b.attribute]);
    if (!activeAttrs.length) return { score: 100, grade: "A+", biasArr: [] };

    const biasArr = activeAttrs.map((b) => {
      const grps = groupBy(rows, b.attribute);
      const dir = disparateImpact(grps, outcomeCol, positiveOutcomeValue);
      const spd = statisticalParity(grps, outcomeCol, positiveOutcomeValue);
      return {
        attribute: b.attribute,
        dir,
        spd,
        flagged: dir < 0.8 || spd > 0.1,
      };
    });

    const score = computeScore(biasArr);
    const grade = gradeFromScore(score);
    return { score, grade, biasArr };
  }, [enabled, rows, biasResults, outcomeCol, positiveOutcomeValue]);

  const simScore = simulated?.score ?? originalScore;
  const simGrade = simulated?.grade ?? originalGrade;

  if (originalScore >= 90) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-success font-display font-700 text-lg mb-2">
          Already Fair!
        </p>
        <p className="text-muted font-body text-sm">
          This dataset scores {originalScore}/100 — no significant bias to
          simulate removing.
        </p>
      </div>
    );
  }

  // Bar chart: before vs after per attribute
  const chartData = biasResults.map((b) => {
    const sim = simulated?.biasArr?.find((s) => s.attribute === b.attribute);
    return {
      name:
        b.attribute.length > 10 ? b.attribute.slice(0, 10) + "…" : b.attribute,
      Before: Math.round((b.disparateImpact?.ratio ?? 1) * 100),
      After: enabled[b.attribute] && sim ? Math.round(sim.dir * 100) : 100, // disabled = no bias impact
    };
  });

  const anyDisabled = Object.values(enabled).some((v) => !v);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-700 text-white text-base">
              What-If Simulator
            </h3>
            <p className="text-muted text-xs font-body">
              Toggle attributes to see how fairness improves
            </p>
          </div>
        </div>
      </div>

      {/* Score comparison */}
      <div className="glass-card p-6">
        <p className="text-muted text-xs font-body uppercase tracking-widest mb-6 text-center">
          Score comparison
        </p>
        <div className="flex items-center justify-center gap-8 md:gap-16">
          <ScoreRing
            score={originalScore}
            grade={originalGrade}
            label="Original score"
          />

          {/* Arrow + delta */}
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8 text-brand-500/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <Delta before={originalScore} after={simScore} />
          </div>

          <ScoreRing
            score={simScore}
            grade={simGrade}
            label="Simulated score"
            size={100}
          />
        </div>

        {anyDisabled && simScore === originalScore && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-warning/8 border border-warning/20 text-warning text-xs font-body"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Score unchanged — remaining attributes still show bias. Toggle all
            biased attributes to see maximum improvement.
          </motion.div>
        )}
        {anyDisabled && simScore > originalScore && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-success/8 border border-success/20 text-success text-xs font-body"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Removing the toggled attributes improves fairness score by{" "}
            <strong>{simScore - originalScore} points</strong>. Consider
            excluding these features from your model.
          </motion.div>
        )}
      </div>

      {/* Attribute toggles */}
      <div className="glass-card p-5">
        <p className="text-muted text-xs font-body uppercase tracking-widest mb-4">
          Toggle attributes — simulate their removal
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {biasResults.map((b) => {
            const on = enabled[b.attribute];
            const sim = simulated?.biasArr?.find(
              (s) => s.attribute === b.attribute,
            );
            return (
              <motion.button
                key={b.attribute}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setEnabled((prev) => ({
                    ...prev,
                    [b.attribute]: !prev[b.attribute],
                  }))
                }
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  on
                    ? b.disparateImpact?.flagged
                      ? "border-danger/30 bg-danger/5 hover:border-danger/50"
                      : "border-bg-border hover:border-brand-500/40"
                    : "border-dashed border-bg-border/50 bg-white/[0.015] opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Toggle pill */}
                  <div
                    className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${on ? "bg-brand-500" : "bg-bg-border"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-4" : "left-0.5"}`}
                    />
                  </div>
                  <div>
                    <p className="font-display font-600 text-white text-sm capitalize">
                      {b.attribute}
                    </p>
                    <p className="text-muted text-xs font-body capitalize">
                      {b.attributeType}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-xs font-600 ${
                      on && b.disparateImpact?.flagged
                        ? "text-danger"
                        : "text-muted"
                    }`}
                  >
                    DIR {(b.disparateImpact?.ratio ?? 1).toFixed(2)}
                  </p>
                  {!on && (
                    <p className="text-muted text-[10px] font-body mt-0.5">
                      excluded
                    </p>
                  )}
                  {on && sim && (
                    <p className="text-muted text-[10px] font-body mt-0.5">
                      {sim.flagged ? "⚠ biased" : "✓ fair"}
                    </p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Reset */}
        <button
          onClick={() =>
            setEnabled(
              Object.fromEntries(biasResults.map((b) => [b.attribute, true])),
            )
          }
          className="mt-4 text-xs text-muted hover:text-brand-400 font-body transition-colors flex items-center gap-1"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset all
        </button>
      </div>

      {/* Before/After bar chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-muted text-xs font-body uppercase tracking-wide mb-4">
            Disparate Impact Ratio — before vs after (×100, target: ≥80)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
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
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              {/* 80 threshold line */}
              <Tooltip
                contentStyle={{
                  background: "#0c0c1e",
                  border: "1px solid #1e1e3f",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "Manrope, sans-serif",
                }}
                labelStyle={{ color: "#fff", fontWeight: 600 }}
              />
              <Bar
                dataKey="Before"
                name="Before"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
                opacity={0.7}
              />
              <Bar
                dataKey="After"
                name="After"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted font-body">
              <div className="w-3 h-3 rounded bg-danger/70" /> Before
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted font-body">
              <div className="w-3 h-3 rounded bg-success" /> After (simulated)
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted font-body">
              <div className="w-3 h-0.5 bg-warning" /> 80 threshold
            </div>
          </div>
        </div>
      )}

      {/* Insight note */}
      <div className="glass-card p-4 flex items-start gap-3">
        <div className="w-5 h-5 rounded bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg
            className="w-3 h-3 text-brand-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-muted text-xs font-body leading-relaxed">
          The What-If Simulator runs{" "}
          <strong style={{ color: "#94a3b8" }}>client-side</strong> using the
          same bias algorithms as the server. It shows the fairness impact of
          removing each protected attribute from your model. This is a{" "}
          <strong style={{ color: "#94a3b8" }}>
            non-destructive simulation
          </strong>{" "}
          — your original analysis is unchanged. Use this to find the minimum
          set of changes needed to reach a fair model.
        </p>
      </div>
    </div>
  );
}
