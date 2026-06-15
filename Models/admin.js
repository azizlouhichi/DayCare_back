const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
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
    match: [/^[a-zA-Z0-9._%+-]+@(gmail|hotmail)\.(com|fr)$/, 'Le format de l\'email est invalide'],
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
    match: [/^\+?\d{8,15}$/, 'Le numéro de téléphone doit contenir exactement 11 chiffres'],
  },
  photoProfil: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ['Admin'],
    required: [true, 'Le champ "rôle" est obligatoire'],
  },
  isVerified: {
    type: Boolean,
    default: true,
  }
});

module.exports = mongoose.model('Admin', adminSchema);