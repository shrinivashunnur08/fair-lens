import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const gradeColor = (g) => {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0c0c1e",
        border: "1px solid #1e1e3f",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#fff", fontWeight: 600 }}>{label}</p>
      <p style={{ color: gradeColor(payload[0]?.payload?.fairnessGrade) }}>
        Grade: {payload[0]?.payload?.fairnessGrade} ({payload[0]?.value}/100)
      </p>
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bqLoading, setBqLoading] = useState(true);

  /* Firestore — recent analyses */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "analyses"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    getDocs(q)
      .then((snap) => {
        setAnalyses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  /* BigQuery — trend data */
  useEffect(() => {
    if (!user) return;
    fetch(api(`/api/trends/${user.uid}`))
      .then((r) => r.json())
      .then((d) => {
        const chartData = (d.trends || []).reverse().map((t, i) => ({
          index: i + 1,
          name:
            t.fileName?.replace(".csv", "").slice(0, 15) || `Analysis ${i + 1}`,
          score: t.fairnessScore,
          fairnessGrade: t.fairnessGrade,
          date: t.createdAt?.value
            ? new Date(t.createdAt.value).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : "",
        }));
        setTrends(chartData);
        setBqLoading(false);
      })
      .catch(() => setBqLoading(false));
  }, [user]);

  const avgScore = trends.length
    ? Math.round(trends.reduce((s, t) => s + t.score, 0) / trends.length)
    : 0;

  const improvement =
    trends.length >= 2 ? trends[trends.length - 1].score - trends[0].score : 0;

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display font-800 text-3xl text-white mb-2">
            Analysis History
          </h1>
          <p className="text-muted font-body">
            Track your bias detection results and fairness trends over time.
          </p>
        </motion.div>

        {/* BigQuery Trend Chart */}
        {trends.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-blue-400"
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
                  </div>
                  <h2 className="font-display font-700 text-white text-base">
                    Fairness Trend
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 font-700 uppercase">
                    BigQuery
                  </span>
                </div>
                <p className="text-muted text-xs font-body">
                  Powered by Google BigQuery Analytics
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-muted text-[10px] font-body uppercase">
                    Avg Score
                  </p>
                  <p className="font-display font-700 text-white text-lg">
                    {avgScore}/100
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted text-[10px] font-body uppercase">
                    Trend
                  </p>
                  <p
                    className={`font-display font-700 text-lg ${improvement >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {improvement >= 0 ? "+" : ""}
                    {improvement} pts
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted text-[10px] font-body uppercase">
                    Analyses
                  </p>
                  <p className="font-display font-700 text-white text-lg">
                    {trends.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Improvement banner */}
            {improvement > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/8 border border-success/20 mb-4">
                <svg
                  className="w-4 h-4 text-success"
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
                <p className="text-success text-xs font-body">
                  Your fairness score improved by{" "}
                  <strong>{improvement} points</strong> since your first
                  analysis. Keep going!
                </p>
              </div>
            )}

            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={trends}
                margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e1e3f"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine
                  y={80}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: "Fair (80)", fill: "#10b981", fontSize: 10 }}
                />
                <Tooltip content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: "#6366f1", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* BigQuery loading */}
        {bqLoading && (
          <div className="glass-card p-4 mb-6 flex items-center gap-3">
            <div className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-xs font-body">
              Loading BigQuery trend data…
            </p>
          </div>
        )}

        {/* Not enough data yet */}
        {!bqLoading && trends.length < 2 && trends.length > 0 && (
          <div className="glass-card p-4 mb-6 flex items-center gap-3 border-brand-500/20">
            <svg
              className="w-4 h-4 text-brand-400 flex-shrink-0"
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
            <p className="text-muted text-xs font-body">
              Run <strong className="text-white">2+ analyses</strong> to unlock
              your BigQuery fairness trend chart.
            </p>
          </div>
        )}

        {/* Analysis list */}
        <div className="space-y-3">
          <p className="text-muted text-xs font-body uppercase tracking-widest">
            Recent Analyses
          </p>
          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted font-body mb-4">No analyses yet.</p>
              <button
                onClick={() => navigate("/upload")}
                className="btn-primary"
              >
                Start your first analysis
              </button>
            </div>
          ) : (
            analyses.map((a, i) => {
              const grade = a.results?.fairnessScore?.grade || "?";
              const score = a.results?.fairnessScore?.score || 0;
              const col = gradeColor(grade);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 cursor-pointer hover:border-brand-500/40 transition-colors"
                  onClick={() => navigate(`/dashboard/${a.id}`)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-800 text-base flex-shrink-0"
                        style={{
                          background: `${col}15`,
                          color: col,
                          border: `1px solid ${col}30`,
                        }}
                      >
                        {grade}
                      </div>
                      <div>
                        <p className="font-display font-600 text-white text-sm">
                          {a.fileName}
                        </p>
                        <p className="text-muted text-xs font-body">
                          {a.outcomeCol} · {a.rowCount?.toLocaleString() || 0}{" "}
                          rows ·{" "}
                          {a.createdAt?.toDate
                            ? a.createdAt.toDate().toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className="font-mono text-xs font-600"
                          style={{ color: col }}
                        >
                          {score}/100
                        </p>
                        <p className="text-muted text-[10px] font-body">
                          {a.results?.flaggedAttributes || 0} violations
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-600 ${
                          a.status === "complete"
                            ? "bg-success/15 text-success"
                            : a.status === "error"
                              ? "bg-danger/15 text-danger"
                              : "bg-brand-500/15 text-brand-400"
                        }`}
                      >
                        {a.status}
                      </span>
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
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
