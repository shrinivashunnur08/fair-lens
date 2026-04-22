import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* Protected attribute keywords for auto-detection */
const PROTECTED_KEYWORDS = {
  gender: ["gender", "sex", "male", "female"],
  race: ["race", "ethnicity", "ethnic", "nationality"],
  age: ["age", "dob", "birth", "born", "year"],
  disability: ["disability", "disabled", "handicap"],
  religion: ["religion", "faith", "religious"],
  caste: ["caste", "category", "sc", "st", "obc", "community", "jati", "varna"],
  marital: ["marital", "married", "single", "divorced"],
  socioeconomic: ["income", "salary", "wealth", "class", "tier", "bpl"],
};

const OUTCOME_KEYWORDS = [
  "hired",
  "approved",
  "accepted",
  "outcome",
  "result",
  "decision",
  "granted",
  "denied",
  "rejected",
  "label",
  "target",
  "prediction",
  "approved_loan",
  "loan_status",
  "status",
  "y",
  "class",
  "promoted",
  "selected",
  "passed",
  "failed",
  "eligible",
  "qualified",
  "recommended",
  "output",
  "verdict",
  "flagged",
  "treatment_approved",
  "loan_approved",
];

const ID_SKIP_PATTERN =
  /^id$|_id$|^id_|index$|^num$|_num$|code$|_key$|^key_|^row/i;

function autoDetect(headers) {
  const lower = headers.map((h) => h.toLowerCase());

  // Skip ID-like columns from outcome detection
  const nonIdHeaders = headers.filter((h) => !ID_SKIP_PATTERN.test(h));
  const nonIdLower = nonIdHeaders.map((h) => h.toLowerCase());

  // Try to find known outcome keyword match
  let outcomeCol =
    nonIdHeaders[
      nonIdLower.findIndex((h) => OUTCOME_KEYWORDS.some((kw) => h.includes(kw)))
    ] || "";

  // Fallback: last non-ID column (ML convention — target is usually last)
  if (!outcomeCol && nonIdHeaders.length > 0) {
    outcomeCol = nonIdHeaders[nonIdHeaders.length - 1];
  }

  // Final fallback: last column of all headers
  if (!outcomeCol) outcomeCol = headers[headers.length - 1] || "";

  const protectedCols = {};
  Object.entries(PROTECTED_KEYWORDS).forEach(([attr, keywords]) => {
    const idx = lower.findIndex(
      (h) =>
        h !== outcomeCol.toLowerCase() &&
        !ID_SKIP_PATTERN.test(h) &&
        keywords.some((kw) => h.includes(kw)),
    );
    if (idx !== -1) protectedCols[headers[idx]] = attr;
  });

  return { outcomeCol, protectedCols };
}

const POSITIVE_VALUE_PATTERNS =
  /^1$|^yes$|^true$|^approved$|^hired$|^accepted$|^granted$|^passed$|^selected$|^eligible$|^positive$/i;

function guessPositiveValue(previewRows, outcomeCol) {
  if (!outcomeCol || !previewRows?.length) return "1";
  const uniqueVals = [
    ...new Set(previewRows.map((r) => String(r[outcomeCol] || "").trim())),
  ].filter(Boolean);
  const found = uniqueVals.find((v) => POSITIVE_VALUE_PATTERNS.test(v));
  return found || uniqueVals[0] || "1";
}

export default function ColumnMapper({ headers, previewRows = [], onChange }) {
  const [outcomeCol, setOutcomeCol] = useState("");
  const [protectedCols, setProtectedCols] = useState({});
  const [posValue, setPosValue] = useState("1");

  /* auto-detect on mount */
  useEffect(() => {
    if (!headers.length) return;
    const { outcomeCol: oc, protectedCols: pc } = autoDetect(headers);
    const pv = guessPositiveValue(previewRows, oc);
    setOutcomeCol(oc);
    setProtectedCols(pc);
    setPosValue(pv);
  }, [headers]);

  /* when outcome column changes manually, re-guess positive value */
  const handleOutcomeChange = (col) => {
    setOutcomeCol(col);
    const pv = guessPositiveValue(previewRows, col);
    setPosValue(pv);
  };

  /* bubble changes up */
  useEffect(() => {
    onChange({ outcomeCol, protectedCols, positiveOutcomeValue: posValue });
  }, [outcomeCol, protectedCols, posValue, onChange]);

  const toggleProtected = (col) => {
    setProtectedCols((prev) => {
      const next = { ...prev };
      if (next[col]) delete next[col];
      else next[col] = "other";
      return next;
    });
  };

  const setAttrType = (col, type) => {
    setProtectedCols((prev) => ({ ...prev, [col]: type }));
  };

  if (!headers.length) return null;

  const ATTR_TYPES = Object.keys(PROTECTED_KEYWORDS);
  const selectedCount = Object.keys(protectedCols).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ── Outcome column ─────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md bg-success/20 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="font-display font-600 text-white text-sm">
            Outcome column
          </span>
          <span className="text-muted text-xs font-body">
            (what the AI decides — hired, approved, etc.)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-muted text-xs font-body mb-1.5">
              Select column
            </label>
            <select
              value={outcomeCol}
              onChange={(e) => handleOutcomeChange(e.target.value)}
              className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2.5 text-white text-sm font-body
                focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-colors"
            >
              <option value="">— select outcome column —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-muted text-xs font-body mb-1.5">
              Positive outcome value
              <span className="ml-1 text-muted/60">
                (e.g. "1", "Yes", "Approved")
              </span>
            </label>
            <input
              type="text"
              value={posValue}
              onChange={(e) => setPosValue(e.target.value)}
              placeholder='e.g. 1, "Yes", "Approved"'
              className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2.5 text-white text-sm font-mono
                placeholder:text-muted/50 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Protected attributes ────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-brand-500/20 flex items-center justify-center">
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="font-display font-600 text-white text-sm">
              Protected attributes
            </span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-xs font-display font-600">
                {selectedCount} selected
              </span>
            )}
          </div>
          <span className="text-muted text-xs font-body">
            Auto-detected · click to toggle
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {headers
            .filter((h) => h !== outcomeCol)
            .map((col) => {
              const isSelected = !!protectedCols[col];
              const attrType = protectedCols[col] || "";

              return (
                <motion.div
                  key={col}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-brand-500/60 bg-brand-500/8"
                      : "border-bg-border hover:border-bg-border/80 hover:bg-white/[0.02]"
                  }`}
                  onClick={() => toggleProtected(col)}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="font-mono text-xs text-white leading-tight break-all">
                      {col}
                    </span>
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                        isSelected ? "bg-brand-500" : "border border-bg-border"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <select
                      value={attrType}
                      onChange={(e) => {
                        e.stopPropagation();
                        setAttrType(col, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-bg-primary border border-bg-border rounded-md px-1.5 py-1 text-xs text-brand-400 font-body
                      focus:outline-none focus:border-brand-500/60 transition-colors"
                    >
                      <option value="other">Other</option>
                      {ATTR_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Validation warning */}
      {outcomeCol && selectedCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-body"
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Select at least one protected attribute column to detect bias.
        </motion.div>
      )}

      {outcomeCol && selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-body"
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Ready! FairLens will analyze "{outcomeCol}" for bias across{" "}
          {selectedCount} protected attribute{selectedCount > 1 ? "s" : ""}.
        </motion.div>
      )}
    </motion.div>
  );
}
