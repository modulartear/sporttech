/**
 * One-off migration helper (optional).
 *
 * Exports a subset of Supabase tables and writes them into Firestore collections.
 *
 * Usage (set env vars first):
 *   node scripts/supabase-to-firestore.mjs
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_APPLICATION_CREDENTIALS  (path to Firebase service account JSON)
 *   FIREBASE_PROJECT_ID
 */

import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";
import fs from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FIREBASE_PROJECT_ID) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / FIREBASE_PROJECT_ID");
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function copyTable(table, mapRowToDoc, docIdForRow) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;

  const batchSize = 400;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = db.batch();
    const chunk = data.slice(i, i + batchSize);
    for (const row of chunk) {
      const docId = docIdForRow(row);
      const ref = db.collection(table).doc(docId);
      batch.set(ref, mapRowToDoc(row), { merge: true });
    }
    await batch.commit();
    console.log(`Copied ${Math.min(i + batchSize, data.length)}/${data.length} from ${table}`);
  }
}

// user_profiles -> user_profiles/{uid}
await copyTable(
  "user_profiles",
  (r) => ({
    full_name: r.full_name,
    phone: r.phone ?? null,
    country: r.country ?? null,
    role: r.role ?? "user",
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }),
  (r) => r.user_id,
);

await copyTable(
  "events",
  (r) => ({
    title: r.title,
    description: r.description ?? null,
    youtube_video_id: r.youtube_video_id,
    youtube_embed_token: r.youtube_embed_token,
    event_date: r.event_date,
    event_type: r.event_type,
    price: r.price,
    currency: r.currency,
    thumbnail_url: r.thumbnail_url ?? null,
    status: r.status,
    max_attendees: r.max_attendees ?? null,
    access_window_hours: r.access_window_hours ?? 0,
    created_by: r.created_by ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }),
  (r) => r.id,
);

// purchases -> purchases/{uid}_{eventId}
await copyTable(
  "purchases",
  (r) => ({
    user_id: r.user_id,
    event_id: r.event_id,
    payment_method: r.payment_method,
    payment_status: r.payment_status,
    amount: r.amount,
    currency: r.currency,
    transaction_id: r.transaction_id ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  }),
  (r) => `${r.user_id}_${r.event_id}`,
);

// access_tokens -> access_tokens/{purchaseId}
await copyTable(
  "access_tokens",
  (r) => ({
    purchase_id: `${r.user_id}_${r.event_id}`,
    user_id: r.user_id,
    event_id: r.event_id,
    token: `${r.user_id}_${r.event_id}`,
    expires_at: r.expires_at,
    is_active: r.is_active ?? true,
    validation_count: r.validation_count ?? 0,
    last_validated_at: r.last_validated_at ?? null,
    created_at: r.created_at ?? null,
  }),
  (r) => `${r.user_id}_${r.event_id}`,
);

console.log("Done.");

