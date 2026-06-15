const Rating = require('../models/rating');
const Reservation = require('../models/reservation');
const Service = require('../models/service');
const Notification = require('../models/notification');
const io = require('../services/io').getIO();

// Helper function to emit notifications to specific user rooms
const emitNotification = (recipientId, notification) => {
  io.to(`user_${recipientId}`).emit('newNotification', notification);
  
};

// Create a new rating or update if exists
exports.createOrUpdateRating = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const serviceId = req.params.serviceId;
    const userId = req.user.id;
    
    console.log('DEBUG: Request data:', { userId, serviceId, rating, comment });
    
    // Validate rating value
    if (rating < 0 || rating > 5) {
    
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    // Check if user already rated this service
  
    let existingRating = await Rating.findOne({ userId, serviceId });

    if (existingRating) {
      console.log('DEBUG: Updating existing rating');
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment;
      existingRating.updatedAt = Date.now();
      await existingRating.save();
      
      // io.emit('ratingUpdated', existingRating);
      return res.status(200).json(existingRating);
    } else {
      console.log('DEBUG: Creating new rating');
      // Create new rating
      const newRating = new Rating({
        userId,
        serviceId,
        rating,
        comment
      });
      
      await newRating.save();
      console.log('DEBUG: New rating created:', newRating);
      
      // Get the service to find the prestataire
      console.log('DEBUG: Fetching service details');
      const service = await Service.findById(serviceId);
      if (!service) {
        console.log('DEBUG: Service not found');
        return res.status(404).json({ error: 'Service not found' });
      }
      
      console.log('DEBUG: Service found:', { 
        serviceId: service._id, 
        serviceName: service.name, 
        prestataireId: service.prestataireId 
      });
      
      // Create notification for the prestataire
      console.log('DEBUG: Creating notification for prestataire');
      
      const prestataireNotification = new Notification({
        recipient: service.prestataireId,
        recipientType: 'Prestataire',
        type: 'RATING_RECEIVED',
        title: 'New Rating Received',
        message: `You have received a new ${rating}-star rating for your service ${service.name}`,
        data: { 
          ratingId: newRating._id,
          serviceId: serviceId,
          rating: rating
        }
      });
      
      console.log('DEBUG: Saving notification');
      await prestataireNotification.save();
      
      // Send only ONE web socket notification to the prestataire
      console.log('DEBUG: Emitting single notification to prestataire');
      emitNotification(prestataireNotification.recipient, prestataireNotification);
      
      // io.emit('newRating', newRating);
      return res.status(201).json(newRating);
    }
  } catch (error) {
    console.error('ERROR in createOrUpdateRating:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get average rating for a service (public)
exports.getServiceAverageRating = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.status(200).json({
      averageRating: service.averageRating || 0,
      totalRatings: service.totalRatings || 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all ratings for a service (authenticated users only)
exports.getServiceRatings = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const ratings = await Rating.find({ serviceId })
      .populate('userId', 'nom prenom photoProfil')
      .sort({ createdAt: -1 });
    
    res.status(200).json(ratings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all ratings for services provided by a specific prestataire
exports.getPrestataireServiceRatings = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    
    // Get all services by this prestataire
    const services = await Service.find({ prestataireId });
    const serviceIds = services.map(service => service._id);
    
    // Get ratings for these services
    const ratings = await Rating.find({ serviceId: { $in: serviceIds } })
      .populate('userId', 'nom prenom photoProfil')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json(ratings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get a user's rating for a specific service
exports.getUserServiceRating = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user.id;
    
    const rating = await Rating.findOne({ userId, serviceId });
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    res.status(200).json(rating);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a rating (user can only delete their own ratings)
exports.deleteRating = async (req, res) => {
  try {
    const ratingId = req.params.id;
    const userId = req.user.id;
    
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    // Check if the rating belongs to the user
    if (rating.userId.toString() !== userId) {
      return res.status(403).json({ error: 'You can only delete your own ratings' });
    }
    
    await Rating.findByIdAndDelete(ratingId);
    io.to(`user_${userId}`).emit('ratingDeleted', rating);
    res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// NEW FUNCTION: Get overall average rating across all services (on a 10-point scale)
exports.getProviderOverallRating = async (req, res) => {
  try {
    const { providerId } = req.params;
    
    // Get all services by this provider
    const services = await Service.find({ prestataireId: providerId });
    
    if (services.length === 0) {
      return res.status(200).json({
        rating5Point: {
          averageRating: 0,
          totalRatings: 0,
          scale: '5-point'
        },
        rating10Point: {
          averageRating: 0,
          totalRatings: 0,
          scale: '10-point'
        }
      });
    }
    
    const serviceIds = services.map(service => service._id);
    
    // Calculate average rating across all services for this provider
    const result = await Rating.aggregate([
      {
        $match: { serviceId: { $in: serviceIds } }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);
    
    if (result.length > 0) {
      const originalRating = result[0].averageRating;
      const totalRatings = result[0].totalRatings;
      
      // 5-point scale (original)
      const rating5Point = parseFloat(originalRating.toFixed(2));
      
      // 10-point scale (converted)
      const rating10Point = parseFloat((originalRating * 2).toFixed(2));
      
      return res.status(200).json({
        rating5Point: {
          averageRating: rating5Point,
          totalRatings: totalRatings,
          scale: '5-point'
        },
        rating10Point: {
          averageRating: rating10Point,
          totalRatings: totalRatings,
          scale: '10-point'
        }
      });
    } else {
      return res.status(200).json({
        rating5Point: {
          averageRating: 0,
          totalRatings: 0,
          scale: '5-point'
        },
        rating10Point: {
          averageRating: 0,
          totalRatings: 0,
          scale: '10-point'
        }
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get comprehensive service rating information (average + all ratings with comments) - Authenticated users only
exports.getServiceRatingDetails = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { serviceId } = req.params;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Get all ratings for this service with user information
    const ratings = await Rating.find({ serviceId })
      .populate('userId', 'nom prenom photoProfil')
      .sort({ createdAt: -1 });
    
    // Calculate average rating
    let averageRating = 0;
    let totalRatings = ratings.length;
    
    if (totalRatings > 0) {
      const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
      averageRating = (sum / totalRatings).toFixed(1);
    }
    
    // Format the response with comprehensive information
    const response = {
      serviceInfo: {
        serviceId: service._id,
        serviceName: service.name,
        prestataireId: service.prestataireId
      },
      ratingsSummary: {
        averageRating: parseFloat(averageRating),
        totalRatings: totalRatings,
        ratingsDistribution: {
          5: ratings.filter(r => r.rating === 5).length,
          4: ratings.filter(r => r.rating === 4).length,
          3: ratings.filter(r => r.rating === 3).length,
          2: ratings.filter(r => r.rating === 2).length,
          1: ratings.filter(r => r.rating === 1).length
        }
      },
      allRatings: ratings.map(rating => ({
        _id: rating._id,
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
        user: {
          _id: rating.userId._id,
          nom: rating.userId.nom,
          prenom: rating.userId.prenom,
          photoProfil: rating.userId.photoProfil
        }
      })),
      // Add information about the current user's rating if they have one
      currentUserRating: ratings.find(r => r.userId._id.toString() === req.user.id) || null
    };
    
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};