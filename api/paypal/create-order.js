// api/paypal/create-order.js
import paypal from "@paypal/checkout-server-sdk";

// Partner Fees Requirements:
// 1. The platform fee must be the same currency as the transaction.
// 2. The partner’s PayPal account must have no balance (daily sweeps to bank).

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

function environment() {
  // Use LiveEnvironment in production if you have been PayPal-approved, else SandboxEnvironment
  return new paypal.core.LiveEnvironment(clientId, clientSecret);
}

function client() {
  return new paypal.core.PayPalHttpClient(environment());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, payeeEmail, partnerFee, partnerFeeEmail } = req.body;
    // partnerFee => "5.00"
    // partnerFeeEmail => your platform’s PayPal email

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    // We add PLATFORM_FEES if we want a partner cut. 
    // If not, omit payment_instruction entirely.
    const purchaseUnit = {
      amount: {
        currency_code: "USD",
        value: amount.toString(),
      },
      payee: payeeEmail ? { email_address: payeeEmail } : undefined,
    };

    // If there's a partnerFee, add to payment_instruction
    if (partnerFee && parseFloat(partnerFee) > 0) {
      purchaseUnit.payment_instruction = {
        platform_fees: [
          {
            amount: {
              currency_code: "USD",
              value: partnerFee.toString(),
            },
            // If omitted, fee goes to the API caller's account
            // If we want it to go to a different partner account:
            payee: partnerFeeEmail
              ? { email_address: partnerFeeEmail }
              : undefined,
          },
        ],
      };
    }

    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
    });

    const order = await client().execute(request);
    return res.status(200).json({ id: order.result.id });
  } catch (error) {
    console.error("create-order error:", error);
    return res.status(500).json({ error: error.message });
  }
}
