const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: false  // Changed from required: true to required: false
  },
  rating: {
    type: Number,
    required: true,
    min: 0.0,
    max: 5.0
  },
  comment: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index to ensure one rating per user per service
ratingSchema.index({ userId: 1, serviceId: 1 }, { unique: true });

// Calculate average rating for a service
ratingSchema.statics.calculateAverageRating = async function(serviceId) {
  const result = await this.aggregate([
    {
      $match: {
        serviceId: new mongoose.Types.ObjectId(serviceId)
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  try {
    if (result.length > 0) {
      await mongoose.model('Service').findByIdAndUpdate(serviceId, {
        averageRating: result[0].averageRating,
        totalRatings: result[0].totalRatings
      });
    } else {
      await mongoose.model('Service').findByIdAndUpdate(serviceId, {
        averageRating: 0,
        totalRatings: 0
      });
    }
  } catch (error) {
    console.error('Error updating service average rating:', error);
  }
};

// Update average rating after save
ratingSchema.post('save', function() {
  this.constructor.calculateAverageRating(this.serviceId);
});

// Update average rating after update
ratingSchema.post('findOneAndUpdate', async function(doc) {
  await doc.constructor.calculateAverageRating(doc.serviceId);
});

// Update average rating after remove
ratingSchema.post('remove', function() {
  this.constructor.calculateAverageRating(this.serviceId);
});

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;