// api/paypal/capture-order.js
import { paypalClient } from "../../utils/paypalEnvironment";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({}); // no extra data

    const capture = await paypalClient().execute(request);
    return res.status(200).json(capture.result);
  } catch (error) {
    console.error("capture-order error:", error);
    return res.status(500).json({ error: error.message });
  }
}
