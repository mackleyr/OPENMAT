// @ts-nocheck
import { Router } from "express";
import crypto from "node:crypto";
import pool, { query } from "./db.js";
import Stripe from "stripe";

const router = Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeClientId = process.env.STRIPE_CLIENT_ID || "ca_SvAYOYk9QkUd2sUriWHgEtwc6ewEIBqd";
const stripeStateSecret = process.env.STRIPE_STATE_SECRET;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:5173";
const stripeRedirectBaseUrl = process.env.STRIPE_REDIRECT_BASE_URL || publicBaseUrl;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

const signState = (value: string) => {
  if (!stripeStateSecret) return null;
  return crypto.createHmac("sha256", stripeStateSecret).update(value).digest("base64url");
};

const encodeState = (payload: Record<string, unknown>) => {
  if (!stripeStateSecret) return null;
  const raw = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signState(raw);
  if (!signature) return null;
  return `${raw}.${signature}`;
};

const decodeState = (state: string) => {
  if (!stripeStateSecret) return null;
  const [raw, signature] = state.split(".");
  if (!raw || !signature) return null;
  const expected = signState(raw);
  if (!expected) return null;
  const match =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const EVENT_TYPES = {
  OFFER_CREATED: "OFFER_CREATED",
  OFFER_VIEWED: "OFFER_VIEWED",
  OFFER_CLAIMED: "OFFER_CLAIMED",
  WALLET_SAVED: "WALLET_SAVED",
  REDEMPTION_COMPLETED: "REDEMPTION_COMPLETED",
  DEPOSIT_PAID: "DEPOSIT_PAID",
  REDEEMED_IRL: "REDEEMED_IRL",
  REFERRAL_INVITE_SENT: "REFERRAL_INVITE_SENT",
  REFERRAL_CONVERTED: "REFERRAL_CONVERTED",
} as const;

const isPositiveInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const getUserIdFromRequest = (req: any) => {
  const headerValue = req.headers["x-user-id"];
  const queryValue = req.query?.user_id;
  const bodyValue = req.body?.user_id;
  const raw = headerValue ?? queryValue ?? bodyValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const loadUserById = async (userId: number) => {
  const result = await query(
    "SELECT id, name, role, bio, phone, image_url, username, stripe_account_id, created_at FROM users WHERE id = $1",
    [userId]
  );
  return result.rowCount > 0 ? result.rows[0] : null;
};

const requireUser = async (req: any, res: any, next: any) => {
  const userId = getUserIdFromRequest(req);
  if (!userId || !isPositiveInteger(userId)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const user = await loadUserById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  req.user = user;
  return next();
};

const requireHost = async (req: any, res: any, next: any) => {
  await requireUser(req, res, async () => {
    if (!req.user?.stripe_account_id) {
      return res.status(401).json({ error: "stripe_not_connected" });
    }
    return next();
  });
};

const updateClaimStatus = async ({
  claimId,
  status,
  depositPaymentIntentId,
  balancePaymentIntentId,
  redeemedAt,
}: {
  claimId: number;
  status?: string;
  depositPaymentIntentId?: string | null;
  balancePaymentIntentId?: string | null;
  redeemedAt?: string | null;
}) => {
  await query(
    "UPDATE claims SET status = COALESCE($1, status), deposit_payment_intent_id = COALESCE($2, deposit_payment_intent_id), balance_payment_intent_id = COALESCE($3, balance_payment_intent_id), redeemed_at = COALESCE($4, redeemed_at) WHERE id = $5",
    [status ?? null, depositPaymentIntentId ?? null, balancePaymentIntentId ?? null, redeemedAt ?? null, claimId]
  );
};

router.post("/users", async (req, res) => {
  const { name, bio, phone, image_url, username, role } = req.body;

  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Invalid user payload" });
  }

  const normalizedRole = role === "creator" || role === "customer" ? role : "creator";
  const normalizedUsername = isNonEmptyString(username)
    ? username.trim().toLowerCase()
    : name.trim().split(/\s+/)[0].toLowerCase();

  const existing = await query("SELECT id FROM users WHERE username = $1", [normalizedUsername]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: "Handle already exists" });
  }

  const result = await query(
    "INSERT INTO users (name, role, bio, phone, image_url, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, role, bio, phone, image_url, username, created_at",
    [name.trim(), normalizedRole, bio ?? "", phone ?? "", image_url ?? null, normalizedUsername]
  );

  return res.status(201).json({ user: result.rows[0] });
});

