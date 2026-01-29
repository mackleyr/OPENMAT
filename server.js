import express from "express";
import pg from "pg";
import Stripe from "stripe";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const query = (text, params) => pool.query(text, params);

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeClientId = process.env.STRIPE_CLIENT_ID;
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:5173";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

const EVENT_TYPES = {
  OFFER_CREATED: "OFFER_CREATED",
  OFFER_VIEWED: "OFFER_VIEWED",
  OFFER_CLAIMED: "OFFER_CLAIMED",
  WALLET_SAVED: "WALLET_SAVED",
  REDEMPTION_COMPLETED: "REDEMPTION_COMPLETED",
  REFERRAL_INVITE_SENT: "REFERRAL_INVITE_SENT",
  REFERRAL_CONVERTED: "REFERRAL_CONVERTED",
};

const isPositiveInteger = (value) =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

app.post("/users", async (req, res) => {
  const { name, bio, phone, image_url, username } = req.body || {};
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "invalid_user_payload" });
  }
  const normalizedUsername = isNonEmptyString(username)
    ? username.trim().toLowerCase()
    : name.trim().split(/\s+/)[0].toLowerCase();
  const result = await query(
    "INSERT INTO users (name, role, bio, phone, image_url, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, role, bio, phone, image_url, username, stripe_account_id, created_at",
    [name.trim(), "customer", bio ?? "", phone ?? "", image_url ?? null, normalizedUsername]
  );
  return res.status(201).json({ user: result.rows[0] });
});

app.patch("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { name, image_url, username } = req.body || {};
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "invalid_user_id" });
  }
  const userResult = await query(
    "SELECT id FROM users WHERE id = $1",
    [userId]
  );
  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "user_not_found" });
  }
  const updates = {
    name: isNonEmptyString(name) ? name.trim() : null,
    image_url: isNonEmptyString(image_url) ? image_url : null,
    username: isNonEmptyString(username) ? username.trim().toLowerCase() : null,
  };
  const result = await query(
    "UPDATE users SET name = COALESCE($1, name), image_url = COALESCE($2, image_url), username = COALESCE($3, username) WHERE id = $4 RETURNING id, name, role, bio, phone, image_url, username, stripe_account_id, created_at",
    [updates.name, updates.image_url, updates.username, userId]
  );
  return res.json({ user: result.rows[0] });
});

app.post("/offers", async (req, res) => {
  const {
    creator_id,
    title,
    price_cents,
    deposit_cents,
    capacity,
    location_text,
    description,
    image_url,
    slots,
    payment_mode,
  } = req.body || {};

  const normalizedPaymentMode =
    payment_mode === "full" || payment_mode === "pay_in_person" ? payment_mode : "deposit";

  if (
    !isPositiveInteger(creator_id) ||
    !isNonEmptyString(title) ||
    !isNonNegativeInteger(price_cents) ||
    !isNonNegativeInteger(deposit_cents) ||
    !isPositiveInteger(capacity) ||
    !isNonEmptyString(location_text)
  ) {
    return res.status(400).json({ error: "invalid_offer_payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const offerResult = await client.query(
      "INSERT INTO offers (creator_id, title, price_cents, deposit_cents, payment_mode, capacity, location_text, description, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, creator_id, title, price_cents, deposit_cents, payment_mode, capacity, location_text, description, image_url, created_at",
      [
        creator_id,
        title.trim(),
        price_cents,
        deposit_cents,
        normalizedPaymentMode,
        capacity,
        location_text.trim(),
        description ?? "",
        image_url ?? null,
      ]
    );
    const offer = offerResult.rows[0];
    if (Array.isArray(slots)) {
      for (const slot of slots) {
        if (!slot?.start_at || !slot?.end_at) continue;
        await client.query(
          "INSERT INTO offer_slots (offer_id, start_at, end_at, remaining_capacity) VALUES ($1, $2, $3, $4)",
          [offer.id, slot.start_at, slot.end_at, slot.remaining_capacity ?? capacity]
        );
      }
    }
    await client.query(
      "INSERT INTO events (user_id, type, ref_id, metadata) VALUES ($1, $2, $3, $4)",
      [creator_id, EVENT_TYPES.OFFER_CREATED, offer.id, null]
    );
    await client.query("COMMIT");
    return res.status(201).json({ offer });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "create_offer_failed" });
  } finally {
    client.release();
  }
});

