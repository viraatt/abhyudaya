import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBaTTNrVGmzJmObIkZ3t8qWfdH0WuF8i3k",
  authDomain: "abhyudayaclub.firebaseapp.com",
  projectId: "abhyudayaclub",
  storageBucket: "abhyudayaclub.firebasestorage.app",
  messagingSenderId: "824083998654",
  appId: "1:824083998654:web:ab7011bb18a0a7ed69bbef",
  measurementId: "G-0VEHR4MC8H"
};

const app = initializeApp(firebaseConfig);

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;