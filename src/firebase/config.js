import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            "AIzaSyDy3rNgQM1BKlq_72BHWL9X0D3iu8W0oDg",
  authDomain:        "boosttrainingcourt-29cb6.firebaseapp.com",
  projectId:         "boosttrainingcourt-29cb6",
  storageBucket:     "boosttrainingcourt-29cb6.firebasestorage.app",
  messagingSenderId: "481428464812",
  appId:             "1:481428464812:web:bfc23e06c50113342f2b09",
  measurementId:     "G-Q7HRS8R9Y6",
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth      = getAuth(app);
export const db        = getFirestore(app);

// FCM is only available in browsers that support service workers.
// getMessagingInstance() returns null on unsupported browsers (e.g. Safari < 16, SSR).
let _messaging = null;
export async function getMessagingInstance() {
  if (_messaging) return _messaging;
  try {
    const supported = await isSupported();
    if (supported) {
      _messaging = getMessaging(app);
      return _messaging;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default app;
