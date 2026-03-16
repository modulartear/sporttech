"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminListUsers = exports.mercadopagoWebhook = exports.createMercadoPagoPreference = exports.setAdminClaim = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const mercadopago_1 = require("mercadopago");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const params_1 = require("firebase-functions/params");
const mercadoPagoToken = (0, params_1.defineSecret)("MERCADOPAGO_ACCESS_TOKEN");
const getMPClient = () => {
    const token = mercadoPagoToken.value() || process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
        throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
    }
    return new mercadopago_1.MercadoPagoConfig({ accessToken: token });
};
function asPaymentStatus(status) {
    const s = (status ?? "").toLowerCase();
    if (s === "approved")
        return "approved";
    if (s === "rejected" || s === "cancelled")
        return "rejected";
    if (s === "refunded" || s === "charged_back")
        return "refunded";
    return "pending";
}
exports.setAdminClaim = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Only existing admins can promote others.
    const callerIsAdmin = request.auth.token.admin === true;
    if (!callerIsAdmin) {
        throw new https_1.HttpsError("permission-denied", "Admin privileges required");
    }
    const uid = (request.data?.uid ?? "");
    const email = (request.data?.email ?? "");
    if (!uid && !email) {
        throw new https_1.HttpsError("invalid-argument", "Provide uid or email");
    }
    const targetUser = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(targetUser.uid, { ...(targetUser.customClaims ?? {}), admin: true });
    await db.collection("user_profiles").doc(targetUser.uid).set({
        role: "admin",
        updated_at: firestore_1.FieldValue.serverTimestamp(),
        created_at: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true, uid: targetUser.uid };
});
exports.createMercadoPagoPreference = (0, https_1.onCall)({ secrets: [mercadoPagoToken], enforceAppCheck: false }, async (request) => {
    try {
        const mpClient = getMPClient();
        const preferenceClient = new mercadopago_1.Preference(mpClient);
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
        }
        const uid = request.auth.uid;
        const eventId = (request.data?.eventId ?? "");
        if (!eventId) {
            throw new https_1.HttpsError("invalid-argument", "Missing eventId");
        }
        logger.info(`Creating preference for user ${uid} and event ${eventId}`);
        const eventSnap = await db.collection("events").doc(eventId).get();
        if (!eventSnap.exists) {
            throw new https_1.HttpsError("not-found", "Event not found");
        }
        const event = eventSnap.data();
        const price = Number(event.price ?? 0);
        const currency = (event.currency ?? "ARS");
        const title = (event.title ?? "Evento");
        const description = (event.description ?? undefined);
        const purchaseId = `${uid}_${eventId}`;
        const purchaseRef = db.collection("purchases").doc(purchaseId);
        const existing = await purchaseRef.get();
        if (existing.exists && existing.data()?.payment_status === "approved") {
            throw new https_1.HttpsError("already-exists", "Purchase already approved");
        }
        await purchaseRef.set({
            user_id: uid,
            event_id: eventId,
            payment_method: "mercadopago",
            payment_status: "pending",
            amount: price,
            currency,
            updated_at: firestore_1.FieldValue.serverTimestamp(),
            created_at: existing.exists ? existing.data()?.created_at : firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
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
        const initPoint = preference.init_point ?? preference.sandbox_init_point;
        return {
            preferenceId: preference.id,
            initPoint,
            purchaseId,
        };
    }
    catch (error) {
        logger.error("Error creating MercadoPago preference", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Unknown error creating preference");
    }
});
exports.mercadopagoWebhook = (0, https_1.onRequest)({ secrets: [mercadoPagoToken] }, async (req, res) => {
    const mpClient = getMPClient();
    const paymentClient = new mercadopago_1.Payment(mpClient);
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
            created_at: firestore_1.FieldValue.serverTimestamp(),
        });
        const paymentId = body?.data?.id ??
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
        const metadata = (payment.metadata ?? {});
        const purchaseId = metadata.purchase_id;
        if (!purchaseId) {
            await webhookRef.update({ processed: true });
            res.status(200).json({ message: "Payment has no purchase metadata" });
            return;
        }
        const amount = Number(payment.transaction_amount ?? 0);
        const currency = (payment.currency_id ?? "ARS");
        const purchaseRef = db.collection("purchases").doc(purchaseId);
        const purchaseSnap = await purchaseRef.get();
        if (!purchaseSnap.exists) {
            await webhookRef.update({ processed: true, purchase_id: purchaseId });
            res.status(200).json({ message: "Purchase not found, webhook recorded" });
            return;
        }
        const purchaseData = purchaseSnap.data();
        await purchaseRef.set({
            payment_status: status,
            transaction_id: payment.id?.toString() ?? null,
            amount,
            currency,
            updated_at: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        if (status === "approved") {
            const tokenId = `${purchaseId}`;
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
            await db.collection("access_tokens").doc(tokenId).set({
                purchase_id: purchaseId,
                user_id: purchaseData.user_id,
                event_id: purchaseData.event_id,
                token: tokenId,
                expires_at: expiresAt.toISOString(),
                is_active: true,
                validation_count: 0,
                created_at: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        await webhookRef.update({ processed: true, purchase_id: purchaseId });
        res.status(200).json({ message: "Webhook processed" });
    }
    catch (error) {
        logger.error("Webhook error", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminListUsers = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User not authenticated.");
    }
    const profileRef = await db.collection("user_profiles").doc(request.auth.uid).get();
    if (profileRef.data()?.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "User is not an admin.");
    }
    try {
        const listUsersResult = await (0, auth_1.getAuth)().listUsers(1000);
        const users = listUsersResult.users.map((userRecord) => ({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            creationTime: userRecord.metadata.creationTime,
        }));
        return { users };
    }
    catch (error) {
        logger.error("Error listing users", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to list users");
    }
});
