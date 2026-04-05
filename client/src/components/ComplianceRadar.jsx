import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── helpers ─────────────────────────────────────────────── */
const RISK_CONFIG = {
  CRITICAL: {
    bg: "bg-danger/12",
    border: "border-danger/35",
    text: "text-danger",
    dot: "bg-danger",
    label: "Critical",
  },
  HIGH: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-400",
    label: "High",
  },
  MEDIUM: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    dot: "bg-warning",
    label: "Medium",
  },
  PASS: {
    bg: "bg-success/8",
    border: "border-success/25",
    text: "text-success",
    dot: "bg-success",
    label: "Compliant",
  },
};

const REGION_ORDER = ["India", "United States", "European Union"];

/* ─── Region header ─────────────────────────────────────────── */
function RegionHeader({ region, flag, count, violationCount }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-5 first:mt-0">
      <span className="text-base">{flag}</span>
      <span className="font-display font-700 text-white text-sm">{region}</span>
      <div className="flex-1 h-px bg-bg-border mx-1" />
      <span className="text-[10px] font-body text-muted">
        {violationCount > 0 ? (
          <span className="text-danger font-600">
            {violationCount} violation{violationCount > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-success font-600">Compliant</span>
        )}
        {" · "}
        {count} law{count !== 1 ? "s" : ""} checked
      </span>
    </div>
  );
}

