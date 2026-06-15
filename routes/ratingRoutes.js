const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Rating management
 */

/**
 * @swagger
 * /api/ratings/service/{serviceId}:
 *   post:
 *     summary: Create or update a rating for a service
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 description: Rating value (0-5)
 *               comment:
 *                 type: string
 *                 description: Review comment
 *     responses:
 *       201:
 *         description: Rating created successfully
 *       200:
 *         description: Rating updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User doesn't have a completed reservation
 */
router.post('/service/:serviceId', authMiddleware.isAuthenticated, ratingController.createOrUpdateRating);

/**
 * @swagger
 * /api/ratings/service/{serviceId}/average:
 *   get:
 *     summary: Get average rating for a service (public)
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Average rating data
 *       404:
 *         description: Service not found
 */
router.get('/service/:serviceId/average', ratingController.getServiceAverageRating);

/**
 * @swagger
 * /api/ratings/service/{serviceId}:
 *   get:
 *     summary: Get all ratings for a service (authenticated users only)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: List of ratings
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */
router.get('/service/:serviceId', authMiddleware.isAuthenticated, ratingController.getServiceRatings);

router.get('/services/:serviceId/rating-details', authMiddleware.isAuthenticated, ratingController.getServiceRatingDetails);
/**
 * @swagger
 * /api/ratings/prestataire/services:
 *   get:
 *     summary: Get all ratings for services provided by the authenticated prestataire
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ratings
 *       401:
 *         description: Unauthorized
 */
router.get('/prestataire/services', authMiddleware.isAuthenticated, ratingController.getPrestataireServiceRatings);

/**
 * @swagger
 * /api/ratings/user/service/{serviceId}:
 *   get:
 *     summary: Get the authenticated user's rating for a specific service
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Rating data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating not found
 */
router.get('/user/service/:serviceId', authMiddleware.isAuthenticated, ratingController.getUserServiceRating);

/**
 * @swagger
 * /api/ratings/{id}:
 *   delete:
 *     summary: Delete a rating (user can only delete their own ratings)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Rating ID
 *     responses:
 *       200:
 *         description: Rating deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the rating owner
 *       404:
 *         description: Rating not found
 */
router.delete('/:id', authMiddleware.isAuthenticated, ratingController.deleteRating);

/**
 * @swagger
 * /api/ratings/provider/{providerId}/overall:
 *   get:
 *     summary: Get overall average rating for a specific provider's services (10-point scale)
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Provider's overall average rating data
 *       400:
 *         description: Bad request
 */
router.get('/prestataire/:providerId/overall', authMiddleware.isAuthenticated,ratingController.getProviderOverallRating);



module.exports = router;