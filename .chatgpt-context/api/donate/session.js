app.post('/api/donate/session', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      throw new Error('Missing/invalid STRIPE_SECRET_KEY');
    }

    const { amountCents = 1000, creatorName = 'Anonymous', dealId = 'default' } = req.body || {};
    const origin = req.headers.origin || process.env.OPENMAT_DOMAIN || 'http://localhost:3000';

    console.log('[create session] body:', req.body);
    console.log('[create session] origin:', origin);
    console.log('[create session] stripe key starts:', process.env.STRIPE_SECRET_KEY.slice(0, 10));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: { name: `Donation to ${creatorName}` }
          }
        }
      ],
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      metadata: { deal_id: dealId }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[create session] error:', err?.message, err);
    res.status(500).json({ error: 'failed_to_create_session', details: err?.message });
  }
});
