const { BigQuery } = require("@google-cloud/bigquery");

let bigquery = null;

function getBigQuery() {
  if (bigquery) return bigquery;

  try {
    bigquery = new BigQuery({
      projectId: process.env.GCP_PROJECT_ID || "fairlens-14363",
    });
    console.log("[BigQuery] Client initialized");
  } catch (err) {
    console.error("[BigQuery] Init failed:", err.message);
  }
  return bigquery;
}

async function logAnalysisToBigQuery(analysisData) {
  try {
    const bq = getBigQuery();
    if (!bq) return;

    const dataset = bq.dataset("fairlens_analytics");
    const table = dataset.table("bias_trends");

    const row = {
      analysisId: analysisData.analysisId || "",
      userId: analysisData.userId || "anonymous",
      fileName: analysisData.fileName || "",
      outcomeCol: analysisData.outcomeCol || "",
      fairnessGrade: analysisData.grade || "?",
      fairnessScore: analysisData.score || 0,
      flaggedAttributes: analysisData.flaggedAttributes || 0,
      totalAttributes: analysisData.totalAttributes || 0,
      complianceViolations: analysisData.complianceViolations || 0,
      intersectionalFlagged: analysisData.intersectionalFlagged || 0,
      rowCount: analysisData.rowCount || 0,
      domain: analysisData.domain || "all",
      createdAt: BigQuery.timestamp(new Date()),
    };

    await table.insert([row]);
    console.log(`[BigQuery] Logged analysis: ${analysisData.analysisId}`);
  } catch (err) {
    // Never crash the main flow
    console.error("[BigQuery] Log failed (non-critical):", err.message);
  }
}

async function getUserTrends(userId) {
  try {
    const bq = getBigQuery();
    if (!bq) return [];

    const query = `
      SELECT 
        analysisId,
        fileName,
        fairnessGrade,
        fairnessScore,
        flaggedAttributes,
        complianceViolations,
        domain,
        createdAt
      FROM \`fairlens-14363.fairlens_analytics.bias_trends\`
      WHERE userId = @userId
      ORDER BY createdAt DESC
      LIMIT 20
    `;

    const [rows] = await bq.query({
      query,
      params: { userId },
    });

    return rows;
  } catch (err) {
    console.error("[BigQuery] Query failed:", err.message);
    return [];
  }
}

async function getGlobalStats() {
  try {
    const bq = getBigQuery();
    if (!bq) return null;

    const query = `
      SELECT
        COUNT(*) as totalAnalyses,
        AVG(fairnessScore) as avgScore,
        COUNTIF(flaggedAttributes > 0) as biasedAnalyses,
        COUNTIF(fairnessGrade = 'A+') as excellentCount,
        COUNTIF(fairnessGrade = 'F') as failingCount,
        domain,
        COUNT(*) as domainCount
      FROM \`fairlens-14363.fairlens_analytics.bias_trends\`
      GROUP BY domain
      ORDER BY domainCount DESC
    `;

    const [rows] = await bq.query({ query });
    return rows;
  } catch (err) {
    console.error("[BigQuery] Stats query failed:", err.message);
    return null;
  }
}

module.exports = { logAnalysisToBigQuery, getUserTrends, getGlobalStats };
