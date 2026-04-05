import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

// const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const STATIC_SAMPLES = [
  {
    id: "hiring",
    name: "TechCorp Hiring",
    file: `/samples/hiring_dataset.csv`,
    rows: 500,
    description: "Gender & race bias in engineering hiring decisions",
    outcome: "hired",
    positiveValue: "1",
    protectedCols: { gender: "gender", race: "race", age: "age" },
    expectedGrade: "D",
    badge: "Strong bias",
  },
  {
    id: "loan",
    name: "Bank Loan Approvals",
    file: `/samples/loan_dataset.csv`,
    rows: 800,
    description: "Gender & race bias in loan decisions — ECOA risk",
    outcome: "loan_approved",
    positiveValue: "1",
    protectedCols: { gender: "gender", race: "race" },
    expectedGrade: "D−",
    badge: "Legal risk",
  },
  {
    id: "medical",
    name: "Medical Treatments",
    file: `/samples/medical_dataset.csv`,
    rows: 600,
    description: "Race & age bias in treatment approvals",
    outcome: "treatment_approved",
    positiveValue: "1",
    protectedCols: { race: "race", age_group: "age" },
    expectedGrade: "F",
    badge: "Critical",
  },
];

const gradeColor = (g) => {
  if (!g) return "#64748b";
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#22c55e";
  if (g.startsWith("C")) return "#f59e0b";
  if (g.startsWith("D")) return "#f97316";
  return "#ef4444";
};

export default function SamplePicker({ onSelect }) {
  const [loading, setLoading] = useState(null); // which sample is being fetched

  const handlePick = async (sample) => {
    setLoading(sample.id);
    try {
      // Fetch the CSV file from the server's /samples directory
      const res = await fetch(sample.file);
      if (!res.ok) throw new Error("Failed to load sample");
      const blob = await res.blob();
      const file = new File([blob], `${sample.name.replace(/\s+/g, "_")}.csv`, {
        type: "text/csv",
      });

      // Call parent with file + pre-configured mapping
      onSelect(file, sample);
    } catch (err) {
      console.error("Sample load error:", err);
      toast.error("Failed to load sample. Please upload your own CSV.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-brand-400 text-xs font-body font-600 uppercase tracking-widest">
          Or try a sample dataset
        </span>
        <div className="flex-1 h-px bg-bg-border" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STATIC_SAMPLES.map((s, i) => {
          const col = gradeColor(s.expectedGrade);
          const isLoading = loading === s.id;
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePick(s)}
              disabled={!!loading}
              className="glass-card glass-card-hover p-4 text-left flex flex-col gap-2 disabled:opacity-60 disabled:cursor-wait"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display font-700 text-white text-sm leading-snug">
                  {s.name}
                </p>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-700 uppercase tracking-wide flex-shrink-0"
                  style={{
                    background: `${col}18`,
                    color: col,
                    border: `1px solid ${col}40`,
                  }}
                >
                  {s.badge}
                </span>
              </div>
              <p className="text-muted text-xs font-body leading-relaxed">
                {s.description}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-muted text-[10px] font-body">
                  {s.rows.toLocaleString()} rows
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[10px] font-body">
                    Expected:
                  </span>
                  <span
                    className="font-display font-800 text-sm"
                    style={{ color: col }}
                  >
                    {s.expectedGrade}
                  </span>
                </div>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-brand-400 text-[10px] font-body">
                    Loading dataset…
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
