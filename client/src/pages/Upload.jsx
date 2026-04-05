import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import ColumnMapper from "../components/ColumnMapper";
import SamplePicker from "../components/SamplePicker";

const STEPS = [
  { id: 1, label: "Upload CSV", desc: "Upload your dataset" },
  { id: 2, label: "Map Columns", desc: "Define outcome & attributes" },
  { id: 3, label: "Run Analysis", desc: "Detect bias with AI" },
];

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({
    outcomeCol: "",
    protectedCols: {},
    positiveOutcomeValue: "1",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  /* Step 1 — file ready from FileUpload component */
  const handleFileReady = useCallback((f, hdrs, rows) => {
    setFile(f);
    setHeaders(hdrs);
    setPreviewRows(rows);
    setUploadError(null);
  }, []);
  /* Sample picked — auto-fill everything and jump to step 3 */
  const handleSampleSelect = useCallback((file, sample) => {
    setFile(file);
    // Pre-fill mapping from sample config
    setMapping({
      outcomeCol: sample.outcome,
      protectedCols: sample.protectedCols,
      positiveOutcomeValue: sample.positiveValue,
    });
    // We still need headers for the ColumnMapper — skip to step 3 directly
    // by reading them from the sample config
    const hdrs = [sample.outcome, ...Object.keys(sample.protectedCols)];
    setHeaders(hdrs);
    toast.success(`Loaded ${sample.name} — ready to analyze!`);
    setStep(3);
  }, []);

  /* Step 2 — column mapping changed */
  const handleMappingChange = useCallback((m) => setMapping(m), []);

  const canProceedStep1 = !!file && headers.length > 0;
  const canProceedStep2 =
    mapping.outcomeCol && Object.keys(mapping.protectedCols).length > 0;

  /* ── Submit: upload file → save Firestore doc → navigate to dashboard */
  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!canProceedStep2) return;
    setSubmitting(true);
    setUploadError(null);

    try {
      toast.loading("Uploading dataset…", { id: "upload" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("outcomeCol", mapping.outcomeCol);
      formData.append("protectedCols", JSON.stringify(mapping.protectedCols));
      formData.append("positiveOutcomeValue", mapping.positiveOutcomeValue);
      formData.append("userId", user.uid);
      formData.append("userEmail", user.email);
      formData.append("fileName", file.name);
      formData.append("fileSize", file.size);

      setUploadPct(40);
      toast.loading("Sending to bias engine…", { id: "upload" });

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === "DATASET_TOO_SMALL") {
          setUploadError({
            code: "DATASET_TOO_SMALL",
            rowCount: data.rowCount,
            minimum: data.minimumRequired,
          });
          toast.dismiss("upload");
          setSubmitting(false);
          setUploadPct(0);
          return;
        }
        throw new Error(data.error || "Analysis failed");
      }

      const { analysisId } = data;
      if (!analysisId) {
        throw new Error(
          "Server did not return an analysis ID. The CSV may have failed to parse.",
        );
      }
      setUploadPct(100);
      toast.success("Analysis started!", { id: "upload" });
      navigate(`/dashboard/${analysisId}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Something went wrong", { id: "upload" });
      setSubmitting(false);
      setUploadPct(0);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-display font-800 text-3xl text-white mb-2">
            New Bias Analysis
          </h1>
          <p className="text-muted font-body">
            Upload a CSV dataset to scan for hidden discrimination using Gemini
            AI.
          </p>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-700 text-sm transition-all ${
                    step > s.id
                      ? "bg-success text-white"
                      : step === s.id
                        ? "bg-brand-500 text-white ring-4 ring-brand-500/20"
                        : "bg-bg-card border border-bg-border text-muted"
                  }`}
                >
                  {step > s.id ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-display font-600 transition-colors ${step === s.id ? "text-white" : "text-muted"}`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 mb-6 transition-colors ${step > s.id ? "bg-success/50" : "bg-bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1 ──────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card p-8 mb-6">
                <h2 className="font-display font-700 text-xl text-white mb-1">
                  Upload your dataset
                </h2>
                <p className="text-muted text-sm font-body mb-6">
                  Accepts CSV files up to 20 MB. Ideal for: hiring records, loan
                  decisions, medical outcomes, or any tabular data where an AI
                  makes decisions.
                </p>
                <FileUpload onFileReady={handleFileReady} />
              </div>

              <div className="glass-card p-5 mb-6">
                <SamplePicker onSelect={handleSampleSelect} />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className={`btn-primary ${!canProceedStep1 ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span>Continue to Column Mapping</span>
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
          )}

          {/* ── STEP 2 ──────────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card p-8 mb-6">
                <h2 className="font-display font-700 text-xl text-white mb-1">
                  Map your columns
                </h2>
                <p className="text-muted text-sm font-body mb-6">
                  Tell FairLens which column contains the AI's decision and
                  which columns are protected attributes (gender, race, age,
                  etc.). Auto-detection has already found likely columns —
                  review and confirm.
                </p>
                <ColumnMapper
                  headers={headers}
                  onChange={handleMappingChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="btn-ghost">
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
                      d="M11 17l-5-5m0 0l5-5m-5 5h12"
                    />
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className={`btn-primary ${!canProceedStep2 ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span>Review & Analyze</span>
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
          )}

          {/* ── STEP 3 — Review & Submit ─────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass-card p-8 mb-6">
                <h2 className="font-display font-700 text-xl text-white mb-1">
                  Review & Launch Analysis
                </h2>
                <p className="text-muted text-sm font-body mb-6">
                  Confirm your settings before FairLens runs the bias analysis.
                </p>

                <div className="space-y-4">
                  {/* File summary */}
                  <div className="rounded-xl bg-bg-card border border-bg-border p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
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
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-600 text-white text-sm truncate">
                        {file?.name}
                      </p>
                      <p className="text-muted text-xs font-body">
                        {headers.length} columns ·{" "}
                        {(file?.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  {/* Mapping summary */}
                  <div className="rounded-xl bg-bg-card border border-bg-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted text-xs font-body">
                        Outcome column
                      </span>
                      <span className="font-mono text-sm text-success font-600">
                        {mapping.outcomeCol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted text-xs font-body">
                        Positive value
                      </span>
                      <span className="font-mono text-sm text-white">
                        {mapping.positiveOutcomeValue}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-bg-border">
                      <p className="text-muted text-xs font-body mb-2">
                        Protected attributes (
                        {Object.keys(mapping.protectedCols).length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(mapping.protectedCols).map(
                          ([col, type]) => (
                            <span
                              key={col}
                              className="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono"
                            >
                              {col}{" "}
                              <span className="text-brand-400/60">
                                · {type}
                              </span>
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gemini disclaimer */}
                  <div className="flex items-start gap-3 rounded-xl bg-bg-card border border-bg-border p-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-700">G</span>
                    </div>
                    <div>
                      <p className="font-display font-600 text-white text-sm mb-1">
                        Powered by Gemini 2.5 flash
                      </p>
                      <p className="text-muted text-xs font-body leading-relaxed">
                        FairLens will compute 12+ statistical bias metrics and
                        use Gemini AI to generate a plain-English explanation of
                        each finding, including legal implications and
                        remediation steps.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dataset error */}
                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4"
                    >
                      {uploadError.code === "DATASET_TOO_SMALL" ? (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-danger/15 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 h-4 text-danger"
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
                          <div className="flex-1">
                            <p className="font-display font-700 text-danger text-sm mb-1">
                              Dataset too small for reliable analysis
                            </p>
                            <p className="text-danger/70 text-xs font-body leading-relaxed mb-3">
                              Your file has only{" "}
                              <span className="font-mono font-700 text-danger bg-danger/10 px-1 py-0.5 rounded">
                                {uploadError.rowCount} rows
                              </span>
                              . A minimum of{" "}
                              <span className="font-mono font-700 text-white">
                                {uploadError.minimum} rows
                              </span>{" "}
                              is needed — intersectional analysis requires 30+
                              samples per group combination to produce
                              meaningful results.
                            </p>
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-card border border-bg-border">
                              <svg
                                className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5"
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
                              <p className="text-muted text-xs font-body leading-relaxed">
                                Please upload a larger dataset. For best
                                results, use a CSV with 100+ rows and at least 2
                                protected attribute columns.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setUploadError(null);
                                setStep(1);
                              }}
                              className="mt-3 text-xs font-display font-600 text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
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
                                  d="M11 17l-5-5m0 0l5-5m-5 5h12"
                                />
                              </svg>
                              Back to upload
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-4 h-4 text-danger flex-shrink-0"
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
                          <p className="text-danger text-sm font-body">
                            {uploadError.message}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload progress */}
                {submitting && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted text-xs font-body">
                        Uploading & analyzing…
                      </span>
                      <span className="text-brand-400 text-xs font-mono font-600">
                        {uploadPct}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setUploadError(null);
                    setStep(2);
                  }}
                  disabled={submitting}
                  className="btn-ghost"
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
                      d="M11 17l-5-5m0 0l5-5m-5 5h12"
                    />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canProceedStep2}
                  className={`btn-primary text-base px-8 py-3.5 ${submitting ? "opacity-70 cursor-wait" : ""}`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Analyzing…</span>
                    </>
                  ) : (
                    <>
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
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>Launch Bias Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
