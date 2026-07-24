import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../Firebase/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log("========== AUTH DEBUG ==========");
          console.log("Logged In Email:", user.email);
          console.log("Logged In UID:", user.uid);

          const userRef = doc(db, "users", user.uid);

          console.log("Firestore Path:", userRef.path);

          const userSnap = await getDoc(userRef);

          console.log("Document Exists:", userSnap.exists());

          if (userSnap.exists()) {
            const data = userSnap.data();

            console.log("Firestore Data:", data);
            console.log("Role:", data.role);

            setCurrentUser({
              uid: user.uid,
              email: user.email,
              ...data,
            });
          } else {
            console.error("No Firestore document found.");

            setCurrentUser(null);
          }
        } catch (err) {
          console.error("AuthContext Error:", err);
          setCurrentUser(null);
        }
      } else {
        console.log("No user logged in.");
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);