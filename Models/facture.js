const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const factureSchema = new Schema({
  numeroFacture: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prestataireId: {
    type: Schema.Types.ObjectId,
    ref: 'Prestataire',
    required: true
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  reservationId: {
    type: Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true
  },
  serviceName: {
    type: String,
    required: true
  },
  details: {
    heuresTravail: {
      type: Number,
      required: true
    },
    tarifHoraire: {
      type: Number,
      required: true
    },
    equipements: {
      type: Number,
      default: 0
    },
    nombrePersonnel: {
      type: Number,
      default: 0
    },
    coutPersonnel: {
      type: Number,
      default: 0
    },
    additionalServices: [{
      name: {
        type: String,
      },
      description: {
        type: String
      },
      price: {
        type: Number,
      },
      cost: {
        type: Number,
      }
    }]
  },
  montantHT: {
    type: Number,
    required: true
  },
  tva: {
    type: Number,
    required: true
  },
  montantTotal: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['en attente', 'payée', 'annulée'],
    default: 'en attente'
  },
  notes: {
    type: String
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  },
  datePaiement: {
    type: Date
  },
  stripeSessionId: { type: String },
  stripePaymentIntentId: { type: String },
});

const Facture = mongoose.model('Facture', factureSchema);

module.exports = Facture;