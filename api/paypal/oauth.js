/**
 * api/paypal/oauth.js
 *
 * 1) If no 'code', redirect user to PayPal sign-in.
 * 2) If 'code', exchange for token, check for id_token => decode or call userinfo, then redirect back to React.
 */

import express from "express";
import querystring from "querystring";

// If you don't already have a JWT decode utility,
// you can install: npm i jwt-decode
// or write your own basic function. We'll illustrate with a minimal approach here.
import jwtDecode from "jwt-decode";

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

    const redirectURI = `${APP_URL}/api/paypal/oauth`;

    // 1) If no code => send user to PayPal sign-in
    if (!code) {
      console.log("[oauth.js] => No 'code' found, redirecting to PayPal sign-in");
      const scopeParam = encodeURIComponent("openid profile email"); // => "openid%20profile%20email"

      // We'll remove extra spaces from the final URL
      const paypalAuthUrl = `https://www.paypal.com/signin/authorize?response_type=code
        &client_id=${clientId}
        &scope=${scopeParam}
        &redirect_uri=${encodeURIComponent(redirectURI)}`.replace(/\s+/g, "");

      console.log("[oauth.js] => PayPal Auth URL =>", paypalAuthUrl);
      return res.redirect(paypalAuthUrl);
    }

    console.log("[oauth.js] => 'code' found, exchanging for token...");
    const tokenResponse = await fetch("https://api.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
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
    console.log("[oauth.js] => tokenJson =>", tokenJson);

    const accessToken = tokenJson.access_token;
    console.log("[oauth.js] => Access token received =>", !!accessToken);

    // 2.5) Check if there's an id_token. If yes, decode it for user info.
    let userinfo = null;
    if (tokenJson.id_token) {
      console.log("[oauth.js] => Found id_token => decoding...");
      try {
        userinfo = jwtDecode(tokenJson.id_token);
        console.log("[oauth.js] => Decoded id_token =>", userinfo);
      } catch (decodeErr) {
        console.error("[oauth.js] => Error decoding id_token =>", decodeErr);
        // fallback => try userinfo endpoint if decode fails
      }
    }

    // 3) If no userinfo from id_token, or decode failed => call userinfo
    if (!userinfo) {
      console.log("[oauth.js] => No or invalid id_token, calling userinfo...");
      const userInfoResp = await fetch(
        "https://api.paypal.com/v1/identity/openidconnect/userinfo?schema=openid",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json", // Ensure JSON
          },
        }
      );

      const rawText = await userInfoResp.text();
      console.log("[oauth.js] => Raw userinfo body =>", rawText);

      if (!userInfoResp.ok) {
        console.error("[oauth.js] => userinfo status =>", userInfoResp.status);
        let errData;
        try {
          errData = JSON.parse(rawText);
        } catch {
          errData = { error: "non-json response", body: rawText };
        }

        return res.status(400).json({
          error: "User info request failed",
          details: errData,
        });
      }

      try {
        userinfo = JSON.parse(rawText);
      } catch (parseErr) {
        console.error("[oauth.js] => userinfo parse error =>", parseErr);
        return res.status(500).json({ error: parseErr.message });
      }
      console.log("[oauth.js] => PayPal userinfo =>", userinfo);
    }

    // 4) Fallbacks for user name & email
    // For id_token or userinfo, typical fields are "email" or "given_name"
    const paypalEmail = userinfo.email || ""; // we expect some email
    const userName =
      userinfo.name ||
      userinfo.given_name ||
      paypalEmail ||
      "New User";

    // 5) Redirect back to your app with user's info in query params
    console.log(
      `[oauth.js] => Done! Redirecting back to ${APP_URL} with query params: paypal_email=${paypalEmail}, name=${userName}`
    );

    const finalUrl = `${APP_URL}?paypal_email=${encodeURIComponent(paypalEmail)}&name=${encodeURIComponent(userName)}`;
    return res.redirect(finalUrl);

  } catch (err) {
    console.error("[oauth.js] => PayPal OAuth error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// CATCH-ALL
app.use((req, res) => {
  console.log("[oauth.js] => Express catch-all => path =>", req.path);
  return res.status(404).json({
    error: "No matching route in /api/paypal/oauth.js",
    path: req.path,
  });
});

// Vercel entry point
export default (req, res) => {
  return app(req, res);
};
