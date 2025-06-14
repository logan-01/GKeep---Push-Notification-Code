import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Parse Firebase service account JSON from .env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");

// Ensure private_key has proper newlines
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://gkeep-fb3b4-default-rtdb.asia-southeast1.firebasedatabase.app",
});

// * Initialize Realtime Database and Firestore
const database = admin.database();
const firestore = admin.firestore();
// * RTDB Reference
const goatsRef = database.ref("Goats");

export { database, firestore, goatsRef, admin };