app.get("/offers/:offer_id", async (req, res) => {
  const offerId = Number(req.params.offer_id);
  if (!isPositiveInteger(offerId)) {
    return res.status(400).json({ error: "invalid_offer_id" });
  }
  const offerResult = await query(
    "SELECT id, creator_id, title, price_cents, deposit_cents, payment_mode, capacity, location_text, description, image_url, created_at FROM offers WHERE id = $1",
    [offerId]
  );
  if (offerResult.rowCount === 0) {
    return res.status(404).json({ error: "offer_not_found" });
  }
  const slotResult = await query(
    "SELECT id, offer_id, start_at, end_at, remaining_capacity FROM offer_slots WHERE offer_id = $1 ORDER BY start_at ASC",
    [offerId]
  );
  const activityResult = await query(
    "SELECT e.id, e.type, e.ref_id, e.created_at, u.name AS actor_name, o.title AS offer_title FROM events e LEFT JOIN claims c ON e.type IN ($2, $3) AND c.id = e.ref_id LEFT JOIN offers o ON (e.type IN ($2, $3) AND o.id = c.offer_id) OR (e.type = $4 AND o.id = e.ref_id) LEFT JOIN users u ON u.id = c.user_id WHERE (o.id = $1 OR e.ref_id = $1) ORDER BY e.created_at DESC LIMIT 10",
    [offerId, EVENT_TYPES.OFFER_CLAIMED, EVENT_TYPES.REDEMPTION_COMPLETED, EVENT_TYPES.OFFER_CREATED]
  );
  return res.json({ offer: offerResult.rows[0], slots: slotResult.rows, activity: activityResult.rows });
});

app.post("/claims", async (req, res) => {
  const { offer_id, user_id, slot_id, address, referral_code } = req.body || {};

  if (!isPositiveInteger(offer_id) || !isPositiveInteger(user_id)) {
    return res.status(400).json({ error: "invalid_claim_payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const offerResult = await client.query(
      "SELECT id, creator_id, deposit_cents, payment_mode, price_cents FROM offers WHERE id = $1",
      [offer_id]
    );
    if (offerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "offer_not_found" });
    }

    if (slot_id) {
      const slotResult = await client.query(
        "SELECT id, remaining_capacity FROM offer_slots WHERE id = $1 AND offer_id = $2 FOR UPDATE",
        [slot_id, offer_id]
      );
      if (slotResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "slot_not_found" });
      }
      const remaining = Number(slotResult.rows[0].remaining_capacity);
      if (remaining <= 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "slot_full" });
      }
      await client.query("UPDATE offer_slots SET remaining_capacity = remaining_capacity - 1 WHERE id = $1", [slot_id]);
    }

    const claimResult = await client.query(
      "INSERT INTO claims (offer_id, user_id, slot_id, address, deposit_cents) VALUES ($1, $2, $3, $4, $5) RETURNING id, offer_id, user_id, slot_id, address, deposit_cents, created_at",
      [offer_id, user_id, slot_id ?? null, address ?? null, offerResult.rows[0].deposit_cents]
    );

    const claim = claimResult.rows[0];
    const creatorId = offerResult.rows[0].creator_id;

    await client.query(
      "INSERT INTO events (user_id, type, ref_id) VALUES ($1, $2, $3)",
      [creatorId, EVENT_TYPES.OFFER_CLAIMED, claim.id]
    );

    if (referral_code && typeof referral_code === "string") {
      const referralResult = await client.query(
        "SELECT inviter_id FROM referral_links WHERE code = $1",
        [referral_code]
      );
      if (referralResult.rowCount > 0) {
        await client.query(
          "INSERT INTO events (user_id, type, ref_id, metadata) VALUES ($1, $2, $3, $4)",
          [referralResult.rows[0].inviter_id, EVENT_TYPES.REFERRAL_CONVERTED, claim.id, null]
        );
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({ claim, payment_mode: offerResult.rows[0].payment_mode });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "create_claim_failed" });
  } finally {
    client.release();
  }
});

