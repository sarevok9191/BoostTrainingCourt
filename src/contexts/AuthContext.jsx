import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { auth, db, getMessagingInstance } from "../firebase/config";

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push Certificates
// Set VITE_FIREBASE_VAPID_KEY in your .env file.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BJDzOzAl61KOUFgl7WHVF4A8dowxaVYZTSxwXYvCjff2j5OQ9IbdpS2uGoRiEtYcI3fP3tOhsFvNatCKDwJ0WQI";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole,    setUserRole]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  async function login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", credential.user.uid));
    if (!snap.exists()) throw new Error("User profile not found in Firestore.");
    const role    = snap.data().role;
    const allowed = ["superadmin", "trainer", "trainee"];
    if (!allowed.includes(role)) throw new Error("Unknown role: " + role);
    return role;
  }

  function logout() {
    return signOut(auth);
  }

  // ── Listen for auth state changes ────────────────────────────────
  // saveFcmToken is called here so it runs on every app load / token
  // refresh, not only on explicit sign-in.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        setUserRole(snap.exists() ? snap.data().role : null);
        setCurrentUser(user);
        // Refresh FCM token on every login / page load (non-blocking)
        saveFcmToken(user.uid).catch(() => {});
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Listen for foreground FCM messages ───────────────────────────
  useEffect(() => {
    let cleanup = () => {};
    getMessagingInstance().then((messaging) => {
      if (!messaging) return;
      const unsub = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || "Boost Training Court";
        const body  = payload.notification?.body  || "";
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      });
      cleanup = unsub;
    });
    return () => cleanup();
  }, []);

  const value = { currentUser, userRole, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ── Helper: request notification permission + store FCM token ────
async function saveFcmToken(uid) {
  if (!VAPID_KEY) return; 
  if (!('Notification' in window)) return;

  // IMPORTANT: Only auto-sync the token if permission is ALREADY granted.
  // If it's not granted, don't ask here. Wait for the user to click a button.
  if (Notification.permission !== "granted") return;

  const messaging = await getMessagingInstance();
  if (!messaging) return;

  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (!token) return;

  await updateDoc(doc(db, "users", uid), { fcmToken: token });
}
