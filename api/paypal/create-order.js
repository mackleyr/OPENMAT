// api/paypal/create-order.js
import paypal from "@paypal/checkout-server-sdk";
import { paypalClient } from "../../src/utils/paypalEnvironment.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, payeeEmail, partnerFee, partnerFeeEmail } = req.body;

    // Access the "paypal" we imported to create the OrdersCreateRequest:
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    const purchaseUnit = {
      amount: {
        currency_code: "USD",
        value: amount.toString(),
      },
      payee: payeeEmail ? { email_address: payeeEmail } : undefined,
    };

    if (partnerFee && parseFloat(partnerFee) > 0) {
      purchaseUnit.payment_instruction = {
        platform_fees: [
          {
            amount: {
              currency_code: "USD",
              value: partnerFee.toString(),
            },
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

    // Use our shared paypalClient from paypalEnvironment.js
    const order = await paypalClient().execute(request);
    return res.status(200).json({ id: order.result.id });
  } catch (error) {
    console.error("create-order error:", error);
    return res.status(500).json({ error: error.message });
  }
}
