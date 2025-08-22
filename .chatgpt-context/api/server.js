require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Boot sanity logs ----
console.log("[boot] NODE_ENV:", process.env.NODE_ENV);
console.log(
  "[boot] Stripe key present?",
  !!process.env.STRIPE_SECRET_KEY,
  (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…"
);
console.log("[boot] Webhook secret present?", !!process.env.STRIPE_WEBHOOK_SECRET);
console.log("[boot] Default origin:", process.env.OPENMAT_DOMAIN || "(none)");

// Basic middleware
app.use(cors());
app.use(morgan("dev"));

// ---- Shared helper: record a donation in Supabase ----
async function recordDonation({
  amountCents = 0,
  dealId = "default",
  donorName = "Anonymous",
  stripeSessionId = null,
}) {
  const supabase = createClient(
    process.env.PROJECT_SUPABASE_URL,
    process.env.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // idempotency (requires unique index on stripe_session_id where not null)
  if (stripeSessionId) {
    const { data: existing } = await supabase
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
    type: "donation",
    amount_cents: amountCents,
    donor_name: donorName,
    stripe_session_id: stripeSessionId,
  };

  const { data, error } = await supabase.from("activities").insert([row]).select();
  if (error) {
    console.error("[recordDonation] supabase insert error:", error);
    return { ok: false, error };
  }
  console.log("[recordDonation] inserted:", data?.[0] || row);
  return { ok: true, row: data?.[0] || row };
}

// ---- Webhook (raw body!) ----
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
            donorName: session.customer_details?.name || "Anonymous",
            stripeSessionId: session.id,
          });
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          await recordDonation({
            amountCents: pi.amount_received || pi.amount || 0,
            dealId: pi.metadata?.deal_id || "default",
            donorName: pi.metadata?.donor_name || "Anonymous",
          });
          break;
        }
        default:
          // ignore others
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("[webhook] handler error:", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

// ---- JSON body AFTER webhook ----
app.use(express.json());

// ---- Create checkout session ----
app.post("/api/donate/session", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
      throw new Error("Missing/invalid STRIPE_SECRET_KEY");
    }

    const {
      amountCents = 1000,
      creatorName = "Anonymous",
      dealId = "default",
    } = req.body || {};
    const origin =
      req.headers.origin || process.env.OPENMAT_DOMAIN || "http://localhost:3000";

    console.log("[create session] body:", req.body);
    console.log("[create session] origin:", origin);

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
            product_data: { name: `Donation to ${creatorName}` },
          },
        },
      ],
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      metadata: { deal_id: dealId },
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

// ---- Wallet flow (optional) ----
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
    res
      .status(500)
      .json({ error: "failed_to_create_intent", details: err?.message || "unknown" });
  }
});

// ---- Redirect confirmation (fallback if webhook didn’t write) ----
app.get("/api/checkout/confirm", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: "missing_session_id" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[confirm] retrieved:", session.id, session.payment_status);

    if (session.payment_status !== "paid") {
      return res.json({ ok: true, status: "not_paid" });
    }

    const out = await recordDonation({
      amountCents: session.amount_total || 0,
      dealId: session.metadata?.deal_id || "default",
      donorName: session.customer_details?.name || "Anonymous",
      stripeSessionId: session.id,
    });

    console.log("[confirm] result:", out);
    res.json({ ok: true, status: out.already ? "already_recorded" : "inserted" });
  } catch (err) {
    console.error("[confirm] error:", err);
    res.status(500).json({ ok: false, error: err?.message || "unknown" });
  }
});

// ---- DEBUG endpoints (safe for dev) ----
if (process.env.NODE_ENV !== "production") {
  app.get("/api/_debug/env", (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      stripeKeyStarts: (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…",
      webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
      originDefault: process.env.OPENMAT_DOMAIN,
    });
  });

  app.get("/api/_debug/activities", async (req, res) => {
    const supabase = createClient(
      process.env.PROJECT_SUPABASE_URL,
      process.env.SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await supabase
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
      stripeSessionId: null,
    });
    res.json(out);
  });
}

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