app.post("/checkout/session", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "stripe_not_configured" });
  }
  const { claim_id } = req.body || {};
  if (!isPositiveInteger(claim_id)) {
    return res.status(400).json({ error: "invalid_checkout_payload" });
  }

  const claimResult = await query(
    "SELECT c.id, c.deposit_cents, o.title, o.price_cents, o.payment_mode FROM claims c JOIN offers o ON o.id = c.offer_id WHERE c.id = $1",
    [claim_id]
  );

  if (claimResult.rowCount === 0) {
    return res.status(404).json({ error: "claim_not_found" });
  }

  const claim = claimResult.rows[0];
  const amountCents = claim.payment_mode === "full" ? claim.price_cents : claim.deposit_cents;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${publicBaseUrl}/?claim=${claim_id}&paid=1`,
    cancel_url: `${publicBaseUrl}/?claim=${claim_id}&cancel=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: claim.title },
        },
      },
    ],
    metadata: {
      claim_id: String(claim_id),
    },
  });

  await query(
    "INSERT INTO payments (claim_id, amount_cents, status, provider, provider_ref) VALUES ($1, $2, $3, $4, $5)",
    [claim_id, amountCents, "pending", "stripe", session.id]
  );

  return res.json({ url: session.url });
});

app.post("/wallet/:platform", async (req, res) => {
  const platform = req.params.platform;
  const { claim_id } = req.body || {};
  if (!isPositiveInteger(claim_id) || (platform !== "apple" && platform !== "google")) {
    return res.status(400).json({ error: "invalid_wallet_payload" });
  }

  await query(
    "INSERT INTO wallet_passes (claim_id, platform, status) VALUES ($1, $2, $3)",
    [claim_id, platform, "created"]
  );

  return res.json({ ok: true, message: "Wallet pass generation requires credentials" });
});

app.post("/redemptions", async (req, res) => {
  const { claim_id } = req.body || {};
  if (!isPositiveInteger(claim_id)) {
    return res.status(400).json({ error: "invalid_redemption_payload" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const claimResult = await client.query(
      "SELECT c.id, o.creator_id FROM claims c JOIN offers o ON o.id = c.offer_id WHERE c.id = $1",
      [claim_id]
    );
    if (claimResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "claim_not_found" });
    }
    const redemptionResult = await client.query(
      "INSERT INTO redemptions (claim_id) VALUES ($1) RETURNING id, claim_id, redeemed_at",
      [claim_id]
    );
    await client.query(
      "INSERT INTO events (user_id, type, ref_id) VALUES ($1, $2, $3)",
      [claimResult.rows[0].creator_id, EVENT_TYPES.REDEMPTION_COMPLETED, claim_id]
    );
    await client.query("COMMIT");
    return res.status(201).json({ redemption: redemptionResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "create_redemption_failed" });
  } finally {
    client.release();
  }
});

app.get("/profile/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "invalid_user_id" });
  }
  const userResult = await query(
    "SELECT id, name, role, bio, phone, image_url, username, stripe_account_id, created_at FROM users WHERE id = $1",
    [userId]
  );
  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "user_not_found" });
  }
  const scoreResult = await query(
    "SELECT COUNT(r.id) AS score FROM redemptions r JOIN claims c ON c.id = r.claim_id JOIN offers o ON o.id = c.offer_id WHERE o.creator_id = $1",
    [userId]
  );
  const offersResult = await query(
    "SELECT o.id, o.creator_id, o.title, o.price_cents, o.deposit_cents, o.payment_mode, o.capacity, o.location_text, o.description, o.image_url, o.created_at, COUNT(c.id) AS claimed_count FROM offers o LEFT JOIN claims c ON c.offer_id = o.id WHERE o.creator_id = $1 GROUP BY o.id ORDER BY o.created_at DESC",
    [userId]
  );
  return res.json({
    user: userResult.rows[0],
    score: Number(scoreResult.rows[0].score),
    offers: offersResult.rows.map((offer) => ({
      ...offer,
      claimed_count: Number(offer.claimed_count),
    })),
  });
});

app.get("/inbox/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "invalid_user_id" });
  }
  const eventsResult = await query(
    "SELECT e.id, e.type, e.ref_id, e.created_at, u.name AS actor_name, o.title AS offer_title FROM events e LEFT JOIN claims c ON e.type IN ($2, $3) AND c.id = e.ref_id LEFT JOIN offers o ON (e.type IN ($2, $3) AND o.id = c.offer_id) OR (e.type = $4 AND o.id = e.ref_id) LEFT JOIN users u ON u.id = c.user_id WHERE e.user_id = $1 ORDER BY e.created_at DESC",
    [userId, EVENT_TYPES.OFFER_CLAIMED, EVENT_TYPES.REDEMPTION_COMPLETED, EVENT_TYPES.OFFER_CREATED]
  );
  return res.json({ events: eventsResult.rows });
});

