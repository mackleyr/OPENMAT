// utils/paypalEnvironment.js
import paypal from "@paypal/checkout-server-sdk";

const {
  PAYPAL_ENV,
  PAYPAL_SANDBOX_CLIENT_ID,
  PAYPAL_SANDBOX_CLIENT_SECRET,
  PAYPAL_LIVE_CLIENT_ID,
  PAYPAL_LIVE_CLIENT_SECRET
} = process.env;

function environment() {
  if (PAYPAL_ENV === "sandbox") {
    return new paypal.core.SandboxEnvironment(
      PAYPAL_SANDBOX_CLIENT_ID,
      PAYPAL_SANDBOX_CLIENT_SECRET
    );
  } else {
    // Otherwise assume "live"
    return new paypal.core.LiveEnvironment(
      PAYPAL_LIVE_CLIENT_ID,
      PAYPAL_LIVE_CLIENT_SECRET
    );
  }
}

export function paypalClient() {
  return new paypal.core.PayPalHttpClient(environment());
}
