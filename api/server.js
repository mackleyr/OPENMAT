// api/server.js

const path = require("path");
const fs = require("fs");
const envLocal = path.join(__dirname, ".env.local");
const envFile = fs.existsSync(envLocal) ? envLocal : path.join(__dirname, ".env");
require("dotenv").config({ path: envFile });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const app = express();

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
console.log(
  "[boot] Stripe key starts:",
  (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…"
);
console.log(
  "[boot] Webhook secret present?",
  !!process.env.STRIPE_WEBHOOK_SECRET
);
console.log("[boot] Supabase URL present?", !!SUPABASE_URL);
console.log("[boot] Service role present?", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("[boot] Default origin:", process.env.OPENMAT_DOMAIN || "(none)");
console.log("[boot] Env file used:", envFile);

/* ---------- CORS / middleware ---------- */
// Allow localhost, production, and Vercel preview frontends; ensure ALL responses include CORS
const allowOrigin = (origin) => {
  if (!origin) return true; // server-to-server/webhooks
  const o = String(origin).toLowerCase();

  const fixed = new Set(
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://openmat.app",
      "https://openmat.vercel.app",
      (process.env.OPENMAT_DOMAIN || "").toLowerCase(),
    ].filter(Boolean)
  );
  if (fixed.has(o)) return true;

  // Any Vercel preview for the frontend, e.g. https://openmat-xxxxx-openmat.vercel.app
  if (/^https:\/\/openmat-.*\.vercel\.app$/.test(o)) return true;

  return false;
};

const dynamicCors = cors({
  origin: (origin, cb) => cb(null, allowOrigin(origin)),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Stripe-Signature"],
});

app.use((req, res, next) => dynamicCors(req, res, next));
app.options("*", (req, res) => dynamicCors(req, res, () => res.sendStatus(204)));

app.use(morgan("dev"));

/* ---------- Stripe webhook (raw body) ---------- */
// IMPORTANT: register the raw body route BEFORE express.json()
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
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object;
          await recordDonation({
            amountCents: s.amount_total || 0,
            dealId: s.metadata?.deal_id || "default",
            donorId: s.metadata?.donor_id || null,
            donorName:
              s.metadata?.donor_name || s.customer_details?.name || "Anonymous",
            donorImage: s.metadata?.donor_image || null,
            stripeSessionId: s.id,
          });
          await upsertProfileByEmail({
            email: s.customer_details?.email || null,
            name:
              s.metadata?.donor_name || s.customer_details?.name || null,
            image_url: s.metadata?.donor_image || null,
          });
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          await recordDonation({
            amountCents: pi.amount_received || pi.amount || 0,
            dealId: pi.metadata?.deal_id || "default",
            donorId: pi.metadata?.donor_id || null,
            donorName: pi.metadata?.donor_name || "Anonymous",
            donorImage: pi.metadata?.donor_image || null,
            stripePaymentIntentId: pi.id || null,
          });
          await upsertProfileByEmail({
            email: pi.metadata?.donor_email || null,
            name: pi.metadata?.donor_name || null,
            image_url: pi.metadata?.donor_image || null,
          });
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      res.status(500).send("Webhook handler error");
    }
  }
);

/* ---------- JSON body parser (after webhook) ---------- */
app.use(express.json());

/* ---------- Helpers ---------- */
async function fetchProfileImageById(id) {
  if (!id) return null;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data?.image_url || null;
}

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

  if (error) return { ok: false, error };
  return { ok: true, row: data?.[0] || null };
}

