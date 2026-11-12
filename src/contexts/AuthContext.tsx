import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getErrorCode } from "../lib/errors";
import { clearCachedRole, getCachedRole, setCachedRole } from "../lib/roleCache";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import type { UserRole } from "../types/user";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAthlete: boolean;
  userRole: UserRole | null;
  displayName: string | null;
  photoURL: string | null;
  setPhotoURL: (url: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isEditor: false,
  isAthlete: false,
  userRole: null,
  displayName: null,
  photoURL: null,
  setPhotoURL: () => {},
});

// Right after sign-in the first Firestore read can race the new auth token and
// fail with permission-denied: refresh the token and try once more.
const readUserDoc = async (firebaseUser: User) => {
  const ref = doc(db, "users", firebaseUser.uid);
  try {
    return await getDoc(ref);
  } catch (error) {
    if (getErrorCode(error) !== "permission-denied") throw error;
    await firebaseUser.getIdToken(true);
    return await getDoc(ref);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearCachedRole();
        setUserRole(null);
        setDisplayName(null);
        setPhotoURL(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Same user as last time on this device: render the app now with the cached
      // role and confirm it from Firestore in the background. A changed role
      // re-renders the routes, and ProtectedRoute redirects.
      const cachedRole = getCachedRole(firebaseUser.uid);
      if (cachedRole) {
        setUserRole(cachedRole);
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // First sign-in here: publish the user together with the role, so no
        // render sees a user without a role while the profile is loading.
        setLoading(true);
      }

      try {
        const userDoc = await readUserDoc(firebaseUser);
        // Signed out (or switched user) while reading: a newer callback owns the state
        if (auth.currentUser?.uid !== firebaseUser.uid) return;
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = (userData?.role as UserRole) || null;
          setUserRole(role);
          setDisplayName(userData?.displayName || null);
          setPhotoURL(userData?.photoURL || null);
          setCachedRole(firebaseUser.uid, role);
        } else {
          setUserRole(null);
          setDisplayName(null);
          setPhotoURL(null);
          clearCachedRole();
        }
      } catch (error) {
        // Signed out (or switched user) while reading: the newer callback owns the state
        if (auth.currentUser?.uid !== firebaseUser.uid) return;
        console.error("Error checking user role:", error);
        // Offline with a cached role: keep it so the PWA still opens
        if (!cachedRole) {
          setUserRole(null);
          setDisplayName(null);
          setPhotoURL(null);
        }
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userRole === "admin";
  const isEditor = userRole === "editor" || userRole === "admin";
  const isAthlete = userRole === "athlete";

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isEditor, isAthlete, userRole, displayName, photoURL, setPhotoURL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