router.patch("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { name, image_url, username } = req.body;

  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const userResult = await query("SELECT id FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
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

router.get("/me", requireUser, async (req: any, res) => {
  return res.json({ user: req.user });
});

router.patch("/me", requireUser, async (req: any, res) => {
  const { name, photo_url, handle } = req.body || {};
  const nextHandle = isNonEmptyString(handle) ? handle.trim().toLowerCase() : null;
  if (nextHandle) {
    const existing = await query("SELECT id FROM users WHERE username = $1 AND id <> $2", [
      nextHandle,
      req.user.id,
    ]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "handle_taken" });
    }
  }
  const result = await query(
    "UPDATE users SET name = COALESCE($1, name), image_url = COALESCE($2, image_url), username = COALESCE($3, username) WHERE id = $4 RETURNING id, name, role, bio, phone, image_url, username, stripe_account_id, created_at",
    [isNonEmptyString(name) ? name.trim() : null, isNonEmptyString(photo_url) ? photo_url : null, nextHandle, req.user.id]
  );
  return res.json({ user: result.rows[0] });
});

router.post("/stripe/connect_link", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId || !isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  if (!stripeClientId) {
    return res.status(500).json({ error: "Stripe client id not configured" });
  }
  if (!stripeStateSecret) {
    return res.status(500).json({ error: "Stripe state secret not configured" });
  }
  const state = encodeState({ user_id: userId, issued_at: Date.now() });
  if (!state) {
    return res.status(500).json({ error: "Stripe state not configured" });
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: stripeClientId,
    scope: "read_write",
    redirect_uri: `${stripeRedirectBaseUrl}/stripe/callback`,
    state,
  });
  return res.json({ url: `https://connect.stripe.com/oauth/authorize?${params.toString()}` });
});

router.post("/offers", async (req, res) => {
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
  } = req.body;

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
    return res.status(400).json({ error: "Invalid offer payload" });
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
    return res.status(500).json({ error: "Unable to create offer" });
  } finally {
    client.release();
  }
});