async function recordDonation({
  amountCents = 0,
  dealId = "default",
  donorId = null,
  donorName = "Anonymous",
  donorImage = null,
  stripeSessionId = null,
  stripePaymentIntentId = null,
}) {
  // dedupe by session id
  if (stripeSessionId) {
    const { data: existing } = await supabaseAdmin
      .from("activities")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();
    if (existing) return { ok: true, already: true };
  }

  // server‑side backfill of donor image if missing
  let finalImage = donorImage;
  if (!finalImage && donorId) {
    finalImage = await fetchProfileImageById(donorId);
  }

  const row = {
    deal_id: dealId,
    type: "give",
    amount_cents: amountCents,
    donor_name: donorName,
    donor_image: finalImage || null,
    stripe_session_id: stripeSessionId,
    stripe_payment_intent_id: stripePaymentIntentId,
    user_id: donorId || null,
  };

  const { data, error } = await supabaseAdmin
    .from("activities")
    .insert([row])
    .select();
  if (error) return { ok: false, error };
  return { ok: true, row: data?.[0] || row };
}

/* ---------- Profiles (simple persistence by id) ---------- */
app.post("/api/profile/upsert", async (req, res) => {
  try {
    const { id, name, image_url = null } = req.body || {};
    if (!id || !name) return res.status(400).json({ error: "missing_fields" });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert([{ id, name, image_url }], { onConflict: "id" })
      .select()
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, profile: data?.[0] || null });
  } catch (err) {
    res
      .status(500)
      .json({ error: "profile_upsert_failed", details: err?.message || "unknown" });
  }
});

app.get("/api/profile/get", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "missing_id" });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,name,image_url")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, profile: data || null });
  } catch (err) {
    res
      .status(500)
      .json({ error: "profile_get_failed", details: err?.message || "unknown" });
  }
});

/* ---------- Payments (Checkout + PI) ---------- */
app.post("/api/donate/session", async (req, res) => {
  try {
    const {
      amountCents = 1000,
      donorId = null,
      donorName = "Anonymous",
      donorImageUrl = null,
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
      metadata: {
        deal_id: dealId,
        donor_id: donorId || "",
        donor_name: donorName,
        donor_image: donorImageUrl || "",
      },
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/give?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({
      error: "failed_to_create_session",
      details: err?.message || "unknown",
    });
  }
});

app.post("/api/payments/create-intent", async (req, res) => {
  try {
    const {
      amountCents = 1000,
      currency = "usd",
      dealId = "default",
      donorId = null,
      donorName = "Anonymous",
      donorImageUrl = null,
    } = req.body || {};
    if (!Number.isInteger(amountCents) || amountCents < 50) {
      return res.status(400).json({ error: "invalid_amount" });
    }
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        deal_id: dealId,
        donor_id: donorId || "",
        donor_name: donorName,
        donor_image: donorImageUrl || "",
      },
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
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
    if (!sessionId)
      return res.status(400).json({ error: "missing_session_id" });

    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer_details"],
    });
    if (s.payment_status !== "paid")
      return res.json({ ok: true, status: "not_paid" });

    const out = await recordDonation({
      amountCents: s.amount_total || 0,
      dealId: s.metadata?.deal_id || "default",
      donorId: s.metadata?.donor_id || null,
      donorName:
        s.metadata?.donor_name || s.customer_details?.name || "Anonymous",
      donorImage: s.metadata?.donor_image || null,
      stripeSessionId: s.id,
      stripePaymentIntentId: s.payment_intent?.id || null,
    });

    res.json({
      ok: true,
      status: out.already ? "already_recorded" : "inserted",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "unknown" });
  }
});

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- DEBUG (dev only) ---------- */
if (process.env.NODE_ENV !== "production") {
  app.get("/api/_debug/env", (_req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      stripeKeyStarts: (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…",
      webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
      originDefault: process.env.OPENMAT_DOMAIN || null,
      supabaseUrlSet: !!SUPABASE_URL,
      serviceRoleSet: !!SUPABASE_SERVICE_ROLE_KEY,
      envFileUsed: envFile,
    });
  });
}

/* ---------- 404 & Error (with CORS) ---------- */
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((err, _req, res, _next) => {
  console.error("[server error]", err);
  res
    .status(500)
    .json({ error: "server_error", message: err?.message || "unknown" });
});

/* ---------- Start (local) & Export (Vercel) ---------- */
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}
module.exports = app;
