const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reservationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true // Make sure this is required
  },
  serviceName: {
    type: String,
    // required: true
  },
  prestataireId: {
    type: Schema.Types.ObjectId,
    ref: 'Prestataire',
    required: true
  },
  // Remove this:
  // factureId: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'Facture'
  // },
  
  // Keep only this:
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Facture'
  },
  reservationDateTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['en attente', 'confirmé', 'annulé', 'terminé'],
    default: 'en attente'
  },
  description: {
    type: String,
    required: true
  },
  adresse: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  additionalServices: [{
    name: {
      type: String,
      // required: true
    },
    description: {
      type: String
    },
    price: {
      type: Number,
      required: true
    }
  }],
  // Add this to the reservation schema
invoicePreparation: {
  workHours: {
    type: Number
  },
  details: {
    tarifHoraire: Number,
    equipements: Number,
    nombrePersonnel: Number,
    coutPersonnel: Number
  },
  tva: Number,
   // This is already there
  montantHT: Number,       // Add this field
  montantTotal: Number,    // Add this field
  tauxTVA: Number,         // Add this field
  preparedAt: Date
},
  workHours: {
    type: Number
  },
  finalPrice: {
    type: Number
  },
  images: [String],
  latitude: Number,
  longitude: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['non facturé', 'facturé','payé', 'paid'],
    default: 'non facturé'
  }
});

module.exports = mongoose.model('Reservation', reservationSchema);