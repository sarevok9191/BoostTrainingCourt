/**
 * userManagement.js
 *
 * Creates and deletes user accounts entirely from the client using the
 * "secondary app" pattern — a second Firebase App instance is used to
 * call createUserWithEmailAndPassword so the current admin/trainer
 * session is never interrupted.
 *
 * No Cloud Functions required → compatible with the Spark (free) plan.
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  doc, setDoc, collection, query, where,
  getDocs, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./config";

const firebaseConfig = {
  apiKey:            "AIzaSyDy3rNgQM1BKlq_72BHWL9X0D3iu8W0oDg",
  authDomain:        "boosttrainingcourt-29cb6.firebaseapp.com",
  projectId:         "boosttrainingcourt-29cb6",
  storageBucket:     "boosttrainingcourt-29cb6.firebasestorage.app",
  messagingSenderId: "481428464812",
  appId:             "1:481428464812:web:bfc23e06c50113342f2b09",
};

function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === "secondary");
  const app      = existing ?? initializeApp(firebaseConfig, "secondary");
  return getAuth(app);
}

/**
 * createUserAccount
 * @param {{ email, password, displayName, role, trainerId?, credits? }} opts
 * @returns {Promise<string>} the new user's UID
 */
export async function createUserAccount({
  email,
  password,
  displayName = "",
  role,
  trainerId  = null,
  credits    = 0,
}) {
  const secondAuth = getSecondaryAuth();
  let credential   = null;

  try {
    credential = await createUserWithEmailAndPassword(secondAuth, email, password);
    await updateProfile(credential.user, { displayName });

    const docData = {
      uid:         credential.user.uid,
      email,
      displayName,
      role,
      createdAt:   serverTimestamp(),
    };

    if (role === "trainee") {
      docData.trainerId        = trainerId;
      docData.credits          = typeof credits === "number" ? credits : 0;
      // Store the password the trainer typed so they can look it up later
      docData.declaredPassword = password;
    }

    await setDoc(doc(db, "users", credential.user.uid), docData);
    return credential.user.uid;
  } catch (err) {
    if (credential?.user) await credential.user.delete().catch(() => {});
    throw err;
  } finally {
    await signOut(secondAuth).catch(() => {});
  }
}

/**
 * deleteUserAccount — removes Firestore doc + all related sessions/progress.
 * Auth account stays (Admin SDK not available on Spark).
 */
export async function deleteUserAccount(uid) {
  const batch = writeBatch(db);

  const [asTrainee, asTrainer, progressEntries, creditLogs] = await Promise.all([
    getDocs(query(collection(db, "sessions"),        where("traineeId", "==", uid))),
    getDocs(query(collection(db, "sessions"),        where("trainerId", "==", uid))),
    getDocs(query(collection(db, "progressEntries"), where("traineeId", "==", uid))),
    getDocs(query(collection(db, "creditLogs"),      where("traineeId", "==", uid))),
  ]);

  asTrainee.docs.forEach((d) => batch.delete(d.ref));
  asTrainer.docs.forEach((d) => batch.delete(d.ref));
  progressEntries.docs.forEach((d) => batch.delete(d.ref));
  creditLogs.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "users", uid));

  await batch.commit();
}
