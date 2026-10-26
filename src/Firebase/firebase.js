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

// Safe Firebase Messaging loader
let messagingInstance = null;
export const getMessagingInstance = async () => {
  if (typeof window === "undefined") return null;
  try {
    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();
    if (!supported) return null;
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (err) {
    console.warn("[Firebase] Messaging not supported in this environment:", err);
    return null;
  }
};

export default app;