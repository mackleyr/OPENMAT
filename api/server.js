require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------- Stripe ---------- */
if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
  console.warn("[boot] Missing or invalid STRIPE_SECRET_KEY");
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/* ---------- Supabase (server/admin) ---------- */
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.PROJECT_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[boot] Supabase admin env missing. URL:",
    !!SUPABASE_URL,
    "SERVICE_ROLE:",
    !!SUPABASE_SERVICE_ROLE_KEY
  );
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------- Boot logs ---------- */
console.log("[boot] NODE_ENV:", process.env.NODE_ENV);
console.log("[boot] Stripe key starts:", (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…");
console.log("[boot] Webhook secret present?", !!process.env.STRIPE_WEBHOOK_SECRET);
console.log("[boot] Supabase URL present?", !!SUPABASE_URL);
console.log("[boot] Service role present?", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("[boot] Default origin:", process.env.OPENMAT_DOMAIN || "(none)");

/* ---------- Middleware ---------- */
app.use(cors());
app.use(morgan("dev"));

/* ---------- Helpers ---------- */
async function upsertProfileByEmail({ email, name, image_url = null }) {
  if (!email) return { ok: false, reason: "no_email" };
  const sb = createClient(
    process.env.PROJECT_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await sb
    .from("profiles")
    .upsert([{ email: String(email).toLowerCase(), name, image_url }], {
      onConflict: "email",
    })
    .select()
    .limit(1);

  if (error) {
    console.error("[upsertProfileByEmail] error:", error);
    return { ok: false, error };
  }
  return { ok: true, row: data?.[0] || null };
}

async function recordDonation({
  amountCents = 0,
  dealId = "default",
  donorName = "Anonymous",
  donorImage = null,
  stripeSessionId = null,
  stripePaymentIntentId = null,
}) {
  if (stripeSessionId) {
    const { data: existing } = await supabaseAdmin
      .from("activities")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();
    if (existing) {
      console.log("[recordDonation] already recorded for", stripeSessionId);
      return { ok: true, already: true };
    }
  }

  const row = {
    deal_id: dealId,
    type: "give",
    amount_cents: amountCents,
    donor_name: donorName,
    donor_image: donorImage,
    stripe_session_id: stripeSessionId,
    stripe_payment_intent_id: stripePaymentIntentId,
  };

  const { data, error } = await supabaseAdmin
    .from("activities")
    .insert([row])
    .select();

  if (error) {
    console.error("[recordDonation] supabase insert error:", error);
    return { ok: false, error };
  }
  console.log("[recordDonation] inserted:", data?.[0] || row);
  return { ok: true, row: data?.[0] || row };
}

/* ---------- Webhook (raw body) ---------- */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("[webhook] signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      console.log("[webhook] event:", event.type, event.id);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          await recordDonation({
            amountCents: session.amount_total || 0,
            dealId: session.metadata?.deal_id || "default",
            donorName:
              session.metadata?.donor_name ||
              session.customer_details?.name ||
              "Anonymous",
            stripeSessionId: session.id,
          });
          await upsertProfileByEmail({
            email: session.customer_details?.email || null,
            name:
              session.metadata?.donor_name ||
              session.customer_details?.name ||
              null,
          });
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          await recordDonation({
            amountCents: pi.amount_received || pi.amount || 0,
            dealId: pi.metadata?.deal_id || "default",
            donorName: pi.metadata?.donor_name || "Anonymous",
            stripePaymentIntentId: pi.id || null,
          });
          await upsertProfileByEmail({
            email: pi.metadata?.donor_email || null,
            name: pi.metadata?.donor_name || null,
          });
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("[webhook] handler error:", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

/* ---------- JSON body for non-webhook routes ---------- */
app.use(express.json());

/* ---------- Create Checkout Session ---------- */
app.post("/api/donate/session", async (req, res) => {
  try {
    const {
      amountCents = 1000,
      donorName = "Anonymous",
      dealId = "default",
    } = req.body || {};

    const origin =
      req.headers.origin || process.env.OPENMAT_DOMAIN || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: "Donation" },
          },
        },
      ],
      metadata: { deal_id: dealId, donor_name: donorName },
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    console.log("[create session] created:", session.id, "→", session.url);
    res.json({ url: session.url });
  } catch (err) {
    console.error("[create session] error:", err);
    res.status(500).json({
      error: "failed_to_create_session",
      details: err?.raw?.message || err?.message || "unknown",
      code: err?.code || err?.raw?.code || null,
    });
  }
});

/* ---------- Wallet flow (PI) ---------- */
app.post("/api/payments/create-intent", async (req, res) => {
  try {
    const {
      amountCents = 1000,
      currency = "usd",
      dealId = "default",
      donorName = "Anonymous",
    } = req.body || {};

    if (!Number.isInteger(amountCents) || amountCents < 50) {
      return res.status(400).json({ error: "invalid_amount" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { deal_id: dealId, donor_name: donorName },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("[create-intent] error:", err);
    res.status(500).json({
      error: "failed_to_create_intent",
      details: err?.message || "unknown",
    });
  }
});

/* ---------- Checkout redirect confirmation ---------- */
app.get("/api/checkout/confirm", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: "missing_session_id" });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer_details"],
    });
    console.log("[confirm] retrieved:", session.id, session.payment_status);

    if (session.payment_status !== "paid") {
      return res.json({ ok: true, status: "not_paid" });
    }

    const out = await recordDonation({
      amountCents: session.amount_total || 0,
      dealId: session.metadata?.deal_id || "default",
      donorName:
        session.metadata?.donor_name ||
        session.customer_details?.name ||
        "Anonymous",
      donorImage: null,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent?.id || null,
    });

    console.log("[confirm] result:", out);
    res.json({
      ok: true,
      status: out.already ? "already_recorded" : "inserted",
    });
  } catch (err) {
    console.error("[confirm] error:", err);
    res.status(500).json({ ok: false, error: err?.message || "unknown" });
  }
});

/* ---------- DEBUG (dev only) ---------- */
if (process.env.NODE_ENV !== "production") {
  app.get("/api/_debug/env", (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      stripeKeyStarts: (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…",
      webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
      originDefault: process.env.OPENMAT_DOMAIN || null,
      supabaseUrlSet: !!SUPABASE_URL,
      serviceRoleSet: !!SUPABASE_SERVICE_ROLE_KEY,
    });
  });

  app.get("/api/_debug/activities", async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ count: data?.length || 0, data });
  });

  app.post("/api/_debug/activities/insert", async (req, res) => {
    const out = await recordDonation({
      amountCents: Math.floor(Math.random() * 900) + 100,
      dealId: "default",
      donorName: "Debug",
      donorImage: null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
    });
    res.json(out);
  });
}

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
