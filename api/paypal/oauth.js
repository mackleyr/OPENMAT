/**
 * api/paypal/oauth.js
 *
 * Express-based PayPal OAuth:
 *   1. If no 'code', redirect user to PayPal sign-in.
 *   2. If 'code', exchange for token, get user info, redirect back to React.
 */

import express from "express";
import querystring from "querystring";

// Env vars
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const APP_URL = process.env.REACT_APP_DOMAIN || "https://www.and.deals";

// Create an Express app
const app = express();

/**
 *  GET /
 *  Because Vercel mounts this file at "/api/paypal/oauth", 
 *  the route is effectively "/api/paypal/oauth" in production.
 */
app.get("/", async (req, res) => {
  try {
    const { code } = req.query;

    // 1) If no code => send user to PayPal sign-in
    if (!code) {
      const redirectURI = `${APP_URL}/api/paypal/oauth`; // This same endpoint
      const paypalAuthUrl = `https://www.paypal.com/signin/authorize?response_type=code&client_id=${clientId}&scope=openid profile email&redirect_uri=${encodeURIComponent(
        redirectURI
      )}`;
      return res.redirect(paypalAuthUrl);
    }

    // 2) Got 'code' => exchange it for an access token (use built-in fetch in Node 18)
    const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: querystring.stringify({ grant_type: "authorization_code", code }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      console.error("Token exchange error:", errData);
      return res.status(400).json({ error: "Token exchange failed", details: errData });
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;

    // 3) Use access token to get user info
    const userInfoResp = await fetch(
      "https://api-m.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!userInfoResp.ok) {
      const errData = await userInfoResp.json();
      console.error("User info error:", errData);
      return res.status(400).json({ error: "User info request failed", details: errData });
    }

    const userinfo = await userInfoResp.json();
    console.log("PayPal userinfo =>", userinfo);

    const paypalEmail = userinfo.email;
    const userName = userinfo.name || userinfo.given_name || "New User";

    // 4) Finally, redirect back to your app
    const finalUrl = `${APP_URL}?paypal_email=${encodeURIComponent(
      paypalEmail
    )}&name=${encodeURIComponent(userName)}`;
    return res.redirect(finalUrl);
  } catch (err) {
    console.error("PayPal OAuth error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Vercel calls this default export with (req, res).
 * We run app(req, res) to handle the route at "/".
 */
export default (req, res) => {
  return app(req, res);
};
