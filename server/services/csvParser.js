const csv = require("csv-parser");
const fetch = require("node-fetch");
const stream = require("stream");

/**
 * Download a CSV from a URL (Firebase Storage) and parse it.
 * Returns: { rows: Array<Object>, headers: string[] }
 */
async function parseCSVFromURL(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch CSV: ${response.status} ${response.statusText}`,
    );
  }

  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];

    response.body
      .pipe(csv())
      .on("headers", (hdrs) => {
        headers = hdrs;
      })
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve({ rows, headers }))
      .on("error", (err) => reject(err));
  });
}

/**
 * Parse CSV from a Buffer (used when file is uploaded directly).
 */
async function parseCSVFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];

    const readable = new stream.Readable();
    readable.push(buffer);
    readable.push(null);

    readable
      .pipe(csv())
      .on("headers", (hdrs) => {
        headers = hdrs;
      })
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve({ rows, headers }))
      .on("error", (err) => reject(err));
  });
}

/**
 * Extract values for a specific column from rows.
 * Normalizes to lowercase string.
 */
function extractColumn(rows, colName) {
  return rows.map((r) =>
    String(r[colName] ?? "")
      .trim()
      .toLowerCase(),
  );
}

/**
 * Get unique values in a column.
 */
function getUniqueValues(rows, colName) {
  return [...new Set(extractColumn(rows, colName))].filter(Boolean);
}

/**
 * Split rows by a grouping column.
 * Returns: { [groupValue]: Row[] }
 */
function groupBy(rows, colName) {
  return rows.reduce((acc, row) => {
    const key = String(row[colName] ?? "unknown")
      .trim()
      .toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

module.exports = {
  parseCSVFromURL,
  parseCSVFromBuffer,
  extractColumn,
  getUniqueValues,
  groupBy,
};
