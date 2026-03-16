import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import mercadopago from "npm:mercadopago@2.2.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !MP_ACCESS_TOKEN) {
  console.error("Missing required environment variables for MercadoPago preference function");
}

const mpClient = new mercadopago.MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
});

const preferenceClient = new mercadopago.Preference(mpClient);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as { eventId?: string } | null;
    const eventId = body?.eventId;

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Missing eventId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Authenticated Supabase client using the caller's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Fetch event to get price, currency and title
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, description, price, currency")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Error fetching event", eventError);
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create or reuse a pending purchase for this user + event
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Ensure there is at most one pending purchase per (user, event)
    const { data: existingPurchase, error: existingError } = await serviceClient
      .from("purchases")
      .select("id, payment_status")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .in("payment_status", ["pending", "approved"])
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing purchase", existingError);
    }

    if (existingPurchase && existingPurchase.payment_status === "approved") {
      return new Response(
        JSON.stringify({ error: "You already have an approved purchase for this event" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let purchaseId: string;

    if (existingPurchase && existingPurchase.payment_status === "pending") {
      purchaseId = existingPurchase.id;
    } else {
      const { data: newPurchase, error: purchaseError } = await serviceClient
        .from("purchases")
        .insert({
          user_id: userId,
          event_id: event.id,
          payment_method: "mercadopago",
          payment_status: "pending",
          amount: event.price,
          currency: event.currency,
        })
        .select("id")
        .single();

      if (purchaseError || !newPurchase) {
        console.error("Error creating purchase", purchaseError);
        return new Response(
          JSON.stringify({ error: "Failed to create purchase" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      purchaseId = newPurchase.id;
    }

    // Create MercadoPago preference
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: event.id,
            title: event.title,
            description: event.description ?? undefined,
            quantity: 1,
            unit_price: Number(event.price),
            currency_id: event.currency,
          },
        ],
        metadata: {
          purchase_id: purchaseId,
          event_id: event.id,
          user_id: userId,
        },
        back_urls: {
          success: `${new URL(req.url).origin}/payment/success`,
          failure: `${new URL(req.url).origin}/payment/failure`,
          pending: `${new URL(req.url).origin}/payment/pending`,
        },
        auto_return: "approved",
      },
    });

    return new Response(
      JSON.stringify({
        preferenceId: preference.id,
        initPoint: (preference as any).init_point ?? (preference as any).sandbox_init_point,
        purchaseId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error in mercadopago-create-preference", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

