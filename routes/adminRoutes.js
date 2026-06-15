const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/uploadMiddleware');


/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */

// Admin authentication
router.post('/login', adminController.loginAdmin);
router.get('/profile', isAuthenticated, isAdmin, adminController.getAdminProfile);
// User management
router.get('/users', isAuthenticated, isAdmin, adminController.getUsers);
router.post('/users', isAuthenticated, isAdmin, adminController.createUser);
router.put('/users/:id', isAuthenticated, isAdmin, adminController.updateUser);
router.delete('/users/:id', isAuthenticated, isAdmin, adminController.deleteUser);

// Prestataire management
router.get('/prestataires', isAuthenticated, isAdmin, adminController.getPrestataires);
router.post('/prestataires', isAuthenticated, isAdmin, adminController.createPrestataire);
router.put('/prestataires/:id', isAuthenticated, isAdmin, adminController.updatePrestataire);
router.delete('/prestataires/:id', isAuthenticated, isAdmin, adminController.deletePrestataire);
router.patch('/prestataires/:id/approve', isAuthenticated, isAdmin, adminController.approvePrestataire);
router.get('/prestataires/:id', isAuthenticated, isAdmin, adminController.getPrestataireById);

// Category management
router.get('/categories', isAuthenticated, isAdmin, adminController.getCategories);
router.post('/categories', isAuthenticated, isAdmin, adminController.createCategory);
router.put('/categories/:id', isAuthenticated, isAdmin, adminController.updateCategory);
router.delete('/categories/:id', isAuthenticated, isAdmin, adminController.deleteCategory);

// Notification management
router.get('/notifications', isAuthenticated, isAdmin, adminController.getNotifications);
router.post('/notifications', isAuthenticated, isAdmin, adminController.createNotification);
router.put('/notifications/:id', isAuthenticated, isAdmin, adminController.updateNotification);
router.delete('/notifications/:id', isAuthenticated, isAdmin, adminController.deleteNotification);

// Prestataire-specific notifications
router.get('/prestataires/:id/notifications', isAuthenticated, isAdmin, adminController.getPrestataireNotifications);
router.post('/prestataires/:id/notifications', isAuthenticated, isAdmin, adminController.createPrestataireNotification);

// Prestataire-specific services
router.get('/prestataires/:id/services', isAuthenticated, isAdmin, adminController.getPrestataireServices);
router.post('/prestataires/:id/services', isAuthenticated, isAdmin, adminController.createPrestataireService);

// Facture management
router.get('/factures', isAuthenticated, isAdmin, adminController.getFactures);
router.post('/factures', isAuthenticated, isAdmin, adminController.createFacture);
router.put('/factures/:id', isAuthenticated, isAdmin, adminController.updateFacture);
router.delete('/factures/:id', isAuthenticated, isAdmin, adminController.deleteFacture);
router.get('/factures/:id', isAuthenticated, isAdmin, adminController.getFactureById);

// Reservation management
router.get('/reservations', isAuthenticated, isAdmin, adminController.getReservations);
router.post('/reservations', isAuthenticated, isAdmin, adminController.createReservation);
router.put('/reservations/:id', isAuthenticated, isAdmin, adminController.updateReservation);
router.delete('/reservations/:id', isAuthenticated, isAdmin, adminController.deleteReservation);

// Service management
router.get('/services', isAuthenticated, isAdmin, adminController.getServices);
router.post('/services', isAuthenticated, isAdmin, adminController.createService);
router.put('/services/:id', isAuthenticated, isAdmin, adminController.updateService);
router.delete('/services/:id', isAuthenticated, isAdmin, adminController.deleteService);

// Special service endpoints
router.get('/services/best-offers', isAuthenticated, isAdmin, adminController.getBestOffers);
router.get('/services/best-ratings', isAuthenticated, isAdmin, adminController.getBestRatings);
router.get('/services/closest', isAuthenticated, isAdmin, adminController.getClosestServices);
router.get('/services/promotions', isAuthenticated, isAdmin, adminController.getPromotions);

// Route to create a new admin (manual setup)
router.post('/create-admin', uploadMiddleware.singleUpload, adminController.createAdmin);
router.get('/dashboard-stats', isAuthenticated, isAdmin, adminController.getDashboardStats);
router.get('/reservations/filter', isAuthenticated, isAdmin, adminController.getReservationsByUserAndStatus);
router.get('/categories-with-providers', isAuthenticated, isAdmin, adminController.getCategoriesWithProviders);
router.patch('/categories/:categoryId/approve', isAuthenticated, isAdmin, adminController.approveCategory);
router.patch('/subcategories/:subCategoryId/approve', isAuthenticated, isAdmin, adminController.approveSubCategory);
router.get('/prestataires/:id/services-with-reservations', isAuthenticated, isAdmin, adminController.getPrestataireServicesWithReservations);
router.get('/factures-with-details', isAuthenticated, isAdmin, adminController.getAllFacturesWithDetails); 
module.exports = router;