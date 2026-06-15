const express = require('express');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscription');
const Prestataire = require('../models/prestataire');
const Facture = require('../models/facture'); // ✅ Add this
const Notification = require('../models/notification'); // ✅ Add this
const Reservation = require('../models/reservation'); // ✅ Add this missing import
const { getIO } = require('../services/io');
const io = getIO();

const router = express.Router();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const emitNotification = (recipientId, notification) => {
  io.to(`user_${recipientId}`).emit('newNotification', notification);
};
router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('✅ Webhook received:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentType = session.metadata?.type;

      console.log('📋 Session data:', {
        id: session.id,
        subscription: session.subscription,
        metadata: session.metadata
      });

      if (paymentType === 'invoice') {
        try {
          const { invoiceId, userId, prestataireId } = session.metadata;
          const facture = await Facture.findByIdAndUpdate(
            invoiceId,
            {
              status: 'payée',
              datePaiement: new Date(),
              dateModification: new Date(),
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent
            },
            { new: true }
          );

          if (facture) {
            // Update the reservation payment status
            await Reservation.findByIdAndUpdate(
              facture.reservationId,
              { paymentStatus: 'payé' },
              { new: true }
            );

            // Inside the checkout.session.completed event handler
            // Replace the notification creation code with:
            
            const userNotification = new Notification({
              recipient: facture.userId,
              recipientType: 'User',
              title: 'Payment Successful',
              message: `Your invoice #${facture.numeroFacture} has been paid successfully`,
              type: 'PAYMENT_RECEIVED',
              relatedId: facture._id
            });
            await userNotification.save();
            emitNotification(userNotification.recipient, userNotification);
            
            const prestataireNotification = new Notification({
              recipient: facture.prestataireId,
              recipientType: 'Prestataire',
              title: 'Payment Received',
              message: `Invoice #${facture.numeroFacture} has been paid by the client`,
              type: 'PAYMENT_RECEIVED',
              relatedId: facture._id
            });
            await prestataireNotification.save();
            emitNotification(prestataireNotification.recipient, prestataireNotification);
          }

          return res.status(200).send('Invoice processed successfully');
        } catch (err) {
          console.error('❌ Error processing invoice:', err);
          return res.status(500).send('Error processing invoice');
        }
      }

      if (paymentType === 'subscription') {
        try {
          let prestataireId = session.metadata?.prestataireId;
          let type = session.metadata?.type;

          if (!prestataireId || !type) {
            if (session.subscription) {
              const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
              prestataireId = stripeSubscription.metadata.prestataireId;
              type = stripeSubscription.metadata.type;
            }
          }

          if (!prestataireId || !type) {
            console.warn('⚠️ Missing metadata:', { prestataireId, type });
            return res.status(400).send('Missing metadata');
          }

          console.log('🎯 Processing subscription for:', { prestataireId, type });

          let paymentIntent = null;
          if (session.payment_intent) {
            paymentIntent = session.payment_intent;
          } else if (session.subscription) {
            const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
            if (stripeSubscription.latest_invoice) {
              const invoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice);
              paymentIntent = invoice.payment_intent;
            }
          }

          const prices = { monthly: 50, '6months': 250, yearly: 480 };
          const amount = prices[type];

          const startDate = new Date();
          let endDate = new Date(startDate);
          if (type === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
          if (type === '6months') endDate.setMonth(endDate.getMonth() + 6);
          if (type === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

          const subscription = new Subscription({
            prestataireId,
            type,
            amount,
            paymentDate: startDate,
            startDate,
            endDate,
            status: 'active',
            paymentMethod: 'card',
            transactionId: paymentIntent || session.id,
          });

          const savedSubscription = await subscription.save();
          console.log('✅ Subscription saved:', savedSubscription._id);

          const updatedPrestataire = await Prestataire.findByIdAndUpdate(
            prestataireId,
            {
              subscriptionType: type,
              subscriptionStartDate: startDate,
              subscriptionEndDate: endDate,
              subscriptionStatus: 'active',
            },
            { new: true }
          );

          if (!updatedPrestataire) {
            console.error('❌ Prestataire not found with ID:', prestataireId);
            return res.status(404).send('Prestataire not found');
          }

          console.log('✅ Prestataire updated:', {
            id: updatedPrestataire._id,
            subscriptionType: updatedPrestataire.subscriptionType,
            subscriptionStatus: updatedPrestataire.subscriptionStatus,
            subscriptionStartDate: updatedPrestataire.subscriptionStartDate,
            subscriptionEndDate: updatedPrestataire.subscriptionEndDate
          });

          return res.status(200).send('Subscription handled successfully');
        } catch (err) {
          console.error('❌ Error processing subscription:', err);
          return res.status(500).send('Error processing subscription');
        }
      }

      console.warn('⚠️ Unknown payment type:', paymentType);
      return res.status(400).send('Unknown payment type');
    }

    console.log('ℹ️ Event ignored:', event.type);
    return res.status(200).send('Event ignored');
  }
);

module.exports = router;
