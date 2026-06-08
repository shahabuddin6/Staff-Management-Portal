// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMQyjDT-1Ahb9ogP1pGM_yMBbdMx_6AvI",
  authDomain: "staff-management-app-e1d03.firebaseapp.com",
  projectId: "staff-management-app-e1d03",
  storageBucket: "staff-management-app-e1d03.firebasestorage.app",
  messagingSenderId: "904573698326",
  appId: "1:904573698326:web:93324a918c7de2cff09037"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and Export the services so we can use them in App.jsx
export const auth = getAuth(app);
export const db = getFirestore(app);