// api/webhooks/stripe.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Disable body parsing so we can verify Stripe signature
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Server-side Supabase client (service role)
const supabase = createClient(
  process.env.PROJECT_SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY
);

async function readBuffer(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    const buf = await readBuffer(req);
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[webhooks/stripe] signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const amount = (s.amount_total ?? 0) / 100; // dollars
    const action = `gave $${amount.toFixed(2)}`;

    // Minimal write to match your ActivityLog shape
    const { error } = await supabase.from("activities").insert([
      {
        deal_id: "default", // your ActivityLog filters by deal_id
        user_id: null,      // anonymous for now
        action,
        value: amount,      // optional numeric value
      },
    ]);

    if (error) console.error("[webhooks/stripe] supabase insert error:", error);
  }

  return res.status(200).json({ received: true });
}
