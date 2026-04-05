const express = require("express");
const multer = require("multer");
const router = express.Router();
const { db } = require("../services/firebaseAdmin");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted"), false);
    }
  },
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    const { parseCSVFromBuffer } = require("../services/csvParser");
    const { rows, headers } = await parseCSVFromBuffer(req.file.buffer);

    // Save full CSV data to Firestore (no Storage needed)
    const docRef = await db.collection("datasets").add({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      rowCount: rows.length,
      headers,
      rows,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      analysisId: docRef.id, // frontend calls this datasetId
      fileName: req.file.originalname,
      fileSize: req.file.size,
      rowCount: rows.length,
      headers,
      preview: rows.slice(0, 5),
    });
  } catch (err) {
    console.error("[upload]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
