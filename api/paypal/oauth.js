/**
 * /api/paypal/oauth.js
 *
 * Express-based route to handle PayPal OAuth handshake:
 *  1. If no 'code' => redirect user to PayPal sign-in.
 *  2. If 'code' => exchange for token, get user info, then redirect to your React app.
 */

import express from "express";
import querystring from "querystring";

// From .env
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// This is where we ultimately want to send the user (your React app).
const APP_URL = process.env.REACT_APP_DOMAIN || "https://www.and.deals";

// Create the Express app
const app = express();

/**
 * GET /paypal/oauth
 * - Step 1: If no "code", redirect to PayPal.
 * - Step 2: If "code" exists, exchange for token, get user info, redirect back to your React app.
 */
app.get("/paypal/oauth", async (req, res) => {
  try {
    const { code } = req.query;

    // Step 1: No 'code'? => Redirect user to PayPal to sign in
    if (!code) {
      const redirectURI = `${APP_URL}/api/paypal/oauth`; // This route
      const paypalAuthUrl = `https://www.paypal.com/signin/authorize?response_type=code&client_id=${clientId}&scope=openid profile email&redirect_uri=${encodeURIComponent(
        redirectURI
      )}`;
      return res.redirect(paypalAuthUrl);
    }

    // Step 2: We got 'code'. Exchange it for an access token (built-in fetch on Node 18)
    const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: querystring.stringify({
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      console.error("PayPal token exchange error =>", errData);
      return res.status(400).json({
        error: "Token exchange failed",
        details: errData,
      });
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;

    // Step 3: Use the access token to get user info
    const userinfoResp = await fetch(
      "https://api-m.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userinfoResp.ok) {
      const errData = await userinfoResp.json();
      console.error("PayPal user info error =>", errData);
      return res.status(400).json({
        error: "User info request failed",
        details: errData,
      });
    }

    const userinfo = await userinfoResp.json();
    console.log("PayPal userinfo =>", userinfo);

    // Extract the user’s PayPal email and name
    const paypalEmail = userinfo.email;
    const userName =
      userinfo.name || userinfo.given_name || userinfo.family_name || "New User";

    // Step 4: Redirect back to your React app with ?paypal_email=... & name=...
    const finalUrl = `${APP_URL}?paypal_email=${encodeURIComponent(
      paypalEmail
    )}&name=${encodeURIComponent(userName)}`;

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("PayPal OAuth error =>", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Export a default function for Vercel to invoke.
 * This is crucial so that Vercel sees `(req, res) => app(req, res)`.
 */
export default (req, res) => {
  return app(req, res);
};
