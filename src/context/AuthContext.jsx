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

// Minimal inline spinner shown only during the brief Firebase auth check.
// Keeps the app from showing a blank screen for 1-3 s on first load.
function AuthLoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        background: "#fff",
      }}
      aria-label="Initialising…"
      role="status"
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #e2e8f0",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "authSpin 0.65s linear infinite",
        }}
      />
      <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setCurrentUser(null);
          return;
        }

        const data = userSnap.data();
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          ...data,
        });
      } catch (error) {
        console.error("[AuthContext] error:", error);
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading: currentUser === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);