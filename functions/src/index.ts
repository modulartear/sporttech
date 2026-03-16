import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

initializeApp();

const db = getFirestore();
const auth = getAuth();

import { defineSecret } from "firebase-functions/params";

const mercadoPagoToken = defineSecret("MERCADOPAGO_ACCESS_TOKEN");

const getMPClient = () => {
  const token = mercadoPagoToken.value() || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
  }
  return new MercadoPagoConfig({ accessToken: token });
};

function asPaymentStatus(status: string): "pending" | "approved" | "rejected" | "refunded" {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected" || s === "cancelled") return "rejected";
  if (s === "refunded" || s === "charged_back") return "refunded";
  return "pending";
}

export const setAdminClaim = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only existing admins can promote others.
  const callerIsAdmin = request.auth.token.admin === true;
  if (!callerIsAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required");
  }

  const uid = (request.data?.uid ?? "") as string;
  const email = (request.data?.email ?? "") as string;

  if (!uid && !email) {
    throw new HttpsError("invalid-argument", "Provide uid or email");
  }

  const targetUser = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(targetUser.uid, { ...(targetUser.customClaims ?? {}), admin: true });

  await db.collection("user_profiles").doc(targetUser.uid).set(
    {
      role: "admin",
      updated_at: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true, uid: targetUser.uid };
});

export const createMercadoPagoPreference = onCall({ secrets: [mercadoPagoToken], enforceAppCheck: false }, async (request) => {
  try {
    const mpClient = getMPClient();
    const preferenceClient = new Preference(mpClient);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const eventId = (request.data?.eventId ?? "") as string;
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Missing eventId");
    }

    logger.info(`Creating preference for user ${uid} and event ${eventId}`);

    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found");
    }

    const event = eventSnap.data() as any;
    const price = Number(event.price ?? 0);
    const currency = (event.currency ?? "ARS") as string;
    const title = (event.title ?? "Evento") as string;
    const description = (event.description ?? undefined) as string | undefined;

    const purchaseId = `${uid}_${eventId}`;
    const purchaseRef = db.collection("purchases").doc(purchaseId);
    const existing = await purchaseRef.get();

    if (existing.exists && existing.data()?.payment_status === "approved") {
      throw new HttpsError("already-exists", "Purchase already approved");
    }

    await purchaseRef.set(
      {
        user_id: uid,
        event_id: eventId,
        payment_method: "mercadopago",
        payment_status: "pending",
        amount: price,
        currency,
        updated_at: FieldValue.serverTimestamp(),
        created_at: existing.exists ? existing.data()?.created_at : FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const originHeader = request.rawRequest.headers.origin;
    const refererHeader = request.rawRequest.headers.referer;
    let origin = originHeader || (refererHeader ? new URL(refererHeader).origin : "");

    // Fallback if no origin is found (must be absolute for MP)
    if (!origin) {
      origin = "https://sporttech-7f561.web.app"; // Replace with your production domain
    }

    logger.info(`Using origin: ${origin} for purchase ${purchaseId}`);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: eventId,
            title,
            description,
            quantity: 1,
            unit_price: price,
            currency_id: currency,
          },
        ],
        metadata: {
          purchase_id: purchaseId,
          event_id: eventId,
          user_id: uid,
        },
        back_urls: {
          success: `${origin}/payment-status?status=success&eventId=${eventId}`,
          failure: `${origin}/payment-status?status=failure&eventId=${eventId}`,
          pending: `${origin}/payment-status?status=pending&eventId=${eventId}`,
        },
        auto_return: "approved",
      },
    });

    const initPoint = (preference as any).init_point ?? (preference as any).sandbox_init_point;

    return {
      preferenceId: preference.id,
      initPoint,
      purchaseId,
    };
  } catch (error: any) {
    logger.error("Error creating MercadoPago preference", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Unknown error creating preference");
  }
});

export const mercadopagoWebhook = onRequest({ secrets: [mercadoPagoToken] }, async (req, res) => {
  const mpClient = getMPClient();
  const paymentClient = new Payment(mpClient);
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body ?? {};

    const webhookRef = await db.collection("payment_webhooks").add({
      provider: "mercadopago",
      webhook_data: body,
      processed: false,
      created_at: FieldValue.serverTimestamp(),
    });

    const paymentId =
      body?.data?.id ??
      body?.["data.id"] ??
      body?.id ??
      body?.resource ??
      null;

    if (!paymentId) {
      res.status(200).json({ message: "Webhook received without payment id" });
      return;
    }

    const payment = await paymentClient.get({ id: paymentId.toString() });

    const status = asPaymentStatus(payment.status ?? "");
    const metadata = (payment.metadata ?? {}) as any;
    const purchaseId = metadata.purchase_id as string | undefined;

    if (!purchaseId) {
      await webhookRef.update({ processed: true });
      res.status(200).json({ message: "Payment has no purchase metadata" });
      return;
    }

    const amount = Number(payment.transaction_amount ?? 0);
    const currency = (payment.currency_id ?? "ARS") as string;

    const purchaseRef = db.collection("purchases").doc(purchaseId);
    const purchaseSnap = await purchaseRef.get();
    if (!purchaseSnap.exists) {
      await webhookRef.update({ processed: true, purchase_id: purchaseId });
      res.status(200).json({ message: "Purchase not found, webhook recorded" });
      return;
    }

    const purchaseData = purchaseSnap.data() as any;
    await purchaseRef.set(
      {
        payment_status: status,
        transaction_id: payment.id?.toString() ?? null,
        amount,
        currency,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (status === "approved") {
      const tokenId = `${purchaseId}`;
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await db.collection("access_tokens").doc(tokenId).set(
        {
          purchase_id: purchaseId,
          user_id: purchaseData.user_id,
          event_id: purchaseData.event_id,
          token: tokenId,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          validation_count: 0,
          created_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await webhookRef.update({ processed: true, purchase_id: purchaseId });
    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    logger.error("Webhook error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const adminListUsers = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User not authenticated.");
  }

  const profileRef = await db.collection("user_profiles").doc(request.auth.uid).get();
  if (profileRef.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "User is not an admin.");
  }

  try {
    const listUsersResult = await getAuth().listUsers(1000);
    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      creationTime: userRecord.metadata.creationTime,
    }));
    return { users };
  } catch (error: any) {
    logger.error("Error listing users", error);
    throw new HttpsError("internal", error.message || "Failed to list users");
  }
});