router.get("/offers/:offer_id", async (req, res) => {
  const offerId = Number(req.params.offer_id);

  if (!isPositiveInteger(offerId)) {
    return res.status(400).json({ error: "Invalid offer id" });
  }

  const offerResult = await query(
    "SELECT id, creator_id, title, price_cents, deposit_cents, payment_mode, capacity, location_text, description, image_url, created_at FROM offers WHERE id = $1",
    [offerId]
  );

  if (offerResult.rowCount === 0) {
    return res.status(404).json({ error: "Offer not found" });
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

router.post("/claims", async (req, res) => {
  const { offer_id, user_id, slot_id, address, referral_code } = req.body;

  if (!isPositiveInteger(offer_id) || !isPositiveInteger(user_id)) {
    return res.status(400).json({ error: "Invalid claim payload" });
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
      return res.status(404).json({ error: "Offer not found" });
    }

    if (slot_id) {
      const slotResult = await client.query(
        "SELECT id, remaining_capacity FROM offer_slots WHERE id = $1 AND offer_id = $2 FOR UPDATE",
        [slot_id, offer_id]
      );
      if (slotResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Slot not found" });
      }
      const remaining = Number(slotResult.rows[0].remaining_capacity);
      if (remaining <= 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Slot full" });
      }
      await client.query(
        "UPDATE offer_slots SET remaining_capacity = remaining_capacity - 1 WHERE id = $1",
        [slot_id]
      );
    }

    const claimResult = await client.query(
      "INSERT INTO claims (offer_id, user_id, slot_id, address, deposit_cents) VALUES ($1, $2, $3, $4, $5) RETURNING id, offer_id, user_id, slot_id, address, deposit_cents, created_at",
      [
        offer_id,
        user_id,
        slot_id ?? null,
        address ?? null,
        offerResult.rows[0].deposit_cents,
      ]
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
    return res.status(500).json({ error: "Unable to create claim" });
  } finally {
    client.release();
  }
});

router.post("/sessions/init", async (req, res) => {
  const { host_handle, amount_cents } = req.body || {};
  if (!isNonEmptyString(host_handle) || !isNonNegativeInteger(amount_cents)) {
    return res.status(400).json({ error: "Invalid session payload" });
  }

  const hostResult = await query(
    "SELECT id, stripe_account_id, stripe_access_token FROM users WHERE LOWER(username) = $1",
    [host_handle.trim().toLowerCase()]
  );
  if (hostResult.rowCount === 0) {
    return res.status(404).json({ error: "Host not found" });
  }
  const host = hostResult.rows[0];
  if (amount_cents > 0 && (!host.stripe_account_id || !host.stripe_access_token)) {
    return res.status(409).json({ error: "host_not_connected" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const guestName = "Guest";
    const guestUsername = `guest-${Date.now().toString(36)}`;
    const guestResult = await client.query(
      "INSERT INTO users (name, role, username) VALUES ($1, $2, $3) RETURNING id",
      [guestName, "customer", guestUsername]
    );
    const guestId = guestResult.rows[0].id;

    const offerResult = await client.query(
      "INSERT INTO offers (creator_id, title, price_cents, deposit_cents, payment_mode, capacity, location_text, description, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, creator_id, price_cents, payment_mode",
      [host.id, "Session", amount_cents, 0, "full", 1, "In person", "", null]
    );
    const offer = offerResult.rows[0];

    const claimResult = await client.query(
      "INSERT INTO claims (offer_id, user_id, deposit_cents) VALUES ($1, $2, $3) RETURNING id",
      [offer.id, guestId, 0]
    );
    const claimId = claimResult.rows[0].id;

    await client.query(
      "INSERT INTO events (user_id, type, ref_id, metadata) VALUES ($1, $2, $3, $4)",
      [host.id, EVENT_TYPES.OFFER_CLAIMED, claimId, null]
    );

    await client.query("COMMIT");

    if (amount_cents === 0) {
      await query(
        "INSERT INTO payments (claim_id, amount_cents, status, provider, provider_ref) VALUES ($1, $2, $3, $4, $5)",
        [claimId, 0, "zero", "stripe", null]
      );
      return res.status(201).json({ session_id: claimId, amount_cents, status: "zero" });
    }

    const amountCents = amount_cents;
    const creatorStripe = new Stripe(host.stripe_access_token, { apiVersion: "2024-06-20" });
    const metadata = {
      claim_id: String(claimId),
      offer_id: String(offer.id),
      creator_id: String(host.id),
      purpose: "payment",
    };
    const session = await creatorStripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${publicBaseUrl}/${host_handle}?paid=1&claim=${claimId}`,
      cancel_url: `${publicBaseUrl}/${host_handle}?cancel=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: "Session" },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
    });

    await query(
      "INSERT INTO payments (claim_id, amount_cents, status, provider, provider_ref) VALUES ($1, $2, $3, $4, $5)",
      [claimId, amountCents, "pending", "stripe", session.id]
    );

    return res.status(201).json({ session_id: claimId, amount_cents, checkout_url: session.url });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Unable to create session" });
  } finally {
    client.release();
  }
});

router.post("/sessions/:id/redeem", requireHost, async (req: any, res) => {
  const sessionId = Number(req.params.id);
  if (!isPositiveInteger(sessionId)) {
    return res.status(400).json({ error: "Invalid session id" });
  }
  const sessionResult = await query(
    "SELECT c.id, c.status, c.redeemed_at, o.creator_id, o.price_cents FROM claims c JOIN offers o ON o.id = c.offer_id WHERE c.id = $1",
    [sessionId]
  );
  if (sessionResult.rowCount === 0) {
    return res.status(404).json({ error: "Session not found" });
  }
  const session = sessionResult.rows[0];
  if (Number(session.creator_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (session.price_cents > 0) {
    const paymentResult = await query(
      "SELECT status FROM payments WHERE claim_id = $1 ORDER BY created_at DESC LIMIT 1",
      [sessionId]
    );
    if (paymentResult.rowCount === 0) {
      return res.status(409).json({ error: "payment_required" });
    }
    const status = paymentResult.rows[0].status;
    if (!["paid", "succeeded", "zero"].includes(status)) {
      return res.status(409).json({ error: "payment_pending" });
    }
  }

  const redeemedAt = new Date().toISOString();
  await updateClaimStatus({ claimId: sessionId, status: "redeemed", redeemedAt });
  await query("INSERT INTO redemptions (claim_id) VALUES ($1) ON CONFLICT DO NOTHING", [
    sessionId,
  ]);
  await query(
    "INSERT INTO events (user_id, type, ref_id) VALUES ($1, $2, $3)",
    [req.user.id, EVENT_TYPES.REDEMPTION_COMPLETED, sessionId]
  );

  const lastPaidResult = await query(
    "SELECT o.price_cents FROM redemptions r JOIN claims c ON c.id = r.claim_id JOIN offers o ON o.id = c.offer_id WHERE o.creator_id = $1 AND o.price_cents > 0 ORDER BY r.redeemed_at DESC NULLS LAST, r.created_at DESC LIMIT 1",
    [req.user.id]
  );

  return res.json({
    session: {
      id: sessionId,
      amount_cents: session.price_cents,
      status: "redeemed",
      redeemed_at: redeemedAt,
    },
    last_paid_amount_cents: lastPaidResult.rowCount > 0 ? lastPaidResult.rows[0].price_cents : null,
  });
});

router.get("/sessions", requireHost, async (req: any, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const values = [req.user.id];
  let filter = "";
  if (status === "pending" || status === "redeemed") {
    if (status === "pending") {
      filter = "AND c.status IN ('pending', 'deposit_paid')";
    } else {
      values.push(status);
      filter = "AND c.status = $2";
    }
  }
  const sessionsResult = await query(
    `SELECT c.id, c.status, c.created_at, c.redeemed_at, o.price_cents, u.name AS guest_name FROM claims c JOIN offers o ON o.id = c.offer_id LEFT JOIN users u ON u.id = c.user_id WHERE o.creator_id = $1 ${filter} ORDER BY c.created_at DESC`,
    values
  );
  return res.json({ sessions: sessionsResult.rows });
});

router.post("/checkout/session", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }
  const { claim_id, return_path } = req.body;
  if (!isPositiveInteger(claim_id)) {
    return res.status(400).json({ error: "Invalid checkout payload" });
  }

  const claimResult = await query(
    "SELECT c.id, c.deposit_cents, o.id AS offer_id, o.title, o.price_cents, o.payment_mode, o.creator_id, u.stripe_account_id, u.stripe_access_token FROM claims c JOIN offers o ON o.id = c.offer_id JOIN users u ON u.id = o.creator_id WHERE c.id = $1",
    [claim_id]
  );

  if (claimResult.rowCount === 0) {
    return res.status(404).json({ error: "Claim not found" });
  }

  const claim = claimResult.rows[0];
  const amountCents = claim.payment_mode === "full" ? claim.price_cents : claim.deposit_cents;
  const creatorStripeToken = claim.stripe_access_token;
  const creatorStripeAccount = claim.stripe_account_id;
  if (!creatorStripeToken || !creatorStripeAccount) {
    return res.status(409).json({ error: "creator_not_connected" });
  }
  const creatorStripe = new Stripe(creatorStripeToken, { apiVersion: "2024-06-20" });
  const metadata = {
    claim_id: String(claim_id),
    offer_id: String(claim.offer_id),
    creator_id: String(claim.creator_id),
    purpose: "deposit",
  };
  const rawReturnPath = typeof return_path === "string" ? return_path : "/";
  const sanitizedPath = rawReturnPath.split("?")[0].split("#")[0];
  const safePath =
    sanitizedPath.startsWith("/") && !sanitizedPath.includes("://") ? sanitizedPath : "/";
  const baseUrl = new URL(publicBaseUrl);
  baseUrl.pathname = safePath;
  baseUrl.search = "";
  baseUrl.hash = "";
  const successUrl = new URL(baseUrl.toString());
  successUrl.searchParams.set("claim", String(claim_id));
  successUrl.searchParams.set("paid", "1");
  const cancelUrl = new URL(baseUrl.toString());
  cancelUrl.searchParams.set("claim", String(claim_id));
  cancelUrl.searchParams.set("cancel", "1");

  const session = await creatorStripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
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
      ...metadata,
    },
    payment_intent_data: {
      metadata,
    },
  });

  await query(
    "INSERT INTO payments (claim_id, amount_cents, status, provider, provider_ref) VALUES ($1, $2, $3, $4, $5)",
    [claim_id, amountCents, "pending", "stripe", session.id]
  );

  return res.json({ url: session.url });
});

