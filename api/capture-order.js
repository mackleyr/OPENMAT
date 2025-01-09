import paypal from '@paypal/checkout-server-sdk';

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

function environment() {
  return new paypal.core.LiveEnvironment(clientId, clientSecret);
}

function client() {
  return new paypal.core.PayPalHttpClient(environment());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({}); // no extra data needed for capture

    const capture = await client().execute(request);

    // Return PayPal's capture result
    return res.status(200).json(capture.result);
  } catch (error) {
    console.error('capture-order error:', error);
    return res.status(500).json({ error: error.message });
  }
}
