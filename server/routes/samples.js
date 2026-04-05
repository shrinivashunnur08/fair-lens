const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// GET /api/samples — list available samples
router.get("/", (req, res) => {
  res.json({
    samples: [
      {
        id: "hiring",
        name: "Biased Hiring Dataset",
        rows: 500,
        description: "Hiring decisions with gender & age bias",
        outcomeCol: "hired",
        positiveOutcomeValue: "1",
        protectedCols: { gender: "demographic", age: "demographic" },
      },
      {
        id: "loan",
        name: "Loan Approval Dataset",
        rows: 1200,
        description: "Loan decisions with race & gender bias",
        outcomeCol: "loan_approved",
        positiveOutcomeValue: "1",
        protectedCols: { gender: "demographic", race: "demographic" },
      },
      {
        id: "medical",
        name: "Medical Treatment Dataset",
        rows: 800,
        description: "Treatment recommendations with gender bias",
        outcomeCol: "treatment_recommended",
        positiveOutcomeValue: "1",
        protectedCols: {
          gender: "demographic",
          insurance_type: "socioeconomic",
        },
      },
    ],
  });
});

// GET /api/samples/:id — download the CSV file
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const allowed = ["hiring", "loan", "medical"];
  if (!allowed.includes(id)) {
    return res.status(404).json({ error: "Sample not found" });
  }
  const filePath = path.join(__dirname, "../samples", `${id}.csv`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Sample file not found" });
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${id}_sample.csv"`,
  );
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
