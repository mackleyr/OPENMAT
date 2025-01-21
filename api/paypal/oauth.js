/**
 * api/paypal/oauth.js
 *
 * IMPORTANT CHANGE:
 *   - We only define `app.get("/api/paypal/oauth", ...)`, removing the old array ["/", "/api/paypal/oauth"].
 */
import express from "express";
import querystring from "querystring";
import jwtDecode from "jwt-decode";

const {
  PAYPAL_ENV,
  PAYPAL_SANDBOX_CLIENT_ID,
  PAYPAL_SANDBOX_CLIENT_SECRET,
  PAYPAL_LIVE_CLIENT_ID,
  PAYPAL_LIVE_CLIENT_SECRET,
  REACT_APP_DOMAIN
} = process.env;

const isSandbox = PAYPAL_ENV === "sandbox";
const clientId = isSandbox ? PAYPAL_SANDBOX_CLIENT_ID : PAYPAL_LIVE_CLIENT_ID;
const clientSecret = isSandbox ? PAYPAL_SANDBOX_CLIENT_SECRET : PAYPAL_LIVE_CLIENT_SECRET;
const APP_URL = REACT_APP_DOMAIN || "https://www.and.deals";

const oauthBaseUrl = isSandbox
  ? "https://api.sandbox.paypal.com"
  : "https://api.paypal.com";

const app = express();

/**
 * Only handle GET /api/paypal/oauth
 * No longer handle "/"
 */
app.get("/api/paypal/oauth", async (req, res) => {
  try {
    const { code, redirect_uri, action, state } = req.query;
    console.log("[oauth.js] => Query params =>", req.query);

    // The callback on *this server* for exchanging code => token:
    const callbackUrl = `${APP_URL}/api/paypal/oauth`;

    // 1) If no code => send user to PayPal sign-in
    if (!code) {
      console.log("[oauth.js] => No 'code', redirecting to PayPal sign-in");

      const stateObj = {
        redirect_uri: redirect_uri || "/",
        action: action || "",
      };

      const scopeParam = encodeURIComponent("openid profile email");
      const baseSignInUrl = isSandbox
        ? "https://www.sandbox.paypal.com/signin/authorize"
        : "https://www.paypal.com/signin/authorize";

      const finalAuthUrl = `${baseSignInUrl}?response_type=code&client_id=${clientId}
        &scope=${scopeParam}
        &redirect_uri=${encodeURIComponent(callbackUrl)}
        &state=${encodeURIComponent(JSON.stringify(stateObj))}
      `.replace(/\s+/g, "");

      console.log("[oauth.js] => PayPal Auth URL =>", finalAuthUrl);
      return res.redirect(finalAuthUrl);
    }

    // 2) If we do have a code => exchange it for tokens
    console.log("[oauth.js] => 'code' found, exchanging for token...");

    const tokenResponse = await fetch(`${oauthBaseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
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
    if (!accessToken) {
      console.error("[oauth.js] => No access token returned.");
      return res.status(400).json({ error: "No access token in response." });
    }

    // 3) Attempt to decode user info from id_token or userinfo
    let userinfo = null;
    if (tokenJson.id_token) {
      try {
        userinfo = jwtDecode(tokenJson.id_token);
        console.log("[oauth.js] => Decoded id_token =>", userinfo);
      } catch (decodeErr) {
        console.error("[oauth.js] => Error decoding id_token =>", decodeErr);
      }
    }

    if (!userinfo) {
      console.log("[oauth.js] => Calling /userinfo to retrieve profile...");
      const userInfoResp = await fetch(
        `${oauthBaseUrl}/v1/identity/openidconnect/userinfo?schema=openid`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const rawText = await userInfoResp.text();
      if (!userInfoResp.ok) {
        console.error("[oauth.js] => userinfo error =>", userInfoResp.status);
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

    // 4) Extract user email & fallback name
    const paypalEmail = userinfo.email || "";
    const userName =
      userinfo.name || userinfo.given_name || paypalEmail || "New User";

    // 5) If we had a state param, parse it => figure out final route & action
    let finalPath = "/";
    let finalAction = "";
    if (state) {
      try {
        const parsedState = JSON.parse(state);
        finalPath = parsedState.redirect_uri || "/";
        finalAction = parsedState.action || "";
      } catch (err) {
        console.log("[oauth.js] => Could not parse state =>", err);
      }
    } else if (redirect_uri) {
      finalPath = redirect_uri;
      finalAction = action || "";
    }

    // 6) Redirect back to the front-end route with user info
    // e.g. /share/creator/123?paypal_email=...&action=pay
    const finalUrl = `${APP_URL}${finalPath}?paypal_email=${encodeURIComponent(
      paypalEmail
    )}&name=${encodeURIComponent(userName)}${
      finalAction ? `&action=${encodeURIComponent(finalAction)}` : ""
    }`;

    console.log("[oauth.js] => Redirecting back =>", finalUrl);
    return res.redirect(finalUrl);
  } catch (err) {
    console.error("[oauth.js] => PayPal OAuth error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// CATCH-ALL (optional)
app.use((req, res) => {
  console.log("[oauth.js] => Catch-all => path =>", req.path);
  return res.status(404).json({
    error: "No matching route in /api/paypal/oauth.js",
    path: req.path,
  });
});

// Vercel entry point
export default (req, res) => {
  return app(req, res);
};
