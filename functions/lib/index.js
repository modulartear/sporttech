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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminClaim = exports.adminListUsers = exports.mercadopagoWebhook = exports.createMercadoPagoPreference = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const params_1 = require("firebase-functions/params");
const mercadoPagoToken = (0, params_1.defineSecret)("MERCADOPAGO_ACCESS_TOKEN");
const getMPToken = () => {
    const val = (mercadoPagoToken.value() || process.env.MERCADOPAGO_ACCESS_TOKEN || "");
    // Clean whitespace and newlines but preserve the token structure
    return val.toString().trim();
};
function asPaymentStatus(status) {
    const s = (status !== null && status !== void 0 ? status : "").toLowerCase();
    if (s === "approved")
        return "approved";
    if (s === "rejected" || s === "cancelled")
        return "rejected";
    if (s === "refunded" || s === "charged_back")
        return "refunded";
    return "pending";
}
exports.createMercadoPagoPreference = (0, https_1.onCall)({ secrets: [mercadoPagoToken], enforceAppCheck: false }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const token = getMPToken();
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
        const uid = request.auth.uid;
        const eventId = ((_b = (_a = request.data) === null || _a === void 0 ? void 0 : _a.eventId) !== null && _b !== void 0 ? _b : "");
        if (!eventId)
            throw new https_1.HttpsError("invalid-argument", "Missing eventId");
        const eventSnap = await db.collection("events").doc(eventId).get();
        if (!eventSnap.exists)
            throw new https_1.HttpsError("not-found", "Event not found");
        const event = eventSnap.data();
        const price = Number((_c = event.price) !== null && _c !== void 0 ? _c : 0);
        const currency = ((_d = event.currency) !== null && _d !== void 0 ? _d : "ARS");
        const title = ((_e = event.title) !== null && _e !== void 0 ? _e : "Evento");
        const purchaseId = `${uid}_${eventId}`;
        const purchaseRef = db.collection("purchases").doc(purchaseId);
        const existingSnap = await purchaseRef.get();
        if (existingSnap.exists && ((_f = existingSnap.data()) === null || _f === void 0 ? void 0 : _f.payment_status) === "approved") {
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
            created_at: existingSnap.exists ? (_g = existingSnap.data()) === null || _g === void 0 ? void 0 : _g.created_at : firestore_1.FieldValue.serverTimestamp(),
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
        const data = await mpResponse.json();
        return { preferenceId: data.id, initPoint: data.init_point, purchaseId };
    }
    catch (error) {
        logger.error("Function Error:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Unknown error");
    }
});
exports.mercadopagoWebhook = (0, https_1.onRequest)({ secrets: [mercadoPagoToken] }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const token = getMPToken();
        const body = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const paymentId = (_c = (_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : body === null || body === void 0 ? void 0 : body.id;
        if (!paymentId) {
            res.status(200).json({ message: "Webhook received without payment id" });
            return;
        }
        // Process payment with manual fetch
        const pResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!pResponse.ok)
            throw new Error(`MP Payment API error: ${pResponse.status}`);
        const payment = await pResponse.json();
        const status = asPaymentStatus((_d = payment.status) !== null && _d !== void 0 ? _d : "");
        const purchaseId = (_e = payment.metadata) === null || _e === void 0 ? void 0 : _e.purchase_id;
        if (!purchaseId) {
            res.status(200).json({ message: "Payment has no purchase metadata" });
            return;
        }
        const purchaseRef = db.collection("purchases").doc(purchaseId);
        const purchaseSnap = await purchaseRef.get();
        if (purchaseSnap.exists) {
            const purchaseData = purchaseSnap.data();
            await purchaseRef.set({
                payment_status: status,
                transaction_id: paymentId.toString(),
                updated_at: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            if (status === "approved") {
                await db.collection("access_tokens").doc(purchaseId).set({
                    purchase_id: purchaseId,
                    user_id: purchaseData.user_id,
                    event_id: purchaseData.event_id,
                    is_active: true,
                    created_at: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        }
        res.status(200).json({ message: "Webhook processed" });
    }
    catch (error) {
        logger.error("Webhook error", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminListUsers = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "User not authenticated.");
    const profileSnap = await db.collection("user_profiles").doc(request.auth.uid).get();
    if (((_a = profileSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin")
        throw new https_1.HttpsError("permission-denied", "Admin role required.");
    try {
        const listUsersResult = await (0, auth_1.getAuth)().listUsers(1000);
        const users = listUsersResult.users.map((u) => ({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            creationTime: u.metadata.creationTime,
        }));
        return { users };
    }
    catch (error) {
        throw new https_1.HttpsError("internal", "Failed to list users");
    }
});
exports.setAdminClaim = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    var _a, _b;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.admin))
        throw new https_1.HttpsError("permission-denied", "Admin privileges required");
    const uid = (_b = request.data) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid)
        throw new https_1.HttpsError("invalid-argument", "Provide uid");
    await auth.setCustomUserClaims(uid, { admin: true });
    await db.collection("user_profiles").doc(uid).update({ role: "admin" });
    return { ok: true };
});
//# sourceMappingURL=index.js.map