// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'mobapp'); // Connect to the mobapp database
export const auth = getAuth(app);
export const functions = getFunctions(app);
