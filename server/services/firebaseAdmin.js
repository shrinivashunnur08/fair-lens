const admin = require("firebase-admin");

let db, storage;

function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    storage = admin.storage();
    return;
  }

  // Option A: Service account JSON file (local dev)
  // Set GOOGLE_APPLICATION_CREDENTIALS env var to path of service account JSON
  // OR use FIREBASE_SERVICE_ACCOUNT env var with the JSON content as a string

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Cloud Run: pass as env var (JSON string)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local dev: path to JSON file
    credential = admin.credential.applicationDefault();
  } else {
    // Fallback: will use ADC (Application Default Credentials) on Cloud Run
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  db = admin.firestore();
  storage = admin.storage();
}

// Initialize on require
try {
  initFirebase();
  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.error("❌ Firebase Admin init failed:", err.message);
}

module.exports = { admin, db, storage };
