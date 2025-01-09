import paypal from '@paypal/checkout-server-sdk';

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

function environment() {
  // Production usage => PayPal.core.LiveEnvironment
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
    const { amount, payeeEmail } = req.body; // "amount" is your deal_value, "payeeEmail" = users.paypal_email
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toString() // ensure it's a string
          },
          payee: payeeEmail
            ? { email_address: payeeEmail }
            : undefined
        }
      ]
    });

    const order = await client().execute(request);

    // Return the order ID
    return res.status(200).json({ id: order.result.id });
  } catch (error) {
    console.error('create-order error:', error);
    return res.status(500).json({ error: error.message });
  }
}
