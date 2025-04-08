// firebaseConfig.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "blood-donation-dfe5b",
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };
