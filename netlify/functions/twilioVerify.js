// netlify/functions/twilioVerify.js

const twilio = require("twilio");

// Netlify injects these env vars at runtime (set them in Netlify UI)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

/**
 * Netlify serverless handler
 */
exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { mode, phone, code } = body;

    const client = twilio(accountSid, authToken);

    if (mode === "start") {
      // 1) Send code via SMS
      await client.verify.services(verifyServiceSid).verifications.create({
        to: phone, // e.g. '+1XXXXXXXXXX'
        channel: "sms",
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Code sent" }),
      };
    }

    if (mode === "check") {
      // 2) Verify user’s code
      const check = await client.verify
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code });

      if (check.status === "approved") {
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, message: "Code correct" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: "Code incorrect or expired",
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: "Invalid mode" }),
    };
  } catch (err) {
    console.error("twilioVerify error =>", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message }),
    };
  }
};
