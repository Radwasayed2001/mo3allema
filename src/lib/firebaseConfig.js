// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
// You can also use environment variables by creating a .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyASdfenQgp2XxMPCTyWMa-OcFKFa5zYg50",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mo3alema-1f615.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mo3alema-1f615",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mo3alema-1f615.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "103682400529",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:103682400529:web:e9e6570351e9c6f6ca2cb0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
