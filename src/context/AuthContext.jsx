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
  const [currentUser, setCurrentUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("No user logged in");
        setCurrentUser(null);
        return;
      }

      try {
        console.log("================================");
        console.log("Logged In UID:", user.uid);
        console.log("Logged In Email:", user.email);

        const userRef = doc(db, "users", user.uid);

        console.log("Reading Firestore:", userRef.path);

        const userSnap = await getDoc(userRef);

        console.log("Document Exists:", userSnap.exists());

        if (!userSnap.exists()) {
          console.error("User document not found.");
          setCurrentUser(null);
          return;
        }

        const data = userSnap.data();

        console.log("Firestore Data:", data);
        console.log("Role:", data.role);
        console.log("================================");

        setCurrentUser({
          uid: user.uid,
          email: user.email,
          ...data,
        });

      } catch (error) {
        console.error(error);
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser }}>
      {currentUser !== undefined && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);