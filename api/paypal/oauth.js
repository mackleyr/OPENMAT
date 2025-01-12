// api/paypal/oauth.js
export default function handler(req, res) {
    console.log("[oauth.js] => Minimal test");
    return res.json({ msg: "Hello from /api/paypal/oauth" });
  }
  