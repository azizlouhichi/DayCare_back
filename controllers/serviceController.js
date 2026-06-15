const mongoose = require('mongoose');
const Service = require('../models/service');

// Create a new service
exports.createService = async (req, res) => {
  try {
     const imageUrls = req.files ? req.files.map(f => f.path) : [];

    // 2. IMPORTANT: Destructure ALL variables including bestRating
    const { 
      category, 
      subCategory, 
      bestOffer, 
      bestRating, // <--- MUST BE HERE
      closest, 
      promotion, 
      ...serviceData 
    } = req.body;
    
    if (!category || !subCategory) {
      return res.status(400).json({ error: 'Category and subcategory are required' });
    }
    
    // Handle both category names and IDs
    let categoryId = mongoose.Types.ObjectId.isValid(category) 
      ? category 
      : (await mongoose.model('Category').findOne({ name: category, isSubCategory: false }))?._id;
    
    let subCategoryId = mongoose.Types.ObjectId.isValid(subCategory) 
      ? subCategory 
      : (await mongoose.model('SubCategory').findOne({ 
          name: subCategory,
          category: categoryId 
        }))?._id;
    
    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category name or ID' });
    }
    
    if (!subCategoryId) {
      return res.status(400).json({ error: 'Invalid subcategory name or ID' });
    }
    
    // Validate category and subcategory relationship
    const [categoryDoc, subCategoryDoc] = await Promise.all([
      mongoose.model('Category').findById(categoryId),
      mongoose.model('SubCategory').findOne({
        $or: [
          { _id: subCategoryId },
          { name: subCategory, category: categoryId }
        ]
      })
    ]);
    
    if (!categoryDoc || categoryDoc.isSubCategory) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    if (!subCategoryDoc) {
      return res.status(400).json({ error: 'Invalid subcategory name or ID' });
    }
    
    if (subCategoryDoc.category.toString() !== categoryId.toString()) {
      return res.status(400).json({ error: 'Subcategory does not belong to the selected category' });
    }
    
    const prestataire = await mongoose.model('Prestataire').findById(serviceData.prestataireId);
    if (!prestataire) {
      return res.status(400).json({ error: 'Invalid prestataire ID' });
    }
    serviceData.address = prestataire.adresse;
     const service = new Service({
      ...serviceData,
      images: imageUrls,
      category: categoryId, 
      subCategory: subCategoryId,
      bestOffer: bestOffer === 'true' || bestOffer === true,
      bestRating: bestRating || 0, // <--- Now it exists and won't crash
      closest: closest === 'true' || closest === true,
      promotion: promotion === 'true' || promotion === true,
    });
    
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all services
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single service by ID
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRandomServicesForVisitors = async (req, res) => {
  try {
    // Find all available services
    const availableServices = await Service.find({ availability: 'available' })
      .populate('prestataireId', 'nom prenom entrepriseName photoProfil') // Get provider name
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .select('name images price averageRating totalRatings prestataireId'); // Only select necessary fields
    
    // If there are less than 6 services, return all of them
    if (availableServices.length <= 6) {
      return res.status(200).json(availableServices);
    }
    
    // Shuffle the services array to get random services each time
    const shuffledServices = [...availableServices];
    for (let i = shuffledServices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledServices[i], shuffledServices[j]] = [shuffledServices[j], shuffledServices[i]];
    }
    
    // Get the first 6 services from the shuffled array
    const randomServices = shuffledServices.slice(0, 6);
    
    // Return the random services
    res.status(200).json(randomServices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBestRatedRandomServices = async (req, res) => {
  try {
    // Find available services with ratings between 3 and 5
    const bestRatedServices = await Service.find({ 
      availability: 'available',
      averageRating: { $gte: 3, $lte: 5 }
    })
      .populate('prestataireId', 'nom prenom entrepriseName photoProfil') // Added photoProfil
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .select('name images price averageRating totalRatings prestataireId');
    
    if (bestRatedServices.length <= 6) {
      return res.status(200).json(bestRatedServices);
    }
    
    const shuffledServices = [...bestRatedServices];
    for (let i = shuffledServices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledServices[i], shuffledServices[j]] = [shuffledServices[j], shuffledServices[i]];
    }
    
    const randomBestRatedServices = shuffledServices.slice(0, 6);
    
    res.status(200).json(randomBestRatedServices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a service by ID
exports.updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (req.user.role !== 'admin' && service.prestataireId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this service' });
    }

    const { name, description, price, availability, duration, promotion, bestOffer, closest } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (availability !== undefined) updateData.availability = availability;
    if (duration !== undefined) updateData.duration = duration;
    if (promotion !== undefined) updateData.promotion = promotion;
    if (bestOffer !== undefined) updateData.bestOffer = bestOffer;
    if (closest !== undefined) updateData.closest = closest;

    const updatedService = await Service.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json(updatedService);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a service by ID
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (req.user.role !== 'admin' && service.prestataireId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this service' });
    }

    await Service.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get services with best offers
exports.getBestOffers = async (req, res) => {
  try {
    const services = await Service.find({ bestOffer: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get services with best ratings
exports.getBestRatings = async (req, res) => {
  try {
    const services = await Service.find({ bestRating: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get closest services
exports.getClosestServices = async (req, res) => {
  try {
    const services = await Service.find({ closest: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get services with promotions
exports.getPromotions = async (req, res) => {
  try {
    const services = await Service.find({ promotion: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to get all services in each subcategory with filtering
exports.getServicesBySubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;
        const { 
            minPrice, 
            maxPrice, 
            minRating, 
            maxRating,
            sortBy,
            userLocation
        } = req.query;

        // Build filter object
        const filter = { 
            subCategory: subCategoryId, 
            availability: 'available' 
        };

        // Add price filter if provided
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
            if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
        }

        // Add rating filter if provided
        if (minRating !== undefined || maxRating !== undefined) {
            filter.averageRating = {};
            if (minRating !== undefined) filter.averageRating.$gte = Number(minRating);
            if (maxRating !== undefined) filter.averageRating.$lte = Number(maxRating);
        }

        console.log('Filter criteria:', filter);

        // Build sort object
        let sort = {};
        if (sortBy) {
            switch (sortBy) {
                case 'price_asc':
                    sort.price = 1;
                    break;
                case 'price_desc':
                    sort.price = -1;
                    break;
                case 'rating_desc':
                    sort.averageRating = -1;
                    break;
                case 'newest':
                    sort.createdAt = -1;
                    break;
                // Distance sorting will be handled after fetching results
            }
        }

        console.log('Sort criteria:', sort);

        // Execute query
        let services = await Service.find(filter)
            .sort(Object.keys(sort).length > 0 ? sort : undefined)
            .populate('prestataireId')
            .populate('category', 'name')
            .populate('subCategory', 'name');

        console.log(`Found ${services.length} services matching criteria`);

        // Handle distance calculation and sorting if userLocation is provided
        if (userLocation && sortBy === 'distance') {
            // Import the calculateDistance function
            const { calculateDistance } = require('../utils/geoUtils');

            // Parse user coordinates
            let userCoords;
            if (userLocation) {
                const [lat, lng] = userLocation.split(',').map(coord => parseFloat(coord.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    userCoords = { lat, lng };
                }
            }

            // If no coordinates in query params, try to get from headers (mobile apps)
            if (!userCoords && req.headers['x-user-latitude'] && req.headers['x-user-longitude']) {
                const lat = parseFloat(req.headers['x-user-latitude']);
                const lng = parseFloat(req.headers['x-user-longitude']);
                if (!isNaN(lat) && !isNaN(lng)) {
                    userCoords = { lat, lng };
                }
            }

            if (userCoords) {
                console.log(`Calculating distances from user location: ${userCoords.lat},${userCoords.lng}`);
                
                // Calculate distance for each service
                services = services.map(service => {
                    const serviceData = service.toObject();
                    const prestataireAddress = service.prestataireId?.adresse;
                    
                    if (prestataireAddress?.coordinates?.lat && prestataireAddress?.coordinates?.lng) {
                        serviceData.distance = calculateDistance(
                            userCoords.lat,
                            userCoords.lng,
                            prestataireAddress.coordinates.lat,
                            prestataireAddress.coordinates.lng
                        );
                    } else {
                        serviceData.distance = null;
                    }
                    
                    return serviceData;
                });
                
                // Sort by distance (null values at the end)
                services.sort((a, b) => {
                    if (a.distance === null) return 1;
                    if (b.distance === null) return -1;
                    return a.distance - b.distance;
                });
                
                console.log(`Sorted ${services.length} services by distance`);
            }
        }

        res.status(200).json(services);
    } catch (error) {
        console.error('Error in getServicesBySubCategory:', error);
        res.status(500).json({ error: error.message });
    }
};

// Toggle service availability
exports.toggleAvailability = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Verify the prestataire owns this service
    if (service.prestataireId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized - You do not own this service' });
    }
    
    // Toggle availability status
    service.availability = service.availability === 'available' ? 'not available' : 'available';
    await service.save();
    
    res.status(200).json({ 
      message: 'Service availability updated', 
      availability: service.availability 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getServicesByProviderId = async (req, res) => {
  try {
    const { providerId } = req.params;
    const services = await Service.find({ prestataireId: providerId })
      .populate('category', 'name description')
      .populate('subCategory', 'name description');
    
    if (!services) {
      return res.status(404).json({ error: 'No services found for this provider' });
    }

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