/* ─── Individual law card ────────────────────────────────────── */
function LawCard({ violation, index }) {
  const [open, setOpen] = useState(false);
  const cfg = RISK_CONFIG[violation.riskLevel] || RISK_CONFIG.PASS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-xl border overflow-hidden ${cfg.bg} ${cfg.border}`}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${violation.triggered ? "animate-pulse" : ""}`}
        />

        {/* Law name */}
        <span className="font-display font-700 text-white text-sm flex-1 text-left leading-snug">
          {violation.shortName}
        </span>

        {/* Risk badge */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wide flex-shrink-0 ${cfg.bg} ${cfg.text} border ${cfg.border}`}
        >
          {cfg.label}
        </span>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 ${cfg.text} transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
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

      {/* Expanded details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
              {/* Section reference */}
              <div>
                <p
                  className={`text-[10px] uppercase tracking-widest font-700 mb-1 ${cfg.text}`}
                >
                  {violation.article ? `Article / Section` : "Section"}
                </p>
                <p className="text-subtle text-xs font-body font-600">
                  {violation.section}
                </p>
              </div>

              {/* What it means */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted font-700 mb-1">
                  What this means for your dataset
                </p>
                <p className="text-subtle text-xs font-body leading-relaxed">
                  {violation.description}
                </p>
              </div>

              {/* Penalty */}
              {violation.triggered && violation.penalty && (
                <div className="rounded-lg bg-danger/8 border border-danger/20 px-3 py-2.5">
                  <p className="text-danger text-[10px] uppercase tracking-widest font-700 mb-1">
                    Potential penalty
                  </p>
                  <p className="text-danger/80 text-xs font-body leading-relaxed">
                    {violation.penalty}
                  </p>
                </div>
              )}

              {/* Remediation */}
              {violation.triggered && violation.remediation && (
                <div className="rounded-lg bg-success/8 border border-success/20 px-3 py-2.5">
                  <p className="text-success text-[10px] uppercase tracking-widest font-700 mb-1">
                    Recommended action
                  </p>
                  <p className="text-success/80 text-xs font-body leading-relaxed">
                    {violation.remediation}
                  </p>
                </div>
              )}

              {!violation.triggered && (
                <div className="rounded-lg bg-success/8 border border-success/20 px-3 py-2">
                  <p className="text-success text-xs font-body">
                    ✓ No violations detected for this framework based on the
                    current bias analysis.
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

/* ─── Overall compliance score ring ────────────────────────── */
function ComplianceScore({ violations }) {
  const total = violations.length;
  const failed = violations.filter((v) => v.triggered).length;
  const passed = total - failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 100;
  const critical = violations.filter((v) => v.riskLevel === "CRITICAL").length;
  const high = violations.filter((v) => v.riskLevel === "HIGH").length;

  const scoreColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const r = 36,
    circ = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-5">
      {/* Ring */}
      <div className="relative flex-shrink-0">
        <svg
          width="88"
          height="88"
          viewBox="0 0 88 88"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="#1e1e3f"
            strokeWidth="7"
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={scoreColor}
            strokeWidth="7"
            strokeDasharray={`${(pct / 100) * circ} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display font-800 text-lg leading-none"
            style={{ color: scoreColor }}
          >
            {pct}%
          </span>
          <span className="text-[9px] text-muted font-body">compliant</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-success text-xs font-body font-600">
            {passed} frameworks passed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-danger" />
          <span className="text-danger text-xs font-body font-600">
            {failed} violation{failed !== 1 ? "s" : ""} found
          </span>
        </div>
        {critical > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-danger text-xs font-body font-700">
              {critical} critical risk{critical !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {high > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-orange-400 text-xs font-body font-600">
              {high} high risk{high !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function ComplianceRadar({ complianceData }) {
  const {
    violations = [],
    domain = "all",
    failCount = 0,
    passCount = 0,
  } = complianceData || {};
  const [filter, setFilter] = useState("all"); // 'all' | 'violations' | 'compliant'

  if (!violations.length) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-muted font-body text-sm">
          No compliance data available. Re-run the analysis to generate the
          compliance radar.
        </p>
      </div>
    );
  }

  // Group by region
  const byRegion = REGION_ORDER.reduce((acc, region) => {
    const rules = violations.filter((v) => v.region === region);
    if (rules.length) acc[region] = rules;
    return acc;
  }, {});

  // Filtered view
  const filtered = violations.filter((v) => {
    if (filter === "violations") return v.triggered;
    if (filter === "compliant") return !v.triggered;
    return true;
  });

  const domainLabel =
    {
      hiring: "Hiring & Employment",
      loan: "Lending & Credit",
      medical: "Healthcare",
      education: "Education",
      insurance: "Insurance",
      all: "General / Other",
    }[domain] || domain;

  return (
    <div className="space-y-5">
      {/* Header card */}
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display font-700 text-white text-base">
                Compliance Radar
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-400 text-[10px] font-700 uppercase tracking-wide">
                India-first
              </span>
              <span className="px-2 py-0.5 rounded-full bg-bg-card border border-bg-border text-muted text-[10px] font-body">
                Domain: {domainLabel}
              </span>
            </div>
            <p className="text-muted text-xs font-body leading-relaxed max-w-2xl">
              FairLens automatically maps bias violations to applicable laws
              across India, the US, and the EU. India's DPDP Act 2023 and
              Article 15 of the Constitution are checked first.
            </p>
          </div>
          <div className="flex-shrink-0">
            <ComplianceScore violations={violations} />
          </div>
        </div>
      </motion.div>

      {/* Summary pills row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: "Critical",
            color: "text-danger",
            bg: "bg-danger/10",
            border: "border-danger/25",
            count: violations.filter((v) => v.riskLevel === "CRITICAL").length,
          },
          {
            label: "High risk",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            border: "border-orange-500/25",
            count: violations.filter((v) => v.riskLevel === "HIGH").length,
          },
          {
            label: "Medium",
            color: "text-warning",
            bg: "bg-warning/10",
            border: "border-warning/25",
            count: violations.filter((v) => v.riskLevel === "MEDIUM").length,
          },
          {
            label: "Compliant",
            color: "text-success",
            bg: "bg-success/10",
            border: "border-success/25",
            count: violations.filter((v) => !v.triggered).length,
          },
        ].map(({ label, color, bg, border, count }) => (
          <div
            key={label}
            className={`rounded-xl ${bg} border ${border} px-4 py-3 text-center`}
          >
            <p className={`font-display font-800 text-xl ${color}`}>{count}</p>
            <p className={`text-[11px] font-body ${color} opacity-70 mt-0.5`}>
              {label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-bg-card border border-bg-border rounded-xl w-fit">
        {[
          { id: "all", label: `All (${violations.length})` },
          { id: "violations", label: `Violations (${failCount})` },
          { id: "compliant", label: `Passed (${passCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-600 transition-all ${
              filter === tab.id
                ? "bg-brand-500 text-white"
                : "text-muted hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Laws by region */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5"
      >
        {REGION_ORDER.map((region) => {
          const regionViolations = filtered.filter((v) => v.region === region);
          const allRegionViolations = violations.filter(
            (v) => v.region === region,
          );
          if (!regionViolations.length) return null;

          const regionFlag = allRegionViolations[0]?.flag || "";
          const regionFailed = regionViolations.filter(
            (v) => v.triggered,
          ).length;

          return (
            <div key={region}>
              <RegionHeader
                region={region}
                flag={regionFlag}
                count={regionViolations.length}
                violationCount={regionFailed}
              />
              <div className="space-y-2 mb-4">
                {regionViolations.map((v, i) => (
                  <LawCard key={v.id} violation={v} index={i} />
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-4 flex items-start gap-3"
      >
        <svg
          className="w-4 h-4 text-muted flex-shrink-0 mt-0.5"
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
        <p className="text-muted text-[11px] font-body leading-relaxed">
          <strong className="text-subtle">Legal disclaimer:</strong> This
          compliance mapping is generated automatically based on statistical
          bias metrics and publicly known legal frameworks. It is intended as a{" "}
          <em>screening tool</em> for technical teams — not legal advice.
          Consult a qualified legal professional before making compliance
          decisions. Laws and regulations are subject to change.
        </p>
      </motion.div>
    </div>
  );
}