router.post("/terminal/connection-token", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }
  const { user_id } = req.body;
  if (!isPositiveInteger(user_id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const userResult = await query(
    "SELECT stripe_account_id, stripe_access_token FROM users WHERE id = $1",
    [user_id]
  );
  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  const creatorStripeToken = userResult.rows[0].stripe_access_token;
  const creatorStripeAccount = userResult.rows[0].stripe_account_id;
  if (!creatorStripeToken || !creatorStripeAccount) {
    return res.status(409).json({ error: "creator_not_connected" });
  }
  const creatorStripe = new Stripe(creatorStripeToken, { apiVersion: "2024-06-20" });
  const token = await creatorStripe.terminal.connectionTokens.create();
  return res.json({ secret: token.secret });
});

router.post("/terminal/payment-intent", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }
  const { claim_id } = req.body;
  if (!isPositiveInteger(claim_id)) {
    return res.status(400).json({ error: "Invalid claim id" });
  }
  const claimResult = await query(
    "SELECT c.id, c.deposit_cents, o.id AS offer_id, o.title, o.price_cents, o.payment_mode, o.creator_id, u.stripe_account_id, u.stripe_access_token FROM claims c JOIN offers o ON o.id = c.offer_id JOIN users u ON u.id = o.creator_id WHERE c.id = $1",
    [claim_id]
  );
  if (claimResult.rowCount === 0) {
    return res.status(404).json({ error: "Claim not found" });
  }
  const claim = claimResult.rows[0];
  const creatorStripeToken = claim.stripe_access_token;
  const creatorStripeAccount = claim.stripe_account_id;
  if (!creatorStripeToken || !creatorStripeAccount) {
    return res.status(409).json({ error: "creator_not_connected" });
  }
  const amountCents =
    claim.payment_mode === "full"
      ? claim.price_cents
      : claim.payment_mode === "pay_in_person"
      ? claim.price_cents
      : Math.max(0, claim.price_cents - claim.deposit_cents);
  if (amountCents <= 0) {
    return res.status(409).json({ error: "balance_not_due" });
  }
  const creatorStripe = new Stripe(creatorStripeToken, { apiVersion: "2024-06-20" });
  const metadata = {
    claim_id: String(claim.id),
    offer_id: String(claim.offer_id),
    creator_id: String(claim.creator_id),
    purpose: "balance",
  };
  const paymentIntent = await creatorStripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    metadata,
  });
  return res.json({ client_secret: paymentIntent.client_secret, id: paymentIntent.id });
});

