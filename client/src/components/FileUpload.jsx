import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";

export default function FileUpload({ onFileReady }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { rows, headers }
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  const handleFile = useCallback(
    (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (!f) return;
      if (!f.name.endsWith(".csv")) {
        setError("Please upload a .csv file");
        return;
      }
      if (f.size > 20 * 1024 * 1024) {
        setError("File must be under 20 MB");
        return;
      }

      setError("");
      setFile(f);
      setParsing(true);

      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        preview: 6, // only first 6 rows for preview
        complete: ({ data, meta }) => {
          setParsing(false);
          setPreview({ headers: meta.fields || [], rows: data });
          onFileReady(f, meta.fields || [], data);
        },
        error: () => {
          setParsing(false);
          setError("Could not parse CSV. Make sure it has a header row.");
        },
      });
    },
    [onFileReady],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFile,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    setError("");
    onFileReady(null, [], []);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer p-10 text-center group
          ${
            isDragActive
              ? "border-brand-500 bg-brand-500/8 dropzone-active"
              : file
                ? "border-success/40 bg-success/5 hover:border-success/60"
                : "border-bg-border hover:border-brand-500/50 hover:bg-brand-500/5"
          }`}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {parsing ? (
            <motion.div
              key="parsing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted text-sm font-body">Parsing CSV…</p>
            </motion.div>
          ) : file && preview ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-success"
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
                </div>
                <div className="text-left">
                  <p className="font-display font-600 text-white text-sm">
                    {file.name}
                  </p>
                  <p className="text-muted text-xs font-body mt-0.5">
                    {formatSize(file.size)} · {preview.headers.length} columns ·
                    ~{preview.rows.length}+ rows
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-danger/20 hover:text-danger text-muted flex items-center justify-center transition-colors flex-shrink-0"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
                ${isDragActive ? "bg-brand-500/20 border border-brand-500/40" : "bg-bg-card border border-bg-border group-hover:border-brand-500/30"}`}
              >
                <svg
                  className={`w-7 h-7 transition-colors ${isDragActive ? "text-brand-400" : "text-muted group-hover:text-brand-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              <div>
                <p className="font-display font-600 text-white text-base mb-1">
                  {isDragActive ? "Drop it here!" : "Drag & drop your CSV file"}
                </p>
                <p className="text-muted text-sm font-body">
                  or{" "}
                  <span className="text-brand-400 underline underline-offset-2">
                    browse to upload
                  </span>{" "}
                  · Max 20 MB
                </p>
                <p className="text-muted/60 text-xs font-body mt-1">
                  Minimum 50 rows required for reliable analysis
                </p>
              </div>

              {/* Accepted formats */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-bg-card border border-bg-border text-xs text-muted font-mono">
                  .csv
                </span>
                <span className="text-muted text-xs font-body">
                  Hiring · Loan · Medical · Any tabular data
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-body"
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
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV preview table */}
      <AnimatePresence>
        {preview && preview.rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-bg-border overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-bg-card border-b border-bg-border flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs text-muted font-body">
                Preview — first {preview.rows.length} rows
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-bg-secondary">
                    {preview.headers.slice(0, 8).map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-brand-400 font-600 whitespace-nowrap border-b border-bg-border"
                      >
                        {h}
                      </th>
                    ))}
                    {preview.headers.length > 8 && (
                      <th className="px-3 py-2 text-muted border-b border-bg-border">
                        +{preview.headers.length - 8} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-bg-border/50 ${i % 2 === 0 ? "bg-bg-primary/40" : "bg-bg-secondary/40"}`}
                    >
                      {preview.headers.slice(0, 8).map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 text-subtle whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis"
                        >
                          {String(row[h] ?? "—")}
                        </td>
                      ))}
                      {preview.headers.length > 8 && (
                        <td className="px-3 py-2 text-muted">…</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
