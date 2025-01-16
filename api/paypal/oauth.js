/**
 * api/paypal/oauth.js
 *
 * Express-based PayPal OAuth:
 *   1. If no 'code', redirect user to PayPal sign-in.
 *   2. If 'code', exchange for token, get user info, redirect back to React.
 */

import express from "express";
import querystring from "querystring";

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const APP_URL = process.env.REACT_APP_DOMAIN || "https://www.and.deals";

// Create Express app
const app = express();

app.get(["/", "/api/paypal/oauth"], async (req, res) => {
  console.log("[oauth.js] => Default export invoked => calling app(req, res)");
  console.log("[oauth.js] => Express sees path =>", req.path);

  try {
    const { code } = req.query;
    console.log("[oauth.js] => Query params =>", req.query);

    // Define redirectURI once so we can use it in both branches
    const redirectURI = `${APP_URL}/api/paypal/oauth`;

    // 1) If no code => send user to PayPal sign-in
    if (!code) {
      console.log("[oauth.js] => No 'code' found, redirecting to PayPal sign-in");
      
      // Build the authorize URL
      const paypalAuthUrl = `https://www.paypal.com/signin/authorize?response_type=code&client_id=${clientId}&scope=openid profile email&redirect_uri=${encodeURIComponent(
        redirectURI
      )}`;
      console.log("[oauth.js] => PayPal Auth URL =>", paypalAuthUrl);
      
      return res.redirect(paypalAuthUrl);
    }

    console.log("[oauth.js] => 'code' found, exchanging for token...");

    // 2) Exchange 'code' for an access token (using Node 18+ fetch)
    const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      // IMPORTANT: Pass the same redirect_uri used above
      body: querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectURI,
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      console.error("[oauth.js] => Token exchange error:", errData);
      return res.status(400).json({
        error: "Token exchange failed",
        details: errData,
      });
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;
    console.log("[oauth.js] => Access token received =>", !!accessToken);

    // 3) Use access token to retrieve user info
    console.log("[oauth.js] => Fetching user info from PayPal...");
    const userInfoResp = await fetch(
      "https://api-m.paypal.com/v1/identity/openidconnect/userinfo?schema=openid",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userInfoResp.ok) {
      const errData = await userInfoResp.json();
      console.error("[oauth.js] => User info error:", errData);
      return res.status(400).json({
        error: "User info request failed",
        details: errData,
      });
    }

    const userinfo = await userInfoResp.json();
    console.log("[oauth.js] => PayPal userinfo =>", userinfo);

    const paypalEmail = userinfo.email;
    const userName = userinfo.name || userinfo.given_name || "New User";

    // 4) Redirect back to your app with the user’s info in query params
    console.log(
      `[oauth.js] => Done! Redirecting back to ${APP_URL} with query params: paypal_email=${paypalEmail}, name=${userName}`
    );
    const finalUrl = `${APP_URL}?paypal_email=${encodeURIComponent(paypalEmail)}&name=${encodeURIComponent(
      userName
    )}`;

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("[oauth.js] => PayPal OAuth error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * CATCH-ALL for debugging
 */
app.use((req, res) => {
  console.log("[oauth.js] => Express catch-all => path =>", req.path);
  return res.status(404).json({
    error: "No matching route in /api/paypal/oauth.js",
    path: req.path,
  });
});

/**
 * Vercel calls this default export with (req, res).
 * We run app(req, res) to handle the route at "/".
 */
export default (req, res) => {
  return app(req, res);
};
