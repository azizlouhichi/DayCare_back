const Facture = require('../models/facture');
const Reservation = require('../models/reservation');
const Notification = require('../models/notification');
const { getIO } = require('../services/io');
const io = getIO();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);





// Get invoices for the authenticated user
exports.getMyFactures = async (req, res) => {
  try {
    const userId = req.user.id;
    const factures = await Facture.find({ userId }).sort({ dateCreation: -1 });
    res.status(200).json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all invoices for a prestataire
exports.getPrestataireFactures = async (req, res) => {
  try {
    const { prestataireId } = req.query;
    const factures = await Facture.find({ prestataireId }).sort({ dateCreation: -1 });
    res.status(200).json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all invoices with optional filtering
exports.getFactures = async (req, res) => {
  try {
    const { userId, prestataireId } = req.query;
    let query = {};
    
    if (userId) {
      query.userId = userId;
    } else if (prestataireId) {
      query.prestataireId = prestataireId;
    }
    
    const factures = await Facture.find(query).sort({ dateCreation: -1 });
    res.status(200).json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update invoice status
exports.updateFactureStatus = async (req, res) => {
  try {
    const facture = await Facture.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!facture) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // If status changed to paid, update payment date
    if (req.body.status === 'payée' && !facture.datePaiement) {
      facture.datePaiement = new Date();
      await facture.save();
    }
    
    res.status(200).json(facture);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createPaymentIntent = async (req, res) => {
  try {
    // Change these lines:
    const { invoiceId } = req.params;
    const facture = await Facture.findById(invoiceId);
    if (!facture) return res.status(404).json({ error: 'Invoice not found' });
    if (facture.status === 'payée') return res.status(400).json({ error: 'Invoice already paid' });
    if (facture.status === 'annulée') return res.status(400).json({ error: 'Invoice is cancelled' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Invoice #${facture.numeroFacture}`,
            description: `Payment for ${facture.serviceName}`,
          },
          unit_amount: Math.round(facture.montantTotal * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.BACKEND_URL}/stripe-redirect/success?session_id={CHECKOUT_SESSION_ID}&type=invoice&invoiceId=${facture._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      // First, get the invoice data outside the object literal
      // Then use the data in your metadata object
      metadata: {
        type: 'invoice',
        invoiceId: facture._id.toString(), // ✅ Add this line
        userId: facture.userId.toString(),
        prestataireId: facture.prestataireId.toString(),
      },
    });
    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getFactureById = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id)
      .populate('userId', 'nom prenom email adresse telephone') // Populate user fields
      .populate('prestataireId', 'nom prenom email adresse telephone'); // Populate provider fields
    
    if (!facture) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(200).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateFacture = async (req, res) => {
  try {
    const facture = await Facture.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!facture) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(200).json(facture);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete an invoice
exports.deleteFacture = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    
    if (!facture) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    
    if (facture.status === 'payée') {
      return res.status(400).json({ error: 'Cannot delete a paid invoice' });
    }
    
    await Facture.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};