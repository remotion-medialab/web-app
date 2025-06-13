// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
    apiKey: "AIzaSyCn696SYox_sOCBxLueFJVu8PJctVCTteM",
    authDomain: "simtree-7cffa.firebaseapp.com",
    projectId: "simtree-7cffa",
    storageBucket: "simtree-7cffa.firebasestorage.app",
    messagingSenderId: "198862630444",
    appId: "1:198862630444:web:820f74025ced00d6812b89",
    measurementId: "G-QJWVDSPM2M"
  };  

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
