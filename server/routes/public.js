const express = require("express");
const router = express.Router();
const { db } = require("../services/firebaseAdmin");

router.get("/:id", async (req, res) => {
  const snap = await db.collection("analyses").doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: "Not found" });
  const data = snap.data();
  if (!data.isPublic) return res.status(403).json({ error: "Not public" });
  // Strip userId/email for privacy
  const { userId, userEmail, ...safe } = data;
  res.json({ id: snap.id, ...safe });
});

module.exports = router;
