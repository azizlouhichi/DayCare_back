require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscription');
const Prestataire = require('../models/prestataire');

// Create a Stripe Checkout Session for subscription purchase
exports.purchaseSubscription = async (req, res) => {
  try {
    const { type } = req.body;
    const prestataireId = req.user.id;

    if (!['monthly', '6months', 'yearly'].includes(type)) {
      return res.status(400).json({ error: 'Invalid subscription type.' });
    }

    const priceMap = {
      monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
      '6months': process.env.STRIPE_PRICE_ID_6MONTHS,
      yearly: process.env.STRIPE_PRICE_ID_YEARLY,
    };

    const successUrl = `${process.env.BACKEND_URL}/stripe-redirect/success?session_id={CHECKOUT_SESSION_ID}&type=${type}&prestataireId=${prestataireId}`;
    const cancelUrl = `${process.env.BACKEND_URL}/stripe-redirect/cancel`;

    console.log('Success URL before Stripe:', successUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceMap[type],
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type,
        prestataireId,
      },
      // Add subscription metadata that will be passed to the subscription object
      subscription_data: {
        metadata: {
          type,
          prestataireId,
        }
      }
    });

    console.log('Success URL after Stripe:', successUrl);
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};