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
console.log("[boot] Stripe key starts:", (process.env.STRIPE_SECRET_KEY || "").slice(0, 10) + "…");
console.log("[boot] Webhook secret present?", !!process.env.STRIPE_WEBHOOK_SECRET);
console.log("[boot] Supabase URL present?", !!SUPABASE_URL);
console.log("[boot] Service role present?", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("[boot] Default origin:", process.env.OPENMAT_DOMAIN || "(none)");
console.log("[boot] Env file used:", envFile);

/* ---------- CORS / middleware ---------- */
const allowOrigin = (origin) => {
  if (!origin) return true;
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
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object;

          // If this session is for an offer, record a CLAIM and stop.
          if (s.metadata?.offer_id) {
            await recordClaimLike(s, "checkout");
            break;
          }

          // Otherwise: donation path
          await recordDonation({
            amountCents: s.amount_total || 0,
            dealId: s.metadata?.deal_id || "default",
            donorId: s.metadata?.donor_id || null,
            donorName: s.metadata?.donor_name || s.customer_details?.name || "Anonymous",
            donorImage: s.metadata?.donor_image || null,
            stripeSessionId: s.id,
            stripePaymentIntentId: s.payment_intent || null,
            receiptUrl: s?.payment_intent ? await getReceiptUrlSafe(s.payment_intent) : null,
          });
          await upsertProfileByEmail({
            email: s.customer_details?.email || null,
            name: s.metadata?.donor_name || s.customer_details?.name || null,
            image_url: s.metadata?.donor_image || null,
          });
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object;

          // If this intent is for an offer, record a CLAIM and stop.
          if (pi.metadata?.offer_id) {
            await recordClaimLike(pi, "pi");
            break;
          }

          // Otherwise: donation path
          const receiptUrl = await getReceiptUrlSafe(pi.id);
          await recordDonation({
            amountCents: pi.amount_received || pi.amount || 0,
            dealId: pi.metadata?.deal_id || "default",
            donorId: pi.metadata?.donor_id || null,
            donorName: pi.metadata?.donor_name || "Anonymous",
            donorImage: pi.metadata?.donor_image || null,
            stripePaymentIntentId: pi.id || null,
            receiptUrl,
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
      console.error("[webhook] handler error", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

/* ---------- JSON body parser (after webhook) ---------- */
app.use(express.json());

/* ---------- Helpers ---------- */
async function getReceiptUrlSafe(paymentIntentId) {
  try {
    const latest = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    return latest?.latest_charge?.receipt_url || null;
  } catch {
    return null;
  }
}

async function fetchProfileImageById(id) {
  if (!id) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  return data?.image_url || null;
}

async function upsertProfileByEmail({ email, name, image_url = null }) {
  if (!email) return { ok: false, reason: "no_email" };
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

/** If an offer_id is present, record as a "claim" into activities. */
async function recordClaimLike(object, source) {
  const meta = object.metadata || {};
  if (!meta.offer_id) return;

  const receiptUrl =
    source === "checkout" && object.payment_intent
      ? await getReceiptUrlSafe(object.payment_intent)
      : source === "pi"
      ? await getReceiptUrlSafe(object.id)
      : null;

  await recordDonation({
    amountCents: object.amount_total || object.amount_received || object.amount || 0,
    dealId: meta.deal_id || "default",
    donorId: meta.donor_id || null,
    donorName: meta.donor_name || object.customer_details?.name || "Anonymous",
    donorImage: meta.donor_image || null,
    stripeSessionId: source === "checkout" ? object.id : null,
    stripePaymentIntentId: source === "pi" ? object.id : object.payment_intent || null,
    receiptUrl,
    _offerId: meta.offer_id,
    _forceType: "claim",
  });
}

async function recordDonation({
  amountCents = 0,
  dealId = "default",
  donorId = null,
  donorName = "Anonymous",
  donorImage = null,
  stripeSessionId = null,
  stripePaymentIntentId = null,
  receiptUrl = null,
  _offerId = null,
  _forceType = null,
}) {
  // de-dupe by session id
  if (stripeSessionId) {
    const { data: existing } = await supabaseAdmin
      .from("activities")
      .select("id")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();
    if (existing) return { ok: true, already: true };
  }

  // de-dupe by payment intent id
  if (stripePaymentIntentId) {
    const { data: existingPi } = await supabaseAdmin
      .from("activities")
      .select("id")
      .eq("stripe_payment_intent_id", stripePaymentIntentId)
      .maybeSingle();
    if (existingPi) return { ok: true, already: true };
  }

  // server-side backfill of donor image if missing
  let finalImage = donorImage;
  if (!finalImage && donorId) finalImage = await fetchProfileImageById(donorId);

  const row = {
    deal_id: dealId,
    type: _forceType || "give",
    amount_cents: amountCents,
    donor_name: donorName,
    donor_image: finalImage || null,
    stripe_session_id: stripeSessionId,
    stripe_payment_intent_id: stripePaymentIntentId,
    receipt_url: receiptUrl || null,
    user_id: donorId || null,
    offer_id: _offerId || null,
    action: _forceType === "claim" ? "claimed" : null,
  };

  const { data, error } = await supabaseAdmin.from("activities").insert([row]).select();
  if (error) return { ok: false, error };
  return { ok: true, row: data?.[0] || row };
}

/* ---------- Storage (signed avatar/offer image upload) ---------- */
app.post("/api/storage/avatar-url", async (req, res) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: "missing_fields" });

    const key = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${(filename.split(".").pop() || "jpg").toLowerCase()}`;

    const { data, error } = await supabaseAdmin.storage.from("publicbucket").createSignedUploadUrl(key);
    if (error) throw error;

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/publicbucket/${key}`;
    res.json({ uploadUrl: data.signedUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message || "signed_upload_failed" });
  }
});

/* ---------- Offers ---------- */
app.get("/api/offers/list", async (req, res) => {
  try {
    const dealId = String(req.query.deal_id || "default");
    const { data, error } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ ok: true, offers: data || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "offers_list_failed" });
  }
});

