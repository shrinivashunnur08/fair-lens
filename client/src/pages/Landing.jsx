import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

/* ── tiny animated counter ─────────────────────────────── */
function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      start += step;
      if (start >= target) {
        setVal(target);
        clearInterval(t);
      } else setVal(start);
    }, 24);
    return () => clearInterval(t);
  }, [target]);
  return (
    <span>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ── floating data pill ─────────────────────────────────── */
function FloatingPill({ label, value, color, style }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={style}
      className="absolute glass-card px-3 py-2 flex items-center gap-2 text-xs shadow-lg shadow-black/40"
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-muted font-body">{label}</span>
      <span className="font-display font-700 text-white">{value}</span>
    </motion.div>
  );
}

/* ── feature card ───────────────────────────────────────── */
function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glass-card glass-card-hover p-6 group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-display font-600 text-white text-base mb-2">
        {title}
      </h3>
      <p className="text-muted text-sm font-body leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ── step card ──────────────────────────────────────────── */
function StepCard({ num, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex gap-4"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full border border-brand-500/40 bg-brand-500/10 flex items-center justify-center font-display font-700 text-brand-400 text-sm">
        {num}
      </div>
      <div>
        <h4 className="font-display font-600 text-white text-sm mb-1">
          {title}
        </h4>
        <p className="text-muted text-xs font-body leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleCTA = async () => {
    if (user) {
      navigate("/upload");
    } else {
      try {
        await signInWithGoogle();
        toast.success("Signed in! Let's get started.");
        navigate("/upload");
      } catch {
        toast.error("Sign-in failed. Please try again.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary overflow-x-hidden">
      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid opacity-100" />

        {/* Radial glow blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/8 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-cyan-500/8 blur-[80px] pointer-events-none" />

        {/* Floating data pills */}
        <FloatingPill
          label="Gender bias detected"
          value="−38%"
          color="bg-danger"
          style={{ top: "22%", left: "8%" }}
        />
        <FloatingPill
          label="Fairness score"
          value="D−"
          color="bg-orange-500"
          style={{ top: "30%", right: "7%" }}
        />
        <FloatingPill
          label="Protected attrs"
          value="4 found"
          color="bg-brand-400"
          style={{ bottom: "28%", left: "6%" }}
        />
        <FloatingPill
          label="After fix"
          value="A+ 94"
          color="bg-success"
          style={{ bottom: "32%", right: "8%" }}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/8 text-brand-400 text-xs font-body font-600 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Google Solution Challenge 2026 · AI Bias Detection
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display font-800 text-5xl md:text-7xl leading-[1.05] mb-6"
          >
            Find bias <span className="gradient-text">before it</span>
            <br />
            finds your users
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-subtle text-lg md:text-xl font-body leading-relaxed max-w-2xl mx-auto mb-10"
          >
            Upload your dataset. FairLens uses{" "}
            <span className="text-white font-600">Gemini AI</span> to detect
            hidden discrimination, visualize disparities, and generate a full
            audit report — in seconds.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={handleCTA}
              className="btn-primary text-base px-8 py-3.5"
            >
              <span>Analyze Your Dataset</span>
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
            <a
              href="https://www.linkedin.com/in/shrinivas-hunnur-b93347225"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-base px-8 py-3.5"
            >
              {/* LinkedIn SVG Icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              View Me on LinkedIn
            </a>
            <a
              href="https://github.com/shrinivashunnur08/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-base px-8 py-3.5"
            >
              {" "}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                {" "}
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />{" "}
              </svg>{" "}
              View Me on GitHub{" "}
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 text-xs text-muted font-body"
          >
            Powered by Gemini 2.5 flash · Firebase · Google Cloud Run ·
            Developed by Shrinivas Hunnur
          </motion.p>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════════ */}
      <section className="py-16 border-y border-bg-border/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 94, suffix: "%", label: "Bias detection accuracy" },
              { value: 3, suffix: "s", label: "Average analysis time" },
              { value: 12, suffix: "+", label: "Fairness metrics computed" },
              { value: 5, suffix: "+", label: "Protected attributes detected" },
            ].map(({ value, suffix, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-display font-800 text-3xl md:text-4xl gradient-text mb-1">
                  <Counter target={value} suffix={suffix} />
                </div>
                <p className="text-muted text-sm font-body">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-brand-400 text-xs font-body font-600 uppercase tracking-widest mb-3">
            What FairLens does
          </p>
          <h2 className="font-display font-700 text-3xl md:text-4xl text-white mb-4">
            Every tool you need to audit AI fairness
          </h2>
          <p className="text-muted text-base font-body max-w-xl mx-auto">
            From raw CSV to boardroom-ready audit report — FairLens handles the
            full pipeline.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            delay={0.0}
            icon={
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            }
            title="Smart CSV Upload"
            desc="Drag-and-drop your dataset. FairLens auto-detects protected attributes like gender, race, and age — no manual tagging needed."
          />

          <FeatureCard
            delay={0.1}
            icon={
              <svg
                className="w-5 h-5 text-brand-400"
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
            title="Bias Metrics Engine"
            desc="Computes Disparate Impact Ratio, Statistical Parity, Equal Opportunity Difference, and more across every demographic group."
          />

          <FeatureCard
            delay={0.2}
            icon={
              <svg
                className="w-5 h-5 text-brand-400"
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
            }
            title="Gemini AI Explainer"
            desc="Click any bias finding and Gemini 1.5 Pro explains exactly what it means, who it harms, and the legal/ethical implications — in plain English."
          />

          <FeatureCard
            delay={0.3}
            icon={
              <svg
                className="w-5 h-5 text-brand-400"
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
            }
            title="What-If Simulator"
            desc="Remove features, adjust weights, and watch the fairness score update live. Find the minimum change needed to achieve equitable outcomes."
          />

          <FeatureCard
            delay={0.4}
            icon={
              <svg
                className="w-5 h-5 text-brand-400"
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
            title="Fairness Grade Card"
            desc="Every dataset gets an A–F fairness score with a full breakdown — instantly shareable with leadership, legal teams, or regulators."
          />

          <FeatureCard
            delay={0.5}
            icon={
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title="AI Audit Report PDF"
            desc="One click generates a full professional audit report — written by Gemini — with findings, severity scores, and remediation steps."
          />
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
      <section className="py-24 border-t border-bg-border/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-brand-400 text-xs font-body font-600 uppercase tracking-widest mb-3">
                  How it works
                </p>
                <h2 className="font-display font-700 text-3xl text-white mb-8">
                  From raw data to audit report in minutes
                </h2>
              </motion.div>
              <div className="space-y-7">
                <StepCard
                  delay={0.1}
                  num="01"
                  title="Upload your dataset"
                  desc="Drag and drop any CSV file — hiring records, loan decisions, medical outcomes. FairLens accepts up to 100k rows."
                />
                <StepCard
                  delay={0.2}
                  num="02"
                  title="Map your columns"
                  desc="Tell FairLens which column is the outcome (hired/not hired) and which are protected attributes. Auto-detection handles most cases."
                />
                <StepCard
                  delay={0.3}
                  num="03"
                  title="Gemini analyzes for bias"
                  desc="Statistical algorithms compute 12+ fairness metrics. Gemini then reads the results and explains what they mean in plain language."
                />
                <StepCard
                  delay={0.4}
                  num="04"
                  title="Fix it and download the report"
                  desc="Use the What-If simulator to remove biased features. Then export a full PDF audit report — ready for your legal or compliance team."
                />
              </div>
            </div>

            {/* Mock dashboard preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card p-4 relative"
            >
              {/* Mock score card */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-muted text-xs font-body mb-1">
                    Fairness Score
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-800 text-4xl text-danger">
                      D−
                    </span>
                    <span className="text-danger text-sm font-body">
                      32 / 100
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted text-xs font-body mb-1">Dataset</p>
                  <p className="text-white text-sm font-display font-600">
                    TechCorp_Hiring.csv
                  </p>
                  <p className="text-muted text-xs font-body">
                    500 rows · 3 attributes
                  </p>
                </div>
              </div>

              {/* Mock bar chart */}
              <div className="space-y-3 mb-4">
                {[
                  { label: "Gender", val: 40, color: "bg-danger" },
                  { label: "Race", val: 58, color: "bg-orange-500" },
                  { label: "Age", val: 72, color: "bg-warning" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-body mb-1">
                      <span className="text-muted">{label} disparity</span>
                      <span className="text-white font-600">{val}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{
                          width: `${val}%`,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Mock Gemini badge */}
              <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white text-[9px] font-700">G</span>
                  </div>
                  <span className="text-brand-400 text-xs font-display font-600">
                    Gemini Analysis
                  </span>
                </div>
                <p className="text-subtle text-xs font-body leading-relaxed">
                  "Women in engineering roles are 40% less likely to be hired
                  despite equal qualifications — this constitutes disparate
                  impact under EEOC guidelines…"
                </p>
              </div>

              {/* Glow overlay */}
              <div className="absolute inset-0 rounded-[16px] pointer-events-none border border-danger/20" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ CTA BOTTOM ══════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="glass-card p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-violet-600/10 pointer-events-none" />
              <p className="text-brand-400 text-xs font-body font-600 uppercase tracking-widest mb-3">
                Ready to start?
              </p>
              <h2 className="font-display font-800 text-3xl md:text-4xl text-white mb-4">
                Stop letting bias slip through
              </h2>
              <p className="text-muted font-body mb-8 max-w-md mx-auto">
                Upload your first dataset and get a full fairness report in
                under 60 seconds.
              </p>
              <button
                onClick={handleCTA}
                className="btn-primary text-base px-10 py-4"
              >
                <span>Start Free Analysis</span>
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
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer className="border-t border-bg-border/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white" />
              </svg>
            </div>
            <span className="font-display font-600 text-sm text-white">
              FairLens
            </span>
          </div>
          <p className="text-muted text-xs font-body text-center">
            Built for Google Solution Challenge 2026 · Powered by Gemini AI +
            Google Cloud
          </p>
          <p className="text-muted text-xs font-body">
            © 2026 FairLens. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
