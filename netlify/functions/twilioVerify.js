// netlify/functions/twilioVerify.js

const twilio = require("twilio");

// Netlify injects these env vars at runtime (set them in Netlify UI)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Common CORS headers we want on every response
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event, context) => {
  try {
    // 1) Handle OPTIONS (CORS preflight) 
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true }),
      };
    }

    // 2) Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405, // method not allowed
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Only POST requests are allowed.",
        }),
      };
    }

    // 3) Parse the body
    const body = JSON.parse(event.body || "{}");
    const { mode, phone, code } = body;

    // 4) If missing Twilio credentials, return gracefully 
    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error("Missing Twilio environment variables");
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: "Server misconfiguration. Missing Twilio env vars.",
        }),
      };
    }

    // 5) Instantiate Twilio
    const client = twilio(accountSid, authToken);

    // 6) "mode" logic
    if (mode === "start") {
      // Send code via SMS
      await client.verify
        .services(verifyServiceSid)
        .verifications.create({ to: phone, channel: "sms" });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, message: "Code sent" }),
      };
    }

    if (mode === "check") {
      // Verify the code
      const check = await client.verify
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code });

      if (check.status === "approved") {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, message: "Code correct" }),
        };
      } else {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            message: "Code incorrect or expired",
          }),
        };
      }
    }

    // If mode is neither 'start' nor 'check'
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: "Invalid mode. Use 'start' or 'check'.",
      }),
    };
  } catch (err) {
    console.error("twilioVerify error =>", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
