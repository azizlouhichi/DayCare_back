const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le champ "nom" est obligatoire'],
    trim: true, 
  },
  prenom: {
    type: String,
    required: [true, 'Le champ "prenom" est obligatoire'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Le champ "email" est obligatoire'],
    unique: true, 
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Le format de l\'email est invalide'],
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
    enum: ['Utilisateur', 'Prestataire'], 
    required: [true, 'Le champ "choix de rôle" est obligatoire'],
  },
  reservations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }],
  verificationToken: { type: String }, 
  refreshToken: { type: String },
  accessToken: { type: String },
  isVerified: { type: Boolean, default: false }, 
  otp: { type: String }, 
  otpExpires: { type: Date }, 
  chats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  }]
});

module.exports = mongoose.model('User', userSchema);