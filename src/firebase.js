// src/firebase.js
import { initializeApp } from "firebase/app";
// Import the specific SDKs you need for Auth and Database
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzdiia6x_JtqLNa2HXA_ryljXrjIyg6v4",
  authDomain: "school-portal-69e2b.firebaseapp.com",
  projectId: "school-portal-69e2b",
  storageBucket: "school-portal-69e2b.firebasestorage.app",
  messagingSenderId: "825534501732",
  appId: "1:825534501732:web:c7ca75d1f386d4a19fe071"
};

// Initialize Firebase Core
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore Database, then EXPORT them
export const auth = getAuth(app);
export const db = getFirestore(app);