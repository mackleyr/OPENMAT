/**
 * /api/paypal/oauth.js
 *
 * Express-like route to handle PayPal OAuth handshake:
 *  1. If no 'code' => redirect user to PayPal sign-in.
 *  2. If 'code' => exchange for token, get user info, then redirect to your React app.
 */

import express from "express";
import querystring from "querystring";
import fetch from "node-fetch";

const router = express.Router();

// From .env
const clientId = process.env.PAYPAL_CLIENT_ID; 
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
// This is where we ultimately want to send the user (your React app's domain).
const APP_URL = process.env.REACT_APP_DOMAIN || "https://www.and.deals";

router.get("/paypal/oauth", async (req, res) => {
  try {
    const { code } = req.query;

    // Step 1: No 'code'? => We redirect user to PayPal to sign in
    if (!code) {
      const redirectURI = `${APP_URL}/api/paypal/oauth`; // This route
      const paypalAuthUrl = `https://www.paypal.com/signin/authorize?response_type=code&client_id=${clientId}&scope=openid profile email&redirect_uri=${encodeURIComponent(
        redirectURI
      )}`;
      return res.redirect(paypalAuthUrl);
    }

    // Step 2: We got a 'code'. Exchange it for an access token
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
      return res
        .status(400)
        .json({ error: "Token exchange failed", details: errData });
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
      return res
        .status(400)
        .json({ error: "User info request failed", details: errData });
    }

    const userinfo = await userinfoResp.json();
    console.log("PayPal userinfo =>", userinfo);

    // Extract the user’s PayPal email and name
    const paypalEmail = userinfo.email;
    const userName =
      userinfo.name || userinfo.given_name || userinfo.family_name || "New User";

    // Step 4: Redirect back to your React app with query params
    // so it can auto-fill the OnboardingForm
    const finalUrl = `${APP_URL}?paypal_email=${encodeURIComponent(
      paypalEmail
    )}&name=${encodeURIComponent(userName)}`;

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("PayPal OAuth error =>", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
