const mongoose = require('mongoose');

  const prestataireSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ['individual', 'entreprise'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    subscriptionType: {
      type: String,
      enum: ['monthly', '6months', 'yearly'],
      default: null
    },
    subscriptionStartDate: {
      type: Date,
      default: null
    },
    subscriptionEndDate: {
      type: Date,
      default: null
    },
    documentIdentite: {
      type: String,
      required: function() {
        return this.type === 'individual';
      }
    },
    documentEntreprise: {
      type: String,
      required: function() {
        return this.type === 'entreprise';
      }
    },
    nom: {
      type: String,
      required: [true, 'Le champ "nom" est obligatoire'],
      trim: true, // Supprime les espaces inutiles
    },
    prenom: {
      type: String,
      required: [true, 'Le champ "prenom" est obligatoire'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Le champ "email" est obligatoire'],
      unique: true, // Assure que chaque email est unique
      match: [/^[a-zA-Z0-9._%+-]+@(gmail|hotmail)\.(com|fr)$/, 'Le format de l\'email est invalide'], // Valide le format de l'email
    },
    motDePasse: {
      type: String,
      required: [true, 'Le champ "mot de passe" est obligatoire'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    },
    adresse: {
      type: String,
      required: [true, 'Le champ "adresse" est obligatoire'],
    },
    ville: {
      type: String,
      required: [true, 'Le champ "ville" est obligatoire'],
      trim: true
    },
    codePostal: {
      type: String,
      required: [true, 'Le champ "code postal" est obligatoire'],
      match: [/^\d{4}$/, 'Le code postal doit contenir exactement 4 chiffres']
    },
    pays: {
      type: String,
      required: [true, 'Le champ "pays" est obligatoire'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Le champ "description" est obligatoire'],
      trim: true,
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
    },
    competences: {
      type: [String],
      // required: [true, 'Le champ "compétences" est obligatoire'],
      // validate: {
      //   validator: function(v) {
      //     return v.length > 0;
      //   },
      //   message: 'Au moins une compétence doit être spécifiée'
      // }
    },
    telephone: {
      type: String,
      required: [true, 'Le champ "téléphone" est obligatoire'],
      match: [/^\+?\d{8,15}$/, 'Le numéro de téléphone doit contenir entre 8 et 15 chiffres, avec ou sans le préfixe +'],
    },
    photoProfil: {
      type: String,
      required: [true, 'Le champ "photoProfil" est obligatoire'],
      default: null,
    },
    choixRole: {
      type: String,
      enum: ['Utilisateur', 'Prestataire'], // Restreint à ces deux valeurs
      required: [true, 'Le champ "choix de rôle" est obligatoire'],
    },
    verificationToken: { type: String }, // Token pour vérification
    accessToken: { type: String },
    refreshToken: { type: String }, // Added refreshToken field
    isVerified: { type: Boolean, default: false }, // Statut de vérification
    otp: { type: String }, // Stocker l'OTP
    otpExpires: { type: Date }, // Date d'expiration de l'OTP
    subscriptionStatus: {
      type: String,
      enum: ['active', 'expired', 'cancel'],
      default: 'cancel'
    },
    chats: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    }],
  }, {
    timestamps: true // Add timestamps for createdAt and updatedAt
  });

  module.exports = mongoose.model('Prestataire', prestataireSchema);
