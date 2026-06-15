const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestataire',
    required: true
  },
  isSubCategory: {
    type: Boolean,
    default: false
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' }],
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);