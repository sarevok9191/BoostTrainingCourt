/**
 * Cloud Functions — Boost Training Court
 *
 * ⚠️  REQUIRES FIREBASE BLAZE (PAY-AS-YOU-GO) PLAN ⚠️
 *
 * Deploy with:
 *   npx firebase deploy --only functions
 *
 * IMPORTANT — credit deduction:
 *   When you deploy Feature 10 (these functions), remove the credit
 *   deduction from the frontend handleMarkComplete() transaction so
 *   credits are only deducted once (here in the Cloud Function).
 *   The frontend should then ONLY update session status to "completed".
 */

const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError }                   = require("firebase-functions/v2/https");
const { initializeApp }                        = require("firebase-admin/app");
const { getAuth }                              = require("firebase-admin/auth");
const { getFirestore, FieldValue }             = require("firebase-admin/firestore");
const { getMessaging }                         = require("firebase-admin/messaging");

initializeApp();

const db        = getFirestore();
const VALID_ROLES = ["superadmin", "trainer", "trainee"];

/* ─────────────────────────────────────────────────────────────────
   onSessionCompleted
   Triggers when a session document is updated.
   • If status changed to "completed":
     1. Deduct 1 credit from trainee (atomic transaction)
     2. Find trainee's next upcoming session
     3. Send push notification via FCM
     4. Send low-credit warning if credits drop to ≤ 2
───────────────────────────────────────────────────────────────── */
exports.onSessionCompleted = onDocumentUpdated("sessions/{sessionId}", async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  // Only react to the specific transition non-completed → completed
  if (before.status === "completed" || after.status !== "completed") return;

  const traineeId = after.traineeId;
  if (!traineeId) return;

  // ── 1. Deduct 1 credit atomically ────────────────────────────────
  const traineeRef = db.doc(`users/${traineeId}`);
  let finalCredits = 0;

  await db.runTransaction(async (tx) => {
    const snap    = await tx.get(traineeRef);
    if (!snap.exists) throw new Error("Trainee not found");
    const current = snap.data().credits ?? 0;
    finalCredits  = Math.max(0, current - 1);
    tx.update(traineeRef, { credits: finalCredits });
  });

  // ── 2. Find next upcoming session ────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const nextQuery = await db.collection("sessions")
    .where("traineeId", "==", traineeId)
    .where("status", "==", "scheduled")
    .where("date", ">=", today)
    .orderBy("date", "asc")
    .orderBy("time", "asc")
    .limit(1)
    .get();

  const nextSession  = nextQuery.empty ? null : nextQuery.docs[0].data();
  const nextSessionStr = nextSession
    ? `${nextSession.date} at ${nextSession.time}`
    : "not scheduled yet";

  // ── 3. Fetch trainee's FCM token ─────────────────────────────────
  const traineeSnap = await traineeRef.get();
  const fcmToken    = traineeSnap.data()?.fcmToken;
  if (!fcmToken) return; // No token — skip notification

  // ── 4. Build notification payload ───────────────────────────────
  const exerciseSummary = after.exerciseBlocks?.length
    ? after.exerciseBlocks.map((b) => b.movement).filter(Boolean).join(", ")
    : "";

  const messaging = getMessaging();

  // Session complete notification
  try {
    await messaging.send({
      token: fcmToken,
      notification: {
        title: "Session complete 🎉",
        body:  `Great work! You have ${finalCredits} credit${finalCredits !== 1 ? "s" : ""} remaining. Next session: ${nextSessionStr}`,
      },
      data: {
        sessionId:   event.params.sessionId,
        date:        after.date || "",
        exercises:   exerciseSummary,
        credits:     String(finalCredits),
        nextSession: nextSessionStr,
      },
    });
  } catch (err) {
    console.error("FCM send failed:", err.message);
  }

  // ── 5. Low-credit warning (≤ 2) ──────────────────────────────────
  if (finalCredits <= 2) {
    try {
      await messaging.send({
        token: fcmToken,
        notification: {
          title: "⚠️ Low Credits",
          body:  `You only have ${finalCredits} credit${finalCredits !== 1 ? "s" : ""} left. Ask your trainer to top up before your next session.`,
        },
        data: { type: "low_credit_warning", credits: String(finalCredits) },
      });
    } catch (err) {
      console.error("Low-credit FCM send failed:", err.message);
    }
  }

  console.log(`Session ${event.params.sessionId} completed — trainee ${traineeId} now has ${finalCredits} credits.`);
});

/* ─────────────────────────────────────────────────────────────────
   createUser (kept from before — superadmin/trainer user creation)
───────────────────────────────────────────────────────────────── */
exports.createUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (!callerSnap.exists) throw new HttpsError("not-found", "Caller profile not found.");

  const callerRole = callerSnap.data().role;
  const { email, password, displayName = "", role, credits } = request.data;

  if (!email || !password || !role)
    throw new HttpsError("invalid-argument", "email, password and role are required.");
  if (!VALID_ROLES.includes(role))
    throw new HttpsError("invalid-argument", `Invalid role.`);
  if (callerRole === "trainer" && role !== "trainee")
    throw new HttpsError("permission-denied", "Trainers can only create trainees.");
  if (callerRole !== "superadmin" && callerRole !== "trainer")
    throw new HttpsError("permission-denied", "Insufficient permissions.");

  let userRecord;
  try {
    userRecord = await getAuth().createUser({ email, password, displayName });
  } catch (err) {
    if (err.code === "auth/email-already-exists")
      throw new HttpsError("already-exists", "Email already in use.");
    throw new HttpsError("internal", err.message);
  }

  const docData = {
    uid: userRecord.uid, email, displayName, role,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  };
  if (role === "trainee") {
    docData.trainerId        = callerRole === "trainer" ? request.auth.uid : (request.data.trainerId || null);
    docData.credits          = typeof credits === "number" ? credits : 0;
    docData.declaredPassword = password;
  }

  await db.doc(`users/${userRecord.uid}`).set(docData);
  return { uid: userRecord.uid };
});

/* ─────────────────────────────────────────────────────────────────
   deleteUser — superadmin/trainer removes a user
───────────────────────────────────────────────────────────────── */
exports.deleteUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (!callerSnap.exists) throw new HttpsError("not-found", "Caller not found.");

  const callerRole = callerSnap.data().role;
  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "uid required.");

  if (callerRole === "trainer") {
    const t = (await db.doc(`users/${uid}`).get()).data();
    if (!t || t.role !== "trainee" || t.trainerId !== request.auth.uid)
      throw new HttpsError("permission-denied", "Can only remove your own trainees.");
  } else if (callerRole !== "superadmin") {
    throw new HttpsError("permission-denied", "Insufficient permissions.");
  }

  await getAuth().deleteUser(uid);
  const batch = db.batch();
  batch.delete(db.doc(`users/${uid}`));
  const sessions = await db.collection("sessions").where("traineeId","==",uid).get();
  sessions.docs.forEach((d) => batch.delete(d.ref));
  const progress = await db.collection("progressEntries").where("traineeId","==",uid).get();
  progress.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return { message: "User deleted." };
});

/* ─────────────────────────────────────────────────────────────────
   onUserDocCreated — audit log
───────────────────────────────────────────────────────────────── */
exports.onUserDocCreated = onDocumentCreated("users/{uid}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await db.collection("audit_logs").add({
    action:      "user_created",
    targetUid:   data.uid,
    targetEmail: data.email,
    role:        data.role,
    timestamp:   FieldValue.serverTimestamp(),
  });
});
