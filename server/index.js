require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRoute = require("./routes/upload");
const analyzeRoute = require("./routes/analyze");
const reportRoute = require("./routes/report");
const chatRoute = require("./routes/chat");
const app = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ─────────────────────────────────────── */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://fairlens-14363.web.app",
      "https://fairlens-14363.firebaseapp.com",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Routes ─────────────────────────────────────────── */
app.use("/api/upload", uploadRoute);
app.use("/api/analyze", analyzeRoute);
app.use("/api/report", reportRoute);
app.use("/api/chat", chatRoute);
const fixRoute = require("./routes/fix");
app.use("/api/fix", fixRoute);
/* ── Health check (Cloud Run needs this) ───────────── */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "FairLens API", version: "1.0.0" });
});

/* ── Serve sample datasets ──────────────────────────── */
app.use("/samples", express.static(path.join(__dirname, "samples")));

/* ── List available samples ─────────────────────────── */
app.get("/api/samples", (req, res) => {
  res.json({
    samples: [
      {
        id: "hiring",
        name: "TechCorp Hiring Dataset",
        file: "/samples/hiring_dataset.csv",
        rows: 500,
        description:
          "Hiring decisions with gender & race bias — strong DIR violations",
        outcome: "hired",
        positiveValue: "1",
        protectedCols: { gender: "gender", race: "race", age: "age" },
        expectedGrade: "D",
        badge: "Strong bias",
        badgeColor: "danger",
      },
      {
        id: "loan",
        name: "Bank Loan Approvals",
        file: "/samples/loan_dataset.csv",
        rows: 800,
        description:
          "Loan decisions with gender & race bias — ECOA violation risk",
        outcome: "loan_approved",
        positiveValue: "1",
        protectedCols: { gender: "gender", race: "race" },
        expectedGrade: "D-",
        badge: "Legal risk",
        badgeColor: "danger",
      },
      {
        id: "medical",
        name: "Medical Treatment Approvals",
        file: "/samples/medical_dataset.csv",
        rows: 600,
        description:
          "Treatment approval with race & age bias — healthcare disparity",
        outcome: "treatment_approved",
        positiveValue: "1",
        protectedCols: { race: "race", age_group: "age" },
        expectedGrade: "F",
        badge: "Critical",
        badgeColor: "danger",
      },
    ],
  });
});

/* ── Serve static client build in production ────────── */
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

/* ── Global error handler ───────────────────────────── */
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FairLens server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});