router.post("/wallet/:platform", async (req, res) => {
  const platform = req.params.platform;
  const { claim_id } = req.body;
  if (!isPositiveInteger(claim_id) || (platform !== "apple" && platform !== "google")) {
    return res.status(400).json({ error: "Invalid wallet payload" });
  }

  await query(
    "INSERT INTO wallet_passes (claim_id, platform, status) VALUES ($1, $2, $3)",
    [claim_id, platform, "created"]
  );

  return res.json({ ok: true, message: "Wallet pass generation requires credentials" });
});

router.post("/redemptions", async (req, res) => {
  const { claim_id } = req.body;

  if (!isPositiveInteger(claim_id)) {
    return res.status(400).json({ error: "Invalid redemption payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const claimResult = await client.query(
      "SELECT c.id, c.user_id, o.creator_id FROM claims c JOIN offers o ON o.id = c.offer_id WHERE c.id = $1",
      [claim_id]
    );

    if (claimResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Claim not found" });
    }

    const redemptionResult = await client.query(
      "INSERT INTO redemptions (claim_id) VALUES ($1) RETURNING id, claim_id, redeemed_at",
      [claim_id]
    );

    const creatorId = claimResult.rows[0].creator_id;

    await client.query(
      "INSERT INTO events (user_id, type, ref_id) VALUES ($1, $2, $3)",
      [creatorId, EVENT_TYPES.REDEMPTION_COMPLETED, claim_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({ redemption: redemptionResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Unable to create redemption" });
  } finally {
    client.release();
  }
});

router.get("/profile/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);

  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const userResult = await query(
    "SELECT id, name, role, bio, phone, image_url, username, stripe_account_id, created_at FROM users WHERE id = $1",
    [userId]
  );

  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
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

router.get("/u/:handle", async (req, res) => {
  const raw = typeof req.params.handle === "string" ? req.params.handle : "";
  const handle = raw.trim().toLowerCase();
  if (!isNonEmptyString(handle)) {
    return res.status(400).json({ error: "Invalid handle" });
  }

  const userResult = await query(
    "SELECT id, name, image_url, username FROM users WHERE LOWER(username) = $1 ORDER BY id ASC LIMIT 1",
    [handle]
  );

  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const userId = userResult.rows[0].id;

  const lastPaidResult = await query(
    "SELECT o.price_cents FROM redemptions r JOIN claims c ON c.id = r.claim_id JOIN offers o ON o.id = c.offer_id WHERE o.creator_id = $1 AND o.price_cents > 0 ORDER BY r.redeemed_at DESC NULLS LAST, r.created_at DESC LIMIT 1",
    [userId]
  );

  const redeemedResult = await query(
    "SELECT r.claim_id AS id, o.price_cents AS amount_cents, r.redeemed_at FROM redemptions r JOIN claims c ON c.id = r.claim_id JOIN offers o ON o.id = c.offer_id WHERE o.creator_id = $1 ORDER BY r.redeemed_at DESC NULLS LAST, r.created_at DESC LIMIT 12",
    [userId]
  );

  return res.json({
    user: {
      id: userId,
      handle: userResult.rows[0].username,
      name: userResult.rows[0].name,
      photo_url: userResult.rows[0].image_url,
    },
    last_paid_amount_cents:
      lastPaidResult.rowCount > 0 ? Number(lastPaidResult.rows[0].price_cents) : null,
    redeemed_public_sessions: redeemedResult.rows.map((row) => ({
      id: row.id,
      amount_cents: Number(row.amount_cents),
      redeemed_at: row.redeemed_at,
      proof_url: null,
    })),
  });
});

router.get("/stripe/callback", async (req, res) => {
  if (!stripe) {
    return res.status(500).send("Stripe not configured");
  }
  const code = req.query.code;
  const state = req.query.state;
  if (!code || !state || typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send("Invalid stripe callback");
  }
  const parsed = decodeState(state);
  if (!parsed) {
    return res.status(400).send("Invalid state");
  }
  const userId = Number((parsed as { user_id?: number }).user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).send("Invalid user id");
  }
  try {
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    const stripeAccountId = tokenResponse.stripe_user_id;
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const stripeName =
      account.business_profile?.name ||
      account.company?.name ||
      [account.individual?.first_name, account.individual?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      null;
    const stripePhone =
      account.business_profile?.support_phone ||
      account.company?.phone ||
      account.individual?.phone ||
      null;
    const stripeEmail =
      account.email || account.business_profile?.support_email || account.individual?.email || null;
    const stripeUrl = account.business_profile?.url || account.business_profile?.support_url || null;

    const userResult = await query(
      "SELECT name, phone, bio, username FROM users WHERE id = $1",
      [userId]
    );
    const user = userResult.rows[0] || {};
    const currentName = typeof user.name === "string" ? user.name : "";
    const nextName =
      (!currentName || currentName === "New creator") && stripeName ? stripeName : currentName;
    const currentPhone = typeof user.phone === "string" ? user.phone : "";
    const nextPhone = !currentPhone && stripePhone ? stripePhone : currentPhone;
    const currentBio = typeof user.bio === "string" ? user.bio : "";
    const nextBio = !currentBio && stripeUrl ? stripeUrl : currentBio;
    const currentUsername = typeof user.username === "string" ? user.username : "";
    const usernameSource = stripeName || nextName || currentName;
    const nextUsername =
      !currentUsername && usernameSource
        ? usernameSource.trim().split(/\s+/)[0].toLowerCase()
        : currentUsername;

    await query(
      "UPDATE users SET stripe_account_id = $1, stripe_access_token = $2, stripe_refresh_token = $3, stripe_publishable_key = $4, stripe_account_email = COALESCE($5, stripe_account_email), name = $6, phone = $7, bio = $8, username = $9 WHERE id = $10",
      [
        stripeAccountId,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.stripe_publishable_key,
        stripeEmail,
        nextName || currentName,
        nextPhone || currentPhone,
        nextBio || currentBio,
        nextUsername || currentUsername,
        userId,
      ]
    );
    return res.redirect(`${publicBaseUrl}/?connected=1&user_id=${userId}`);
  } catch (error) {
    return res.redirect(`${publicBaseUrl}/?connected=0&user_id=${userId}`);
  }
});

router.get("/stripe/connect", async (req, res) => {
  if (!stripeClientId) {
    return res.status(500).send("Stripe client id not configured");
  }
  if (!stripeStateSecret) {
    return res.status(500).send("Stripe state secret not configured");
  }
  const userId = Number(req.query.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).send("Invalid user id");
  }
  const state = encodeState({ user_id: userId, issued_at: Date.now() });
  if (!state) {
    return res.status(500).send("Stripe state not configured");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: stripeClientId,
    scope: "read_write",
    redirect_uri: `${stripeRedirectBaseUrl}/stripe/callback`,
    state,
  });
  return res.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
});

router.post("/stripe/webhook", async (req, res) => {
  if (!stripe) {
    return res.status(500).send("Stripe not configured");
  }
  if (!stripeWebhookSecret) {
    return res.status(500).send("Stripe webhook secret not configured");
  }
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).send("Missing stripe signature");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    return res.status(400).send("Webhook signature verification failed");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const claimId = Number(metadata.claim_id);
    if (Number.isFinite(claimId) && claimId > 0) {
      await updateClaimStatus({
        claimId,
        status: "deposit_paid",
        depositPaymentIntentId: session.payment_intent ? String(session.payment_intent) : null,
      });
      await query(
        "INSERT INTO events (user_id, type, ref_id, metadata) SELECT o.creator_id, $2, $3, $4 FROM claims c JOIN offers o ON o.id = c.offer_id WHERE c.id = $1",
        [claimId, EVENT_TYPES.DEPOSIT_PAID, claimId, metadata]
      );
      if (session.payment_intent) {
        await query(
          "UPDATE payments SET status = $1, provider_ref = $2 WHERE provider_ref = $3",
          ["paid", String(session.payment_intent), session.id]
        );
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const metadata = intent.metadata || {};
    const claimId = Number(metadata.claim_id);
    const purpose = metadata.purpose;
    if (Number.isFinite(claimId) && claimId > 0 && purpose === "balance") {
      await updateClaimStatus({
        claimId,
        status: "redeemed",
        balancePaymentIntentId: intent.id,
        redeemedAt: new Date().toISOString(),
      });
      await query(
        "INSERT INTO payments (claim_id, amount_cents, status, provider, provider_ref) VALUES ($1, $2, $3, $4, $5)",
        [claimId, intent.amount, "paid", "stripe_terminal", intent.id]
      );
      await query(
        "INSERT INTO events (user_id, type, ref_id, metadata) SELECT o.creator_id, $2, $3, $4 FROM claims c JOIN offers o ON o.id = c.offer_id WHERE c.id = $1",
        [claimId, EVENT_TYPES.REDEEMED_IRL, claimId, metadata]
      );
    }
  }

  return res.json({ received: true });
});

router.get("/stripe/status", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }
  const userId = Number(req.query.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const userResult = await query("SELECT stripe_account_id FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
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

router.get("/inbox/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);

  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const eventsResult = await query(
    "SELECT e.id, e.type, e.ref_id, e.created_at, u.name AS actor_name, o.title AS offer_title FROM events e LEFT JOIN claims c ON e.type IN ($2, $3) AND c.id = e.ref_id LEFT JOIN offers o ON (e.type IN ($2, $3) AND o.id = c.offer_id) OR (e.type = $4 AND o.id = e.ref_id) LEFT JOIN users u ON u.id = c.user_id WHERE e.user_id = $1 ORDER BY e.created_at DESC",
    [userId, EVENT_TYPES.OFFER_CLAIMED, EVENT_TYPES.REDEMPTION_COMPLETED, EVENT_TYPES.OFFER_CREATED]
  );

  return res.json({ events: eventsResult.rows });
});

router.get("/metrics/kfactor/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);
  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
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

router.post("/events", async (req, res) => {
  const { user_id, type, ref_id, metadata } = req.body;

  if (!isPositiveInteger(user_id) || !isNonEmptyString(type)) {
    return res.status(400).json({ error: "Invalid event payload" });
  }

  await query(
    "INSERT INTO events (user_id, type, ref_id, metadata) VALUES ($1, $2, $3, $4)",
    [user_id, type, ref_id ?? null, metadata ?? null]
  );

  return res.json({ ok: true });
});

router.post("/referrals", async (req, res) => {
  const { inviter_id, offer_id } = req.body;

  if (!isPositiveInteger(inviter_id) || !isPositiveInteger(offer_id)) {
    return res.status(400).json({ error: "Invalid referral payload" });
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

export default router;
