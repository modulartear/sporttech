/**
 * Make a Firebase user admin (custom claim + Firestore role).
 *
 * Usage:
 *   node scripts/make-admin.mjs --projectId YOUR_FIREBASE_PROJECT_ID --email user@mail.com
 *   node scripts/make-admin.mjs --projectId YOUR_FIREBASE_PROJECT_ID --uid UID
 *
 * Requires:
 *   - A service account json and GOOGLE_APPLICATION_CREDENTIALS env var pointing to it
 *     e.g. set GOOGLE_APPLICATION_CREDENTIALS=C:\path\serviceAccount.json
 */

import admin from "firebase-admin";

function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const projectId = arg("--projectId");
const email = arg("--email");
const uid = arg("--uid");

if (!projectId) {
  throw new Error("Missing --projectId");
}
if (!email && !uid) {
  throw new Error("Provide --email or --uid");
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

const auth = admin.auth();
const db = admin.firestore();

const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });

await db.collection("user_profiles").doc(user.uid).set(
  {
    role: "admin",
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log(`OK: ${user.uid} is now admin.`);
console.log("IMPORTANT: user must sign out/in to refresh the ID token (or wait ~1h).");

