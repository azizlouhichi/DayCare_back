const Category = require('../models/category');
const User = require('../models/user');
const Prestataire = require('../models/prestataire');
const Reservation = require('../models/reservation');
const Service = require('../models/service');
const Facture = require('../models/facture');
const Notification = require('../models/notification');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const Subscription = require('../models/subscription');
const SubCategory = require('../models/subCategory');



require('dotenv').config();

exports.loginAdmin = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(motDePasse, admin.motDePasse);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = require('jsonwebtoken').sign(
      { role: 'admin', adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(200).json({
      message: 'Admin logged in successfully',
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getAdminProfile = async (req, res) => {
  try {
    // Get admin ID from the authenticated request
    const adminId = req.user.id;  // Changed from req.user.adminId to req.user.id
    
    // Find the admin by ID, excluding the password field
    const admin = await Admin.findById(adminId).select('-motDePasse');
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Return the admin profile
    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts from each collection
    const userCount = await User.countDocuments();
    const prestataireCount = await Prestataire.countDocuments();
    const serviceCount = await Service.countDocuments();
    const reservationCount = await Reservation.countDocuments();
    
    // Get total subscription amount
    const subscriptionResult = await Subscription.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    
    const totalSubscriptionAmount = subscriptionResult.length > 0 ? subscriptionResult[0].totalAmount : 0;
    
    // Get subscription counts and amounts by type
    const subscriptionsByType = await Subscription.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    
    // Format the subscription data by type
    const subscriptionStats = {};
    subscriptionsByType.forEach(item => {
      subscriptionStats[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount
      };
    });
    
    // Return all statistics in a single response
    res.status(200).json({
      success: true,
      stats: {
        totalUsers: userCount,
        totalPrestataires: prestataireCount,
        totalServices: serviceCount,
        totalReservations: reservationCount,
        totalSubscriptionAmount: totalSubscriptionAmount,
        subscriptionsByType: subscriptionStats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
exports.createAdmin = async (req, res) => {
  console.log('Received req.body:', req.body);
  try {
    const { nom, prenom, email, motDePasse, adresse, telephone } = req.body;
    if (!nom || !prenom || !email || !motDePasse || !adresse || !telephone) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }
    
    const hashedPassword = await require('bcrypt').hash(motDePasse, 10);
    
    // Handle the file upload if it exists
    const photoPath = req.file ? req.file.path : null;
    
    const admin = new Admin({
      nom,
      prenom,
      email,
      motDePasse: hashedPassword,
      adresse,
      telephone,
      photoProfil: photoPath,
      role: 'Admin',
      isVerified: true
    });
    
    await admin.save();
    res.status(201).json({ message: 'Admin created successfully', admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports. getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getPrestataires = async (req, res) => {
  try {
    const prestataires = await Prestataire.find();
    res.status(200).json(prestataires);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createPrestataire = async (req, res) => {
  try {
    const prestataire = new Prestataire(req.body);
    await prestataire.save();
    res.status(201).json(prestataire);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updatePrestataire = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json(prestataire);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deletePrestataire = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByIdAndDelete(req.params.id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json({ message: 'Prestataire deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. approvePrestataire = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be either approved or rejected' });
    }
    
    const prestataire = await Prestataire.findByIdAndUpdate(
      id,
      { 
        status,
        approvedBy: req.user._id,
        approvalDate: new Date() 
      },
      { new: true }
    );
    
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    
    // Create notification for prestataire
    const notification = new Notification({
      recipient: prestataire._id,
      recipientType: 'Prestataire',
      type: 'ACCOUNT_STATUS_CHANGED',
      title: 'Account Status Updated',
      message: `Your account has been ${status}`,
      data: { prestataireId: prestataire._id }
    });
    await notification.save();
    
    res.status(200).json({
      message: `Prestataire account has been ${status}`,
      prestataire
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReservationsByUserAndStatus = async (req, res) => {
  try {
    const { userId, status, paymentStatus } = req.query;
    let query = {};
    
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    const reservations = await Reservation.find(query)
      .populate('userId', 'nom prenom email photoProfil')
      .populate('prestataireId', 'nom prenom photoProfil')
      .populate('serviceId', 'nom');
      
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getCategoriesWithProviders = async (req, res) => {
  try {
    // Get all main categories and populate the createdBy field
    const categories = await Category.find({ isSubCategory: false })
      .populate({
        path: 'createdBy',
        select: 'nom prenom email telephone adresse photoProfil status'
      });
    
    // For each category, find subcategories and services
    const categoriesWithDetails = await Promise.all(categories.map(async (category) => {
      // Find subcategories for this category WITHOUT trying to populate createdBy
      const subcategories = await SubCategory.find({ category: category._id });
      
      // For each subcategory, find services
      const subcategoriesWithServices = await Promise.all(subcategories.map(async (subcategory) => {
        // Find services for this subcategory
        const services = await Service.find({ subCategory: subcategory._id })
          .populate({
            path: 'prestataireId',
            select: 'nom prenom email telephone adresse photoProfil status availability'
          })
          .populate('category', 'name description status')
          .populate('subCategory', 'name description status');
        
        // Group services by provider
        const servicesByProvider = {};
        services.forEach(service => {
          if (service.prestataireId) {
            const providerId = service.prestataireId._id.toString();
            if (!servicesByProvider[providerId]) {
              servicesByProvider[providerId] = {
                provider: service.prestataireId,
                services: []
              };
            }
            servicesByProvider[providerId].services.push(service);
          }
        });
        
        // Return subcategory with its services grouped by provider
        return {
          ...subcategory.toObject(),
          servicesByProvider: Object.values(servicesByProvider)
        };
      }));
      
      // Return category with its subcategories and services
      return {
        ...category.toObject(),
        subcategories: subcategoriesWithServices
      };
    }));
    
    res.status(200).json(categoriesWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getPrestataireServicesWithReservations = async (req, res) => {
  try {
    const prestataireId = req.params.id;
    
    // Find all services for this prestataire
    const services = await Service.find({ prestataireId: prestataireId });
    
    // Get reservation details for each service
    const servicesWithReservations = await Promise.all(services.map(async (service) => {
      // Find all reservations for this service
      const reservations = await Reservation.find({ serviceId: service._id })
        .populate({
          path: 'userId',
          select: 'nom prenom email telephone adresse photoProfil' // User details
        });
      
      // Count reservations by status
      const reservationCounts = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'en attente').length,
        confirmed: reservations.filter(r => r.status === 'confirmé').length,
        completed: reservations.filter(r => r.status === 'terminé').length,
        cancelled: reservations.filter(r => r.status === 'annulé').length
      };
      
      // Return service with its reservations and counts
      return {
        ...service.toObject(),
        reservationCounts,
        reservations: reservations
      };
    }));
    
    res.status(200).json(servicesWithReservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports. createReservation = async (req, res) => {
  try {
    const reservation = new Reservation(req.body);
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.status(200).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createService = async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getFactures = async (req, res) => {
  try {
    const factures = await Facture.find();
    res.status(200).json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createFacture = async (req, res) => {
  try {
    const facture = new Facture(req.body);
    await facture.save();
    res.status(201).json(facture);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateFacture = async (req, res) => {
  try {
    const facture = await Facture.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!facture) {
      return res.status(404).json({ error: 'Facture not found' });
    }
    res.status(200).json(facture);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteFacture = async (req, res) => {
  try {
    const facture = await Facture.findByIdAndDelete(req.params.id);
    if (!facture) {
      return res.status(404).json({ error: 'Facture not found' });
    }
    res.status(200).json({ message: 'Facture deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createNotification = async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getBestOffers = async (req, res) => {
  try {
    const services = await Service.find({ bestOffer: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToBestOffers = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestOffer: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromBestOffers = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestOffer: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getBestRatings = async (req, res) => {
  try {
    const services = await Service.find({ bestRating: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToBestRatings = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestRating: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromBestRatings = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestRating: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getClosestServices = async (req, res) => {
  try {
    const services = await Service.find({ closest: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToClosestServices = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { closest: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromClosestServices = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { closest: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getPromotions = async (req, res) => {
  try {
    const services = await Service.find({ promotion: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToPromotions = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { promotion: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromPromotions = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { promotion: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. approveCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.body;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Invalid status. Must be either approved or rejected' });
    }
    
    category.status = status;
    category.approvedBy = req.user._id;
    category.approvalDate = new Date();
    
    await category.save();
    
    res.status(200).json({
      message: `Category ${category.name} has been ${status}`,
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. approveSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { status } = req.body;
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Invalid status. Must be either approved or rejected' });
    }
    
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      {
        status: status,
        approvedBy: req.user._id,
        approvalDate: new Date()
      },
      { new: true, runValidators: false }
    );
    
    if (!updatedSubCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    res.status(200).json({
      message: `Subcategory has been ${status}`,
      subCategory: updatedSubCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrestataireNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.params.id, recipientType: 'Prestataire' });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPrestataireNotification = async (req, res) => {
  try {
    const notification = new Notification({
      ...req.body,
      recipient: req.params.id,
      recipientType: 'Prestataire'
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getPrestataireServices = async (req, res) => {
  try {
    const services = await Service.find({ prestataire: req.params.id });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPrestataireService = async (req, res) => {
  try {
    const service = new Service({
      ...req.body,
      prestataire: req.params.id
    });
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getFactureById = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) {
      return res.status(404).json({ error: 'Facture not found' });
    }
    res.status(200).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrestataireById = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.params.id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json(prestataire);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all invoices with detailed information about users, providers, and services
exports.getAllFacturesWithDetails = async (req, res) => {
  try {
    const factures = await Facture.find()
      .populate('userId', 'nom prenom email adresse telephone photoProfil') // Populate user fields
      .populate('prestataireId', 'nom prenom email adresse telephone photoProfil') // Populate provider fields
      .populate('serviceId', 'name description price images') // Populate service fields
      .populate('reservationId', 'status scheduledAt') // Populate reservation fields
      .sort({ dateCreation: -1 });
    
    res.status(200).json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getPrestataireServicesWithReservations = async (req, res) => {
  try {
    const prestataireId = req.params.id;
    
    // Find all services for this prestataire
    const services = await Service.find({ prestataireId: prestataireId });
    
    // Get reservation details for each service
    const servicesWithReservations = await Promise.all(services.map(async (service) => {
      // Find all reservations for this service
      const reservations = await Reservation.find({ serviceId: service._id })
        .populate({
          path: 'userId',
          select: 'nom prenom email telephone adresse photoProfil' // User details
        });
      
      // Count reservations by status
      const reservationCounts = {
        total: reservations.length,
        pending: reservations.filter(r => r.status === 'en attente').length,
        confirmed: reservations.filter(r => r.status === 'confirmé').length,
        completed: reservations.filter(r => r.status === 'terminé').length,
        cancelled: reservations.filter(r => r.status === 'annulé').length
      };
      
      // Return service with its reservations and counts
      return {
        ...service.toObject(),
        reservationCounts,
        reservations: reservations
      };
    }));
    
    res.status(200).json(servicesWithReservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports. createReservation = async (req, res) => {
  try {
    const reservation = new Reservation(req.body);
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.status(200).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createService = async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getFactures = async (req, res) => {
  try {
    const factures = await Facture.find();
    res.status(200).json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createFacture = async (req, res) => {
  try {
    const facture = new Facture(req.body);
    await facture.save();
    res.status(201).json(facture);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateFacture = async (req, res) => {
  try {
    const facture = await Facture.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!facture) {
      return res.status(404).json({ error: 'Facture not found' });
    }
    res.status(200).json(facture);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteFacture = async (req, res) => {
  try {
    const facture = await Facture.findByIdAndDelete(req.params.id);
    if (!facture) {
      return res.status(404).json({ error: 'Facture not found' });
    }
    res.status(200).json({ message: 'Facture deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. createNotification = async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports. deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getBestOffers = async (req, res) => {
  try {
    const services = await Service.find({ bestOffer: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToBestOffers = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestOffer: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromBestOffers = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestOffer: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getBestRatings = async (req, res) => {
  try {
    const services = await Service.find({ bestRating: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToBestRatings = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestRating: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromBestRatings = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { bestRating: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getClosestServices = async (req, res) => {
  try {
    const services = await Service.find({ closest: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToClosestServices = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { closest: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromClosestServices = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { closest: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getPromotions = async (req, res) => {
  try {
    const services = await Service.find({ promotion: true });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. addToPromotions = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { promotion: true },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. removeFromPromotions = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { promotion: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. approveCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.body;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Invalid status. Must be either approved or rejected' });
    }
    
    category.status = status;
    category.approvedBy = req.user._id;
    category.approvalDate = new Date();
    
    await category.save();
    
    res.status(200).json({
      message: `Category ${category.name} has been ${status}`,
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. approveSubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { status } = req.body;
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Invalid status. Must be either approved or rejected' });
    }
    
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      {
        status: status,
        approvedBy: req.user._id,
        approvalDate: new Date()
      },
      { new: true, runValidators: false }
    );
    
    if (!updatedSubCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    res.status(200).json({
      message: `Subcategory has been ${status}`,
      subCategory: updatedSubCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrestataireNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.params.id, recipientType: 'Prestataire' });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPrestataireNotification = async (req, res) => {
  try {
    const notification = new Notification({
      ...req.body,
      recipient: req.params.id,
      recipientType: 'Prestataire'
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getPrestataireServices = async (req, res) => {
  try {
    const services = await Service.find({ prestataire: req.params.id });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPrestataireService = async (req, res) => {
  try {
    const service = new Service({
      ...req.body,
      prestataire: req.params.id
    });
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getFactureById = async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) {
      return res.status(404).json({ error: 'Facture not found' });
    }
    res.status(200).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrestataireById = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.params.id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json(prestataire);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




