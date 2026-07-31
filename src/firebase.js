import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyASoV1ww9FWaOJlBB6gJhdWI5CqedTPm8s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ingredia-chef.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ingredia-chef",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ingredia-chef.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "6942297482",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:6942297482:web:228c5741085b4e4ffacc73",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DYMZ8N1H4Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { 
  app, 
  auth, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
};

