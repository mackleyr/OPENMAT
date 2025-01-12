// pages/api/paypal/oauth.js
import querystring from "querystring";
import fetch from "node-fetch";

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const APP_URL = process.env.REACT_APP_DOMAIN || "http://localhost:3000";

// This route either:
// 1) If there's no "code", redirects to PayPal's login/authorize
// 2) If there's a "code", does the token exchange + fetch user info, returns user to Onboarding
export default async function handler(req, res) {
  const { code } = req.query;

  // If no code => redirect user to PayPal
  if (!code) {
    const redirectURI = `${APP_URL}/api/paypal/oauth`; 
    // Use "openid profile email" scope so we can get user info
    const paypalAuthUrl = `https://www.paypal.com/signin/authorize?response_type=code&client_id=${clientId}&scope=openid profile email&redirect_uri=${encodeURIComponent(
      redirectURI
    )}`;
    return res.redirect(paypalAuthUrl);
  }

  // If we have code => exchange for token
  try {
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
      console.error("Exchange code error =>", errData);
      return res.status(400).json({ error: "Exchange failed", details: errData });
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;

    // Use the token to get user info
    const userInfoResp = await fetch(
      "https://api-m.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userInfoResp.ok) {
      const errData = await userInfoResp.json();
      console.error("Fetch user info error =>", errData);
      return res.status(400).json({ error: "Userinfo failed", details: errData });
    }

    const userInfo = await userInfoResp.json();
    console.log("PayPal userinfo =>", userInfo);

    const paypalEmail = userInfo.email;
    const userName = userInfo.name || userInfo.given_name || "New User";

    // Redirect user back to /onboarding w/ verified email & name
    const finalUrl = `${APP_URL}/onboarding?paypal_email=${encodeURIComponent(
      paypalEmail
    )}&name=${encodeURIComponent(userName)}`;

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("OAuth error =>", err);
    return res.status(500).json({ error: err.message });
  }
}
