const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');
const { multipleUpload } = require('../middleware/uploadMiddleware'); 

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Service management
 */

/**
 * @swagger
 * /api/services/random-for-visitors:
 *   get:
 *     summary: Get 6 random services with basic info for visitors (no authentication required)
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of 6 random services with basic info
 */
router.get('/random-for-visitors', serviceController.getRandomServicesForVisitors);

/**
 * @swagger
 * /api/services/best-rated-random:
 *   get:
 *     summary: Get 6 random services with ratings between 3 and 5 (no authentication required)
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of 6 random services with ratings between 3 and 5
 */
router.get('/best-rated-random', serviceController.getBestRatedRandomServices);


/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware.isAuthenticated, authMiddleware.isProvider, multipleUpload, serviceController.createService);




/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of services
 */
/**
 * @swagger
 * /api/services/search:
 *   get:
 *     summary: Search services with advanced filters
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         description: Minimum rating filter (0-5)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: query
 *         name: subCategory
 *         schema:
 *           type: string
 *         description: SubCategory ID
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location search term
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [available, not available]
 *         description: Service availability
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, rating_desc, newest, distance]
 *         description: Sort order
 *       - in: query
 *         name: userLocation
 *         schema:
 *           type: string
 *         description: "User's latitude and longitude (format: \"lat,lng\")"
 *     responses:
 *       200:
 *         description: List of filtered services
 */
router.get('/', authMiddleware.isAuthenticated, serviceController.getServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get a service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service data
 *       404:
 *         description: Service not found
 */
router.get('/:id', authMiddleware.isAuthenticated, serviceController.getServiceById);




/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */
router.put('/:id', authMiddleware.isAuthenticated, serviceController.updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */
router.delete('/:id', authMiddleware.isAuthenticated, serviceController.deleteService);

/**
 * @swagger
 * /api/services/best-offers:
 *   get:
 *     summary: Get services with best offers
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of services with best offers
 */
router.get('/best-offers', authMiddleware.isAuthenticated, serviceController.getBestOffers);

/**
 * @swagger
 * /api/services/best-ratings:
 *   get:
 *     summary: Get services with best ratings
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of services with best ratings
 */
router.get('/best-ratings', authMiddleware.isAuthenticated, serviceController.getBestRatings);

/**
 * @swagger
 * /api/services/closest:
 *   get:
 *     summary: Get closest services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of closest services
 */
router.get('/closest', authMiddleware.isAuthenticated, serviceController.getClosestServices);

/**
 * @swagger
 * /api/services/promotions:
 *   get:
 *     summary: Get services with promotions
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of services with promotions
 */
router.get('/promotions', authMiddleware.isAuthenticated, serviceController.getPromotions);
/**
 * @swagger
 * /api/services/provider/{providerId}:
 *   get:
 *     summary: Get services by provider ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: List of services for the provider
 *       404:
 *         description: No services found
 */
router.get('/getservices/:providerId', serviceController.getServicesByProviderId);

router.get('/services-by-subcategory/:subCategoryId', authMiddleware.isAuthenticated, serviceController.getServicesBySubCategory);

/**
 * @swagger
 * /api/services/{id}/availability:
 *   put:
 *     summary: Toggle service availability
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service availability updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not service owner)
 *       404:
 *         description: Service not found
 */
router.put('/:id/availability', authMiddleware.isAuthenticated, authMiddleware.isProvider, serviceController.toggleAvailability);

module.exports = router;