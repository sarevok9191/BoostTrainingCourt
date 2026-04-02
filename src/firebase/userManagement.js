/**
 * userManagement.js
 *
 * Creates users via the "secondary app" pattern so the current admin/trainer
 * session is never interrupted.
 *
 * Deletes users by calling the deployed `deleteUser` Cloud Function which
 * removes the Firebase Auth account AND all related Firestore data atomically.
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "./config";
import app from "./config";

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
  const app_     = existing ?? initializeApp(firebaseConfig, "secondary");
  return getAuth(app_);
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
 * deleteUserAccount
 * Calls the deployed `deleteUser` Cloud Function which:
 *   1. Deletes the Firebase Auth account
 *   2. Deletes the Firestore user doc
 *   3. Deletes all related sessions, progress entries and credit logs
 */
export async function deleteUserAccount(uid) {
  const functions  = getFunctions(app);
  const deleteUser = httpsCallable(functions, "deleteUser");
  await deleteUser({ uid });
}
