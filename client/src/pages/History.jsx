import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const gradeColor = (g) => {
  if (!g || g === "?") return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

function GradeBadge({ grade, score }) {
  const col = gradeColor(grade);
  return (
    <div
      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 flex-shrink-0"
      style={{ borderColor: `${col}50`, background: `${col}10` }}
    >
      <span
        className="font-display font-800 text-base leading-none"
        style={{ color: col }}
      >
        {grade || "?"}
      </span>
      {score !== undefined && (
        <span
          className="text-[9px] font-body mt-0.5"
          style={{ color: `${col}99` }}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    complete: { bg: "bg-success/15", text: "text-success", label: "Complete" },
    analyzing: {
      bg: "bg-brand-500/15",
      text: "text-brand-400",
      label: "Analyzing…",
    },
    pending: { bg: "bg-warning/15", text: "text-warning", label: "Pending" },
    error: { bg: "bg-danger/15", text: "text-danger", label: "Failed" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-600 font-body ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAnalyses = async () => {
      try {
        const q = query(
          collection(db, "analyses"),
          where("userId", "==", user.uid),
        );
        const snap = await getDocs(q);
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bTime - aTime;
          });
        setAnalyses(sorted);
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyses();
  }, [user]);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate?.() || new Date(ts);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-800 text-3xl text-white mb-1">
                Analysis History
              </h1>
              <p className="text-muted font-body text-sm">
                All your past bias analyses in one place
              </p>
            </div>
            <button onClick={() => navigate("/upload")} className="btn-primary">
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
              <span>New Analysis</span>
            </button>
          </div>
        </motion.div>

        {/* Stats row */}
        {!loading && analyses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {[
              {
                label: "Total analyses",
                value: analyses.length,
                color: "#818cf8",
              },
              {
                label: "Violations found",
                value: analyses.reduce(
                  (s, a) => s + (a.results?.flaggedAttributes || 0),
                  0,
                ),
                color: "#ef4444",
              },
              {
                label: "Avg fairness score",
                value: analyses.filter(
                  (a) => a.results?.fairnessScore?.score !== undefined,
                ).length
                  ? Math.round(
                      analyses
                        .filter(
                          (a) => a.results?.fairnessScore?.score !== undefined,
                        )
                        .reduce(
                          (s, a) => s + (a.results.fairnessScore.score || 0),
                          0,
                        ) /
                        analyses.filter(
                          (a) => a.results?.fairnessScore?.score !== undefined,
                        ).length,
                    )
                  : "—",
                color: "#10b981",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card p-5">
                <p className="text-muted text-xs font-body uppercase tracking-wide mb-1">
                  {label}
                </p>
                <p className="font-display font-800 text-2xl" style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && analyses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-bg-card border border-bg-border flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-8 h-8 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-display font-700 text-white text-xl mb-2">
              No analyses yet
            </p>
            <p className="text-muted font-body text-sm mb-6">
              Upload your first dataset to get started
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="btn-primary mx-auto"
            >
              <span>Analyze a Dataset</span>
            </button>
          </motion.div>
        )}

        {/* Analysis list */}
        {!loading && analyses.length > 0 && (
          <div className="space-y-3">
            {analyses.map((a, i) => {
              const grade = a.results?.fairnessScore?.grade;
              const score = a.results?.fairnessScore?.score;
              const flagged = a.results?.flaggedAttributes || 0;

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={`/dashboard/${a.id}`}
                    className="glass-card glass-card-hover p-5 flex items-center gap-4 group block"
                  >
                    <GradeBadge grade={grade} score={score} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-display font-700 text-white text-sm truncate">
                          {a.fileName}
                        </p>
                        <StatusPill status={a.status} />
                        {flagged > 0 && a.status === "complete" && (
                          <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger text-[10px] font-600">
                            {flagged} violation{flagged > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-muted text-xs font-body">
                        {formatDate(a.createdAt)} · {formatSize(a.fileSize)} ·{" "}
                        Outcome:{" "}
                        <span className="font-mono text-subtle">
                          {a.outcomeCol}
                        </span>{" "}
                        · {Object.keys(a.protectedCols || {}).length} attribute
                        {Object.keys(a.protectedCols || {}).length !== 1
                          ? "s"
                          : ""}
                        {a.rowCount
                          ? ` · ${a.rowCount.toLocaleString()} rows`
                          : ""}
                      </p>
                    </div>

                    {/* Protected attributes chips */}
                    <div className="hidden md:flex flex-wrap gap-1 max-w-[200px]">
                      {Object.keys(a.protectedCols || {})
                        .slice(0, 3)
                        .map((col) => (
                          <span
                            key={col}
                            className="px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-mono"
                          >
                            {col}
                          </span>
                        ))}
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-4 h-4 text-muted group-hover:text-brand-400 transition-colors flex-shrink-0"
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
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
