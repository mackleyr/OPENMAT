// /api/twilio/twilioVerify.js
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// For simple CORS on Vercel, we can manually add headers. 
// Or rely on Next.js' config. We'll do manual here for an MVP:
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req, res) {
  try {
    // 1) Handle OPTIONS (CORS preflight)
    if (req.method === "OPTIONS") {
      res.writeHead(200, CORS_HEADERS);
      return res.end(JSON.stringify({ ok: true }));
    }

    // 2) Only allow POST
    if (req.method !== "POST") {
      res.writeHead(405, CORS_HEADERS);
      return res.end(
        JSON.stringify({
          success: false,
          message: "Only POST requests are allowed.",
        })
      );
    }

    // 3) Parse the body
    const { mode, phone, code } = req.body || {};

    // 4) If missing Twilio credentials, return gracefully
    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error("Missing Twilio environment variables");
      res.writeHead(500, CORS_HEADERS);
      return res.end(
        JSON.stringify({
          success: false,
          message: "Server misconfiguration. Missing Twilio env vars.",
        })
      );
    }

    // 5) Instantiate Twilio
    const client = twilio(accountSid, authToken);

    // 6) "mode" logic
    if (mode === "start") {
      // Send code via SMS
      await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({ to: phone, channel: "sms" });

      res.writeHead(200, CORS_HEADERS);
      return res.end(JSON.stringify({ success: true, message: "Code sent" }));
    }

    if (mode === "check") {
      // Verify the code
      const check = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code });

      if (check.status === "approved") {
        res.writeHead(200, CORS_HEADERS);
        return res.end(JSON.stringify({ success: true, message: "Code correct" }));
      } else {
        res.writeHead(200, CORS_HEADERS);
        return res.end(
          JSON.stringify({
            success: false,
            message: "Code incorrect or expired",
          })
        );
      }
    }

    // fallback => invalid mode
    res.writeHead(400, CORS_HEADERS);
    return res.end(
      JSON.stringify({ success: false, message: "Invalid mode. Use 'start' or 'check'." })
    );
  } catch (err) {
    console.error("twilioVerify error =>", err);
    res.writeHead(500, CORS_HEADERS);
    return res.end(
      JSON.stringify({ success: false, message: err.message || "Internal Error" })
    );
  }
}
