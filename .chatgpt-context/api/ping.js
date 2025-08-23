// /api/ping.js
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://openmat.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  res.status(200).json({ ok: true, pong: true, from: "vercel-node" });
}
