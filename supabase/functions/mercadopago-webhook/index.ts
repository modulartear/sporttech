import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import mercadopago from "npm:mercadopago@2.2.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MP_ACCESS_TOKEN) {
  console.error("Missing required environment variables for MercadoPago webhook function");
}

const mpClient = new mercadopago.MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
});

const paymentClient = new mercadopago.Payment(mpClient);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const contentType = req.headers.get("Content-Type") ?? "application/json";
    const body = contentType.includes("application/json")
      ? JSON.parse(rawBody || "{}")
      : Object.fromEntries(new URLSearchParams(rawBody));

    // Store raw webhook payload
    const { data: webhookRow, error: webhookError } = await supabase
      .from("payment_webhooks")
      .insert({
        provider: "mercadopago",
        webhook_data: body,
        processed: false,
      })
      .select("id")
      .single();

    if (webhookError) {
      console.error("Error inserting webhook", webhookError);
    }

    // Extract payment ID from notification
    const paymentId =
      body?.data?.id ??
      body?.data?.["id"] ??
      body?.["data.id"] ??
      body?.id ??
      body?.resource ??
      null;

    if (!paymentId) {
      console.warn("Webhook without payment id", body);
      return new Response(
        JSON.stringify({ message: "Webhook received without payment id" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fetch payment details from MercadoPago
    const payment = await paymentClient.get({ id: paymentId.toString() });

    const status = (payment.status ?? "").toLowerCase();
    const metadata = (payment.metadata ?? {}) as {
      purchase_id?: string;
      event_id?: string;
      user_id?: string;
    };

    const purchaseId = metadata.purchase_id;

    if (!purchaseId) {
      console.warn("Payment without purchase_id metadata", payment);
      return new Response(
        JSON.stringify({ message: "Payment processed without purchase link" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Map MercadoPago status to our enum
    let paymentStatus: "pending" | "approved" | "rejected" | "refunded" = "pending";

    if (status === "approved") {
      paymentStatus = "approved";
    } else if (status === "rejected" || status === "cancelled") {
      paymentStatus = "rejected";
    } else if (status === "refunded" || status === "charged_back") {
      paymentStatus = "refunded";
    } else {
      paymentStatus = "pending";
    }

    const amount = Number(payment.transaction_amount ?? 0);
    const currency = payment.currency_id ?? "ARS";

    // Update purchase with payment status and transaction info
    const { data: updatedPurchase, error: purchaseError } = await supabase
      .from("purchases")
      .update({
        payment_status: paymentStatus,
        amount,
        currency,
        transaction_id: payment.id?.toString() ?? null,
      })
      .eq("id", purchaseId)
      .select("id, user_id, event_id, payment_status")
      .single();

    if (purchaseError) {
      console.error("Error updating purchase from webhook", purchaseError);
    }

    // On approved payments, create access token for the user/event
    if (updatedPurchase && updatedPurchase.payment_status === "approved") {
      const userId = updatedPurchase.user_id;
      const eventId = updatedPurchase.event_id;

      const token = crypto.randomUUID();

      // Example: 48 hours access window by default
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { error: accessError } = await supabase.from("access_tokens").insert({
        purchase_id: updatedPurchase.id,
        user_id: userId,
        event_id: eventId,
        token,
        expires_at: expiresAt.toISOString(),
      });

      if (accessError) {
        console.error("Error creating access token", accessError);
      }
    }

    if (webhookRow) {
      const { error: markProcessedError } = await supabase
        .from("payment_webhooks")
        .update({ processed: true, purchase_id: purchaseId })
        .eq("id", webhookRow.id);

      if (markProcessedError) {
        console.error("Error marking webhook as processed", markProcessedError);
      }
    }

    return new Response(JSON.stringify({ message: "Webhook processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in mercadopago-webhook", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

