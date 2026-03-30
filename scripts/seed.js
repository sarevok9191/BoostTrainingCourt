#!/usr/bin/env node
/**
 * Seed script — creates 3 starter users in Firebase Auth + Firestore.
 *
 * Usage (production Firebase):
 *   node scripts/seed.js
 *
 * Usage (local emulators):
 *   USE_EMULATOR=true node scripts/seed.js
 *
 * Firestore rule required: allow create: if isSignedIn() && request.auth.uid == uid;
 */

const API_KEY    = "AIzaSyDy3rNgQM1BKlq_72BHWL9X0D3iu8W0oDg";
const PROJECT_ID = "boosttrainingcourt-29cb6";
const USE_EMU    = process.env.USE_EMULATOR === "true";

const AUTH_BASE = USE_EMU
  ? `http://localhost:9099/identitytoolkit.googleapis.com/v1`
  : `https://identitytoolkit.googleapis.com/v1`;

const FS_BASE = USE_EMU
  ? `http://localhost:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const USERS = [
  {
    email:       "admin@gym.com",
    password:    "Admin123!",
    displayName: "Super Admin",
    role:        "superadmin",
  },
  {
    email:       "trainer@gym.com",
    password:    "Trainer123!",
    displayName: "Demo Trainer",
    role:        "trainer",
  },
  {
    email:       "trainee@gym.com",
    password:    "Trainee123!",
    displayName: "Demo Trainee",
    role:        "trainee",
    credits:     10,
  },
];

async function signUp(email, password) {
  const res = await fetch(`${AUTH_BASE}/accounts:signUp?key=${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { uid: data.localId, idToken: data.idToken };
}

async function signIn(email, password) {
  const res = await fetch(`${AUTH_BASE}/accounts:signInWithPassword?key=${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { uid: data.localId, idToken: data.idToken };
}

async function docExists(idToken, uid) {
  const authHeader = USE_EMU
    ? { "Authorization": `Bearer owner` }
    : { "Authorization": `Bearer ${idToken}` };
  const res  = await fetch(`${FS_BASE}/users/${uid}`, { headers: authHeader });
  const json = await res.json();
  return res.ok && !json.error;
}

async function updateDisplayName(idToken, displayName) {
  const res = await fetch(`${AUTH_BASE}/accounts:update?key=${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ idToken, displayName, returnSecureToken: false }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string")  fields[k] = { stringValue: v };
    if (typeof v === "number")  fields[k] = { integerValue: String(v) };
    if (typeof v === "boolean") fields[k] = { booleanValue: v };
  }
  return fields;
}

async function writeDoc(idToken, uid, data) {
  const authHeader = USE_EMU
    ? { "Authorization": `Bearer owner` }        // emulator accepts any token
    : { "Authorization": `Bearer ${idToken}` };

  const res = await fetch(`${FS_BASE}/users/${uid}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader },
    body:    JSON.stringify({ fields: toFields(data) }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message + " | " + JSON.stringify(json.error));
  return json;
}

async function main() {
  console.log(`\nSeeding Firebase${USE_EMU ? " EMULATOR" : " (production)"}...\n`);

  for (const user of USERS) {
    process.stdout.write(`→ ${user.role.padEnd(12)} ${user.email}  `);
    try {
      let uid, idToken, isNew = false;

      // Try sign-up first; if account exists, sign in instead
      try {
        ({ uid, idToken } = await signUp(user.email, user.password));
        await updateDisplayName(idToken, user.displayName);
        isNew = true;
      } catch (authErr) {
        if (!authErr.message.includes("EMAIL_EXISTS")) throw authErr;
        ({ uid, idToken } = await signIn(user.email, user.password));
      }

      // Write Firestore doc if it doesn't already exist
      const exists = await docExists(idToken, uid);
      if (exists) {
        console.log(`✓  uid=${uid}${isNew ? "" : " (auth existed, doc already present)"}`);
      } else {
        const docData = {
          uid,
          email:       user.email,
          displayName: user.displayName,
          role:        user.role,
          createdAt:   new Date().toISOString(),
        };
        if (user.credits !== undefined) docData.credits = user.credits;
        await writeDoc(idToken, uid, docData);
        console.log(`✓  uid=${uid}${isNew ? "" : " (auth existed, doc written)"}`);
      }
    } catch (err) {
      console.log(`✗  ${err.message}`);
    }
  }

  console.log("\nDone.\n");
}

main().catch(console.error);
