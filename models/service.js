const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prestataire', required: true },
  prestataireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prestataire', required: true },
  status: { type: String, enum: ['en attente', 'confirmé', 'annulé', 'terminé'], default: 'en attente' },
  availability: { type: String, enum: ['available', 'not available'], default: 'available' },
  scheduledAt: { type: Date },
  images: [{ type: String }],
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true,
    validate: {
      validator: async function(value) {
        const category = await mongoose.model('Category').findById(value);
        return category && !category.isSubCategory;
      },
      message: 'Must be a valid main category'
    }
  },
  subCategory: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SubCategory', 
    required: true,
    validate: {
      validator: async function(value) {
        const subCategory = await mongoose.model('SubCategory').findById(value);
        if (!subCategory) return false;
        
        const category = await mongoose.model('Category').findById(this.category);
        if (!category) return false;
        
        return subCategory.category.toString() === category._id.toString();
      },
      message: 'Subcategory must belong to the selected category'
    }
  },
  createdAt: { type: Date, default: Date.now },
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bestOffer: { type: Boolean, default: false },
  bestRating: { type: Boolean, default: false },
  closest: { type: Boolean, default: false },
  promotion: { type: Boolean, default: false },
  address: { type: String, required: true },
  // Add rating fields
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  // Ajouter ces champs au schéma existant
  latitude: { type: Number },
  longitude: { type: Number },
});

module.exports = mongoose.model('Service', serviceSchema);