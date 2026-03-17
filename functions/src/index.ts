import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();
const auth = getAuth();

import { defineSecret } from "firebase-functions/params";

const mercadoPagoToken = defineSecret("MERCADOPAGO_ACCESS_TOKEN");

const getMPToken = () => {
  const val = (mercadoPagoToken.value() || process.env.MERCADOPAGO_ACCESS_TOKEN || "");
  // Clean whitespace and newlines but preserve the token structure
  return val.toString().trim();
};

function asPaymentStatus(status: string): "pending" | "approved" | "rejected" | "refunded" {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected" || s === "cancelled") return "rejected";
  if (s === "refunded" || s === "charged_back") return "refunded";
  return "pending";
}

export const createMercadoPagoPreference = onCall({ secrets: [mercadoPagoToken], enforceAppCheck: false }, async (request) => {
  try {
    const token = getMPToken();
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    const uid = request.auth.uid;
    const eventId = (request.data?.eventId ?? "") as string;
    if (!eventId) throw new HttpsError("invalid-argument", "Missing eventId");

    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found");

    const event = eventSnap.data() as any;
    const price = Number(event.price ?? 0);
    const currency = (event.currency ?? "ARS") as string;
    const title = (event.title ?? "Evento") as string;

    const purchaseId = `${uid}_${eventId}`;
    const purchaseRef = db.collection("purchases").doc(purchaseId);
    
    const existingSnap = await purchaseRef.get();
    if (existingSnap.exists && existingSnap.data()?.payment_status === "approved") {
      throw new HttpsError("already-exists", "Purchase already approved");
    }

    await purchaseRef.set({
      user_id: uid,
      event_id: eventId,
      payment_method: "mercadopago",
      payment_status: "pending",
      amount: price,
      currency,
      updated_at: FieldValue.serverTimestamp(),
      created_at: existingSnap.exists ? existingSnap.data()?.created_at : FieldValue.serverTimestamp(),
    }, { merge: true });

    const origin = "https://sporttechros.vercel.app";
    
    // Use Fetch directly to avoid any middle-layer header issues
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ id: eventId, title, quantity: 1, unit_price: price, currency_id: currency }],
        metadata: { purchase_id: purchaseId, user_id: uid, event_id: eventId },
        back_urls: {
          success: `${origin}/payment/success`,
          failure: `${origin}/payment/failure`,
          pending: `${origin}/payment/pending`,
        },
        auto_return: "approved",
        notification_url: "https://mercadopagowebhook-2m5lp3zmga-uc.a.run.app"
      })
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      logger.error("MP API Detailed Error:", { status: mpResponse.status, body: errorText });
      throw new Error(`MercadoPago API error (${mpResponse.status})`);
    }

    const data = await mpResponse.json() as any;
    return { preferenceId: data.id, initPoint: data.init_point, purchaseId };

  } catch (error: any) {
    logger.error("Function Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Unknown error");
  }
});

export const mercadopagoWebhook = onRequest({ secrets: [mercadoPagoToken] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const token = getMPToken();
    const body = req.body ?? {};
    const paymentId = body?.data?.id ?? body?.id;

    if (!paymentId) {
      res.status(200).json({ message: "Webhook received without payment id" });
      return;
    }

    // Process payment with manual fetch
    const pResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!pResponse.ok) throw new Error(`MP Payment API error: ${pResponse.status}`);
    const payment = await pResponse.json() as any;

    const status = asPaymentStatus(payment.status ?? "");
    const purchaseId = payment.metadata?.purchase_id;

    if (!purchaseId) {
      res.status(200).json({ message: "Payment has no purchase metadata" });
      return;
    }

    const purchaseRef = db.collection("purchases").doc(purchaseId);
    const purchaseSnap = await purchaseRef.get();
    if (purchaseSnap.exists) {
      const purchaseData = purchaseSnap.data() as any;
      await purchaseRef.set({
        payment_status: status,
        transaction_id: paymentId.toString(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });

      if (status === "approved") {
        await db.collection("access_tokens").doc(purchaseId).set({
          purchase_id: purchaseId,
          user_id: purchaseData.user_id,
          event_id: purchaseData.event_id,
          is_active: true,
          created_at: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    logger.error("Webhook error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const adminListUsers = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User not authenticated.");
  
  const profileSnap = await db.collection("user_profiles").doc(request.auth.uid).get();
  if (profileSnap.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin role required.");

  try {
    const listUsersResult = await getAuth().listUsers(1000);
    const users = listUsersResult.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      creationTime: u.metadata.creationTime,
    }));
    return { users };
  } catch (error: any) {
    throw new HttpsError("internal", "Failed to list users");
  }
});

export const setAdminClaim = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth?.token.admin) throw new HttpsError("permission-denied", "Admin privileges required");

  const uid = request.data?.uid;
  if (!uid) throw new HttpsError("invalid-argument", "Provide uid");

  await auth.setCustomUserClaims(uid, { admin: true });
  await db.collection("user_profiles").doc(uid).update({ role: "admin" });

  return { ok: true };
});
