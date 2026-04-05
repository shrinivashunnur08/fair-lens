import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── colour helpers ─────────────────────────────────────── */
// Rate → background colour for heatmap cell
function rateToColor(rate, min, max) {
  if (rate === null || rate === undefined)
    return { bg: "rgba(255,255,255,0.03)", text: "#475569" };
  if (min === max) return { bg: "rgba(99,102,241,0.15)", text: "#818cf8" };

  const norm = (rate - min) / (max - min); // 0 = lowest (worst), 1 = highest (best)

  if (norm < 0.25) return { bg: "rgba(239,68,68,0.20)", text: "#f87171" }; // danger
  if (norm < 0.5) return { bg: "rgba(249,115,22,0.18)", text: "#fb923c" }; // orange
  if (norm < 0.75) return { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" }; // warning
  return { bg: "rgba(16,185,129,0.15)", text: "#34d399" }; // success
}

/* ─── Heatmap for one attribute pair ─────────────────────── */
function PairHeatmap({ pair }) {
  const {
    colA,
    colB,
    valuesA,
    valuesB,
    cells,
    dir,
    spd,
    flagged,
    mostBiased,
    leastBiased,
    maxGap,
    groupRates,
  } = pair;

  const rates = cells.filter((c) => c.rate !== null).map((c) => c.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);

  const [hoveredCell, setHoveredCell] = useState(null);

  return (
    <div>
      {/* Matrix grid */}
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          style={{ minWidth: `${valuesB.length * 90 + 120}px` }}
        >
          <thead>
            <tr>
              {/* Top-left corner label */}
              <th className="pb-2 pr-3 text-right">
                <span className="text-[10px] text-muted font-body capitalize">
                  {colA}
                </span>
                <span className="text-muted mx-1">↓</span>
                <span className="text-[10px] text-muted font-body capitalize">
                  {colB}
                </span>
                <span className="text-muted ml-1">→</span>
              </th>
              {valuesB.map((b) => (
                <th key={b} className="pb-2 px-1 text-center">
                  <span className="text-[11px] font-display font-600 text-subtle capitalize block truncate max-w-[80px]">
                    {b}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {valuesA.map((a) => (
              <tr key={a}>
                <td className="py-1 pr-3 text-right">
                  <span className="text-[11px] font-display font-600 text-subtle capitalize">
                    {a}
                  </span>
                </td>
                {valuesB.map((b) => {
                  const cell = cells.find(
                    (c) => c.attrA === a && c.attrB === b,
                  );
                  const rate = cell?.rate ?? null;
                  const { bg, text } = rateToColor(rate, minRate, maxRate);
                  const isHovered = hoveredCell === `${a}×${b}`;
                  const isWorst = mostBiased?.group === `${a} × ${b}`;
                  const isBest = leastBiased?.group === `${a} × ${b}`;

                  return (
                    <td key={b} className="py-1 px-1">
                      <div
                        className="relative rounded-lg flex flex-col items-center justify-center transition-all cursor-default"
                        style={{
                          background: bg,
                          border: isWorst
                            ? "2px solid rgba(239,68,68,0.6)"
                            : isBest
                              ? "2px solid rgba(16,185,129,0.5)"
                              : isHovered
                                ? "1px solid rgba(255,255,255,0.15)"
                                : "1px solid rgba(255,255,255,0.05)",
                          minHeight: "52px",
                          minWidth: "72px",
                          padding: "6px 4px",
                        }}
                        onMouseEnter={() => setHoveredCell(`${a}×${b}`)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {rate !== null ? (
                          <>
                            <span
                              className="font-display font-800 text-sm leading-none"
                              style={{ color: text }}
                            >
                              {rate}%
                            </span>
                            <span className="text-[9px] text-muted font-body mt-0.5">
                              {cell.positive}/{cell.total}
                            </span>
                            {isWorst && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-danger text-white px-1 rounded-sm font-700 whitespace-nowrap">
                                WORST
                              </span>
                            )}
                            {isBest && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-success text-white px-1 rounded-sm font-700 whitespace-nowrap">
                                BEST
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-muted/40">—</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Colour scale legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-muted font-body">Low rate</span>
        <div className="flex gap-0.5">
          {[
            "rgba(239,68,68,0.4)",
            "rgba(249,115,22,0.35)",
            "rgba(245,158,11,0.3)",
            "rgba(16,185,129,0.3)",
          ].map((c, i) => (
            <div
              key={i}
              className="w-6 h-2.5 rounded-sm"
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted font-body">High rate</span>
        <div className="ml-4 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm border-2 border-danger/60" />
            <span className="text-[10px] text-muted font-body">
              Most disadvantaged
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm border-2 border-success/60" />
            <span className="text-[10px] text-muted font-body">
              Most advantaged
            </span>
          </div>
        </div>
      </div>

      {/* Key insight */}
      {mostBiased && leastBiased && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5 ${
            flagged
              ? "bg-danger/8 border border-danger/20"
              : "bg-bg-card border border-bg-border"
          }`}
        >
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${flagged ? "text-danger" : "text-muted"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                flagged
                  ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              }
            />
          </svg>
          <p
            className={`text-xs font-body leading-relaxed ${flagged ? "text-danger/90" : "text-muted"}`}
          >
            <strong
              style={{ color: flagged ? "#f87171" : "#e2e8f0" }}
              className="capitalize"
            >
              {mostBiased.group}
            </strong>{" "}
            has a {mostBiased.rate}% approval rate vs{" "}
            <strong
              style={{ color: flagged ? "#f87171" : "#e2e8f0" }}
              className="capitalize"
            >
              {leastBiased.group}
            </strong>{" "}
            at {leastBiased.rate}% — a{" "}
            <strong style={{ color: flagged ? "#f87171" : "#e2e8f0" }}>
              {maxGap} percentage point gap
            </strong>
            .
            {flagged &&
              " This intersectional disparity is invisible when analysing each attribute alone."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Pair selector pill ─────────────────────────────────── */
function PairPill({ pair, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
        active
          ? "border-brand-500/60 bg-brand-500/10"
          : pair.flagged
            ? "border-danger/30 bg-danger/5 hover:border-danger/50"
            : "border-bg-border hover:border-brand-500/30 hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-col">
        <span
          className={`font-display font-700 text-xs ${active ? "text-brand-400" : "text-white"}`}
        >
          {pair.colA} × {pair.colB}
        </span>
        <span className="text-[10px] text-muted font-body mt-0.5">
          DIR {pair.dir} · {pair.groupCount} groups
        </span>
      </div>
      {pair.flagged && (
        <span className="ml-auto text-[9px] bg-danger/15 text-danger border border-danger/20 px-1.5 py-0.5 rounded font-700 uppercase">
          bias
        </span>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function IntersectionalBias({ intersectionalData }) {
  const pairs = intersectionalData?.pairs || [];
  const [activePair, setActivePair] = useState(0);

  if (pairs.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-bg-card border border-bg-border flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
        </div>
        <p className="font-display font-700 text-white text-base mb-2">
          Intersectional analysis requires 2+ attributes
        </p>
        <p className="text-muted text-sm font-body max-w-sm mx-auto">
          Upload a dataset with at least two protected attributes (e.g. gender +
          race) to see how compound discrimination works.
        </p>
      </div>
    );
  }

  const flaggedCount = pairs.filter((p) => p.flagged).length;
  const current = pairs[activePair] || pairs[0];

  return (
    <div className="space-y-5">
      {/* Explainer header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-brand-500/12 border border-brand-500/25 flex items-center justify-center flex-shrink-0">
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
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display font-700 text-white text-base">
                Intersectional Bias Analysis
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-400 text-[10px] font-700 uppercase tracking-wide">
                Novel
              </span>
              {flaggedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-danger/15 border border-danger/25 text-danger text-[10px] font-700">
                  {flaggedCount} pair{flaggedCount > 1 ? "s" : ""} flagged
                </span>
              )}
            </div>
            <p className="text-muted text-xs font-body leading-relaxed max-w-2xl">
              Single-attribute analysis misses compounded discrimination. A
              Black woman may face 52% less chance of being hired — invisible
              when you check gender or race alone. Each cell shows the approval
              rate for that exact demographic intersection.
              <span className="text-brand-400/80">
                {" "}
                Based on Kimberlé Crenshaw's intersectionality framework (1989).
              </span>
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-bg-border">
          <div className="text-center">
            <p className="font-display font-800 text-xl text-white">
              {pairs.length}
            </p>
            <p className="text-muted text-[10px] font-body mt-0.5">
              Attribute pairs
            </p>
          </div>
          <div className="text-center">
            <p
              className={`font-display font-800 text-xl ${flaggedCount > 0 ? "text-danger" : "text-success"}`}
            >
              {flaggedCount}
            </p>
            <p className="text-muted text-[10px] font-body mt-0.5">
              Pairs with bias
            </p>
          </div>
          <div className="text-center">
            <p className="font-display font-800 text-xl text-white">
              {pairs.reduce((s, p) => s + p.groupCount, 0)}
            </p>
            <p className="text-muted text-[10px] font-body mt-0.5">
              Intersection groups
            </p>
          </div>
        </div>
      </motion.div>

      {/* Pair selector — show all pairs as pills */}
      {pairs.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
        >
          {pairs.map((p, i) => (
            <PairPill
              key={p.pairLabel}
              pair={p}
              active={i === activePair}
              onClick={() => setActivePair(i)}
            />
          ))}
        </motion.div>
      )}

      {/* Active pair detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.pairLabel}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="glass-card p-6"
        >
          {/* Pair header */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded-lg font-display font-700 text-sm capitalize ${
                  current.flagged
                    ? "bg-danger/10 border border-danger/25 text-danger"
                    : "bg-success/10 border border-success/25 text-success"
                }`}
              >
                {current.colA} × {current.colB}
              </div>
              <p className="text-muted text-xs font-body capitalize">
                {current.typeA} × {current.typeB}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-700 border ${
                  current.dir < 0.8
                    ? "bg-danger/10 border-danger/30 text-danger"
                    : "bg-success/10 border-success/30 text-success"
                }`}
              >
                DIR {current.dir} {current.dir < 0.8 ? "⚠ < 0.8" : "✓"}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-700 border ${
                  current.spd > 0.1
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    : "bg-success/10 border-success/30 text-success"
                }`}
              >
                Gap {current.maxGap}pp {current.spd > 0.1 ? "⚠" : "✓"}
              </span>
            </div>
          </div>

          {/* The heatmap */}
          <PairHeatmap pair={current} />

          {/* Group breakdown table */}
          {current.groupRates?.length > 0 && (
            <div className="mt-5">
              <p className="text-muted text-[10px] uppercase tracking-widest font-body mb-2">
                All intersection groups
              </p>
              <div className="rounded-xl overflow-hidden border border-bg-border">
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr className="bg-bg-card">
                      <th className="px-3 py-2 text-left text-muted font-600">
                        Group
                      </th>
                      <th className="px-3 py-2 text-right text-muted font-600">
                        Total
                      </th>
                      <th className="px-3 py-2 text-right text-muted font-600">
                        Approved
                      </th>
                      <th className="px-3 py-2 text-right text-muted font-600">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-right text-muted font-600">
                        vs Best
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...current.groupRates]
                      .sort((a, b) => a.rate - b.rate)
                      .map((g, i) => {
                        const diff = current.leastBiased?.rate - g.rate;
                        return (
                          <tr
                            key={g.group}
                            className={`border-t border-bg-border/50 ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                          >
                            <td className="px-3 py-2 text-white font-600 capitalize">
                              {g.group}
                            </td>
                            <td className="px-3 py-2 text-right text-muted">
                              {g.total}
                            </td>
                            <td className="px-3 py-2 text-right text-muted">
                              {g.positive}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`font-mono font-700 ${
                                  g.rate < 30
                                    ? "text-danger"
                                    : g.rate < 50
                                      ? "text-warning"
                                      : "text-success"
                                }`}
                              >
                                {g.rate}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {diff > 0 ? (
                                <span className="text-danger font-mono text-[11px]">
                                  −{diff.toFixed(1)}pp
                                </span>
                              ) : (
                                <span className="text-success font-mono text-[11px]">
                                  best
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Why this matters callout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-5 flex items-start gap-3"
      >
        <div className="w-5 h-5 rounded-md bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
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
        <div>
          <p className="text-white text-xs font-display font-700 mb-1">
            Why intersectional analysis matters
          </p>
          <p className="text-muted text-xs font-body leading-relaxed">
            The EEOC's standard disparate impact test and most automated
            fairness tools only check protected attributes in isolation. This
            means compounded discrimination — where belonging to <em>two</em>{" "}
            disadvantaged groups creates outsized harm — is systematically
            missed. India's DPDP Act 2023 and Article 15 of the Indian
            Constitution both cover discrimination based on{" "}
            <em>combinations</em> of characteristics. FairLens is one of the
            first tools to surface this visually.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