app.get("/api/offers/get", async (req, res) => {
  try {
    const id = String(req.query.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "missing_id" });
    const { data, error } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, offer: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "offers_get_failed" });
  }
});

app.post("/api/offers/create", async (req, res) => {
  try {
    const { dealId = "default", title, image_url = null, price_cents = 0, params = {} } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: "missing_title" });
    const row = { deal_id: dealId, title, image_url, price_cents: Math.max(0, ~~price_cents), params };
    const { data, error } = await supabaseAdmin.from("offers").insert([row]).select().limit(1);
    if (error) throw error;
    res.json({ ok: true, offer: data?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "offers_create_failed" });
  }
});

/* ---------- Claims (Stripe Checkout) ---------- */
app.post("/api/claims/session", async (req, res) => {
  try {
    const {
      offerId,
      amountCents,                 // optional override; default to offer.price
      donorId = null,
      donorName = "Anonymous",
      donorImageUrl = null,
      dealId = "default",
    } = req.body || {};

    if (!offerId) return res.status(400).json({ error: "missing_offer_id" });

    const { data: offer, error: offerErr } = await supabaseAdmin
      .from("offers").select("*").eq("id", offerId).maybeSingle();
    if (offerErr) throw offerErr;
    if (!offer) return res.status(404).json({ error: "offer_not_found" });

    const price = Number.isInteger(amountCents) ? amountCents : (offer.price_cents || 0);
    const origin = req.headers.origin || process.env.OPENMAT_DOMAIN || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.max(0, price),
            product_data: { name: offer.title },
          },
        },
      ],
      metadata: {
        deal_id: dealId,
        donor_id: donorId || "",
        donor_name: donorName,
        donor_image: donorImageUrl || "",
        offer_id: offerId,
      },
      success_url: `${origin}/o/${offerId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/o/${offerId}?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: "failed_to_create_claim_session", details: err?.message || "unknown" });
  }
});

/* ---------- Claims (FREE, no Stripe) ---------- */
app.post("/api/claims/free", async (req, res) => {
  try {
    const { offerId, donorId = null, donorName = "Anonymous", donorImageUrl = null, dealId = "default" } = req.body || {};
    if (!offerId) return res.status(400).json({ ok: false, error: "missing_offer_id" });

    // Ensure offer exists
    const { data: offer, error: offerErr } = await supabaseAdmin
      .from("offers").select("id").eq("id", offerId).maybeSingle();
    if (offerErr) throw offerErr;
    if (!offer) return res.status(404).json({ ok: false, error: "offer_not_found" });

    const out = await recordDonation({
      amountCents: 0,
      dealId,
      donorId,
      donorName,
      donorImage: donorImageUrl,
      _offerId: offerId,
      _forceType: "claim",
    });

    res.json({ ok: true, status: out.already ? "already_recorded" : "inserted" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "free_claim_failed" });
  }
});

/* ---------- Payments (Checkout + PaymentIntent-for-wallet) ---------- */
app.post("/api/donate/session", async (req, res) => {
  try {
    const {
      amountCents = 1000,
      donorId = null,
      donorName = "Anonymous",
      donorImageUrl = null,
      dealId = "default",
    } = req.body || {};
    const origin = req.headers.origin || process.env.OPENMAT_DOMAIN || "http://localhost:3000";

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
    res.status(500).json({ error: "failed_to_create_session", details: err?.message || "unknown" });
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
    res.status(500).json({ error: "failed_to_create_intent", details: err?.message || "unknown" });
  }
});

/* ---------- Checkout redirect confirmation ---------- */
app.get("/api/checkout/confirm", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: "missing_session_id" });

    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer_details"],
    });

    // If this Checkout was created for an offer, record as CLAIM (with offer_id).
    if (s.metadata?.offer_id) {
      const receiptUrl = s.payment_intent
        ? await getReceiptUrlSafe(s.payment_intent.id || s.payment_intent)
        : null;

      const out = await recordDonation({
        amountCents: s.amount_total || 0,
        dealId: s.metadata?.deal_id || "default",
        donorId: s.metadata?.donor_id || null,
        donorName: s.metadata?.donor_name || s.customer_details?.name || "Anonymous",
        donorImage: s.metadata?.donor_image || null,
        stripeSessionId: s.id,
        stripePaymentIntentId: s.payment_intent?.id || null,
        receiptUrl,
        _offerId: s.metadata.offer_id,
        _forceType: "claim",
      });

      return res.json({ ok: true, kind: "claim", status: out.already ? "already_recorded" : "inserted" });
    }

    // Otherwise, donation confirmation (legacy path)
    if (s.payment_status !== "paid") return res.json({ ok: true, kind: "donation", status: "not_paid" });

    const out = await recordDonation({
      amountCents: s.amount_total || 0,
      dealId: s.metadata?.deal_id || "default",
      donorId: s.metadata?.donor_id || null,
      donorName: s.metadata?.donor_name || s.customer_details?.name || "Anonymous",
      donorImage: s.metadata?.donor_image || null,
      stripeSessionId: s.id,
      stripePaymentIntentId: s.payment_intent?.id || null,
      receiptUrl: s.payment_intent ? await getReceiptUrlSafe(s.payment_intent.id || s.payment_intent) : null,
    });

    res.json({ ok: true, kind: "donation", status: out.already ? "already_recorded" : "inserted" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "unknown" });
  }
});

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- 404 & Error ---------- */
app.use((req, res) => res.status(404).json({ error: "not_found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error("[server error]", err);
  res.status(500).json({ error: "server_error", message: err?.message || "unknown" });
});

/* ---------- Start (local) & Export (Vercel) ---------- */
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}
module.exports = app;
