const express = require("express");
const router = express.Router();
const { getUserTrends, getGlobalStats } = require("../services/bigqueryClient");

/* GET /api/trends/:userId — user's bias trends */
router.get("/:userId", async (req, res) => {
  try {
    const trends = await getUserTrends(req.params.userId);
    res.json({ trends });
  } catch (err) {
    console.error("[trends]", err.message);
    res.json({ trends: [] });
  }
});

/* GET /api/trends/global/stats — platform-wide stats */
router.get("/global/stats", async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json({ stats });
  } catch (err) {
    res.json({ stats: null });
  }
});

module.exports = router;