app.get("/metrics/kfactor/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "invalid_user_id" });
  }
  const invitesResult = await query(
    "SELECT COUNT(id) AS invites FROM events WHERE user_id = $1 AND type = $2",
    [userId, EVENT_TYPES.REFERRAL_INVITE_SENT]
  );
  const conversionsResult = await query(
    "SELECT COUNT(id) AS conversions FROM events WHERE user_id = $1 AND type = $2",
    [userId, EVENT_TYPES.REFERRAL_CONVERTED]
  );
  const invites = Number(invitesResult.rows[0].invites) || 0;
  const conversions = Number(conversionsResult.rows[0].conversions) || 0;
  const kFactor = invites === 0 ? 0 : Number((conversions / invites).toFixed(2));
  return res.json({ invites, conversions, k_factor: kFactor });
});

app.post("/events", async (req, res) => {
  const { user_id, type, ref_id, metadata } = req.body || {};
  if (!isPositiveInteger(user_id) || !isNonEmptyString(type)) {
    return res.status(400).json({ error: "invalid_event_payload" });
  }
  await query(
    "INSERT INTO events (user_id, type, ref_id, metadata) VALUES ($1, $2, $3, $4)",
    [user_id, type, ref_id ?? null, metadata ?? null]
  );
  return res.json({ ok: true });
});

app.post("/referrals", async (req, res) => {
  const { inviter_id, offer_id } = req.body || {};
  if (!isPositiveInteger(inviter_id) || !isPositiveInteger(offer_id)) {
    return res.status(400).json({ error: "invalid_referral_payload" });
  }
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await query(
    "INSERT INTO referral_links (code, inviter_id, offer_id) VALUES ($1, $2, $3)",
    [code, inviter_id, offer_id]
  );
  await query("INSERT INTO events (user_id, type, ref_id) VALUES ($1, $2, $3)", [
    inviter_id,
    EVENT_TYPES.REFERRAL_INVITE_SENT,
    offer_id,
  ]);
  return res.status(201).json({ code });
});

app.get("/stripe/connect", async (req, res) => {
  if (!stripeClientId) {
    return res.status(500).send("Stripe client id not configured");
  }
  const userId = Number(req.query.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).send("Invalid user id");
  }
  const state = Buffer.from(JSON.stringify({ user_id: userId })).toString("base64url");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: stripeClientId,
    scope: "read_write",
    redirect_uri: `${publicBaseUrl}/stripe/callback`,
    state,
  });
  return res.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
});

app.get("/stripe/callback", async (req, res) => {
  if (!stripe) {
    return res.status(500).send("Stripe not configured");
  }
  const code = req.query.code;
  const state = req.query.state;
  if (!code || !state || typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send("Invalid stripe callback");
  }
  let userId = 0;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    userId = Number(parsed.user_id);
  } catch (error) {
    return res.status(400).send("Invalid state");
  }
  if (!isPositiveInteger(userId)) {
    return res.status(400).send("Invalid user id");
  }
  try {
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    const stripeAccountId = tokenResponse.stripe_user_id;
    await query("UPDATE users SET stripe_account_id = $1 WHERE id = $2", [
      stripeAccountId,
      userId,
    ]);
    return res.redirect(`${publicBaseUrl}/?connected=1`);
  } catch (error) {
    return res.redirect(`${publicBaseUrl}/?connected=0`);
  }
});

app.get("/stripe/status", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "stripe_not_configured" });
  }
  const userId = Number(req.query.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "invalid_user_id" });
  }
  const userResult = await query("SELECT stripe_account_id FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "user_not_found" });
  }
  const stripeAccountId = userResult.rows[0].stripe_account_id;
  if (!stripeAccountId) {
    return res.json({ details_submitted: false, charges_enabled: false, payouts_enabled: false });
  }
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return res.json({
      details_submitted: account.details_submitted ?? false,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
    });
  } catch (error) {
    return res.status(500).json({ error: "stripe_status_failed" });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
