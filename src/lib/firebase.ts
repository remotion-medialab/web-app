// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Updated to use the same Firebase project as your mobile app
const firebaseConfig = {
  apiKey: "AIzaSyDJUOXGl3kX0_bJu7ebjTRhPhyhK3BIlYA",
  authDomain: "reself-noregrets.firebaseapp.com",
  projectId: "reself-noregrets",
  storageBucket: "reself-noregrets.firebasestorage.app",
  messagingSenderId: "1035227524394",
  appId: "1:1035227524394:web:e23ca4fc11d052d1e74253",
  measurementId: "G-EH1MSLTF3N"
};

// Initialize Firebase app if not already initialized
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize services
export const db = getFirestore(app, 'mobapp'); // Connect to the 'mobapp' database
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Log database info for debugging
console.log('🔍 Firebase Configuration:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
});
