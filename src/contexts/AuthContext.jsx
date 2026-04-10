import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import { auth, db, getMessagingInstance } from "../firebase/config";

// VAPID key from Firebase Console
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

  // NEW: This function MUST be here so the dashboard can trigger the browser prompt
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.error("This browser does not support notifications.");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && currentUser) {
        // Bypass the early return check because we just got permission
        await saveFcmToken(currentUser.uid, true); 
        return true;
      }
      console.warn("Notification permission not granted. Status:", permission);
      return false;
    } catch (err) {
      console.error("Error requesting permission:", err);
      return false;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        setUserRole(snap.exists() ? snap.data().role : null);
        setCurrentUser(user);
        // Silently try to refresh token on load
        saveFcmToken(user.uid).catch(() => {});
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

  // Export the new permission function so TraineeDashboard can use it
  const value = { currentUser, userRole, login, logout, loading, requestNotificationPermission };

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
async function saveFcmToken(uid, forceRequest = false) {
  console.log("FCM Setup: Starting token fetch process...");
  try {
    if (!VAPID_KEY) throw new Error("VAPID_KEY is missing.");
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      throw new Error("Push notifications/Service Workers not supported (Are you using an insecure 192.168 IP address?).");
    }

    if (!forceRequest && Notification.permission !== "granted") {
      console.log("FCM Setup: Permission not granted yet, waiting for explicit user prompt.");
      return;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) throw new Error("FCM Setup: getMessagingInstance returned null.");

    // EXPLICIT FIX: Manually register the service worker for Vite compatibility
    console.log("FCM Setup: Registering Service Worker...");
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log("FCM Setup: Service Worker registered!");

    console.log("FCM Setup: Requesting token from Firebase...");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) throw new Error("FCM Setup: Firebase returned an empty token.");
    console.log("FCM Setup: Token successfully retrieved!");

    console.log("FCM Setup: Saving token to Firestore database...");
    await updateDoc(doc(db, "users", uid), { fcmToken: token });
    console.log("FCM Setup: Token successfully saved to database! Everything is working.");

  } catch (error) {
    console.error("FCM Setup Error:", error.message || error);
  }
}