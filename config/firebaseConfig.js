const admin = require('firebase-admin'); // Correct import of Firebase Admin SDK
const serviceAccount = require('../firebase_key.json'); // Path to your Firebase Admin SDK JSON file

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount), // Initialize with service account
});
const db = admin.firestore(); // Initialize Firestore Database
// console.log(admin); // Log the firebaseAdmin instance
module.exports = {admin,db}; // Export the firebaseAdmin instance
