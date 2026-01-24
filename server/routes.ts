import { Router } from "express";
import pool, { query } from "./db";

const router = Router();

const EVENT_TYPES = {
  OFFER_VIEWED: "OFFER_VIEWED",
  OFFER_CLAIMED: "OFFER_CLAIMED",
  REDEMPTION_COMPLETED: "REDEMPTION_COMPLETED",
} as const;

const isPositiveInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

router.post("/offers", async (req, res) => {
  const { creator_id, title, price_cents, capacity } = req.body;

  if (
    !isPositiveInteger(creator_id) ||
    !isNonEmptyString(title) ||
    !isNonNegativeInteger(price_cents) ||
    !isPositiveInteger(capacity)
  ) {
    return res.status(400).json({ error: "Invalid offer payload" });
  }

  const result = await query(
    "INSERT INTO offers (creator_id, title, price_cents, capacity) VALUES ($1, $2, $3, $4) RETURNING id, creator_id, title, price_cents, capacity, created_at",
    [creator_id, title.trim(), price_cents, capacity]
  );

  return res.status(201).json({ offer: result.rows[0] });
});

router.post("/claims", async (req, res) => {
  const { offer_id, user_id } = req.body;

  if (!isPositiveInteger(offer_id) || !isPositiveInteger(user_id)) {
    return res.status(400).json({ error: "Invalid claim payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const offerResult = await client.query(
      "SELECT id, creator_id FROM offers WHERE id = $1",
      [offer_id]
    );

    if (offerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Offer not found" });
    }

    const claimResult = await client.query(
      "INSERT INTO claims (offer_id, user_id) VALUES ($1, $2) RETURNING id, offer_id, user_id, created_at",
      [offer_id, user_id]
    );

    const claim = claimResult.rows[0];
    const creatorId = offerResult.rows[0].creator_id;

    await client.query(
      "INSERT INTO events (user_id, type, ref_id) VALUES ($1, $2, $3)",
      [creatorId, EVENT_TYPES.OFFER_CLAIMED, claim.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({ claim });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Unable to create claim" });
  } finally {
    client.release();
  }
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
    "SELECT id, name, role, created_at FROM users WHERE id = $1",
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
    "SELECT o.id, o.title, o.price_cents, o.capacity, o.created_at, COUNT(c.id) AS claimed_count FROM offers o LEFT JOIN claims c ON c.offer_id = o.id WHERE o.creator_id = $1 GROUP BY o.id ORDER BY o.created_at DESC",
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

router.get("/inbox/:user_id", async (req, res) => {
  const userId = Number(req.params.user_id);

  if (!isPositiveInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const eventsResult = await query(
    "SELECT e.id, e.type, e.ref_id, e.created_at, u.name AS actor_name, o.title AS offer_title FROM events e LEFT JOIN claims c ON e.type IN ($2, $3) AND c.id = e.ref_id LEFT JOIN offers o ON (e.type IN ($2, $3) AND o.id = c.offer_id) OR (e.type = $4 AND o.id = e.ref_id) LEFT JOIN users u ON u.id = c.user_id WHERE e.user_id = $1 ORDER BY e.created_at DESC",
    [userId, EVENT_TYPES.OFFER_CLAIMED, EVENT_TYPES.REDEMPTION_COMPLETED, EVENT_TYPES.OFFER_VIEWED]
  );

  return res.json({ events: eventsResult.rows });
});

export default router;
