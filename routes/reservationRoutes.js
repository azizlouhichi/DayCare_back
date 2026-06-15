const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation management
 */

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reservation'
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', uploadMiddleware.multipleUpload, authMiddleware.isAuthenticated, authMiddleware.isUser, reservationController.createReservation);

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reservations
 *       401:
 *         description: Unauthorized
 */
// Modify the GET routes to allow both users and prestataires
router.get('/', authMiddleware.isAuthenticated, reservationController.getReservations);
router.get('/:id', authMiddleware.isAuthenticated, reservationController.getReservationById);
router.get('/payment-status', authMiddleware.isAuthenticated, reservationController.getReservationsByPaymentStatus);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get a reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation data
 *       404:
 *         description: Reservation not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authMiddleware.isAuthenticated, authMiddleware.isUser, reservationController.getReservationById);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Reservation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reservation'
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reservation not found
 */
router.put('/:id', authMiddleware.isAuthenticated, authMiddleware.isUser, reservationController.updateReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 * 
 *         description: Reservation not found
 */
router.delete('/:id/delete', authMiddleware.isAuthenticated, authMiddleware.isUser, reservationController.deleteReservation);
/**
 * @swagger
 * /api/reservations/{id}/cancel:
 *   post:
 *     summary: Cancel a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation cancelled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reservation not found
 */
router.post('/:id/cancel', authMiddleware.isAuthenticated, authMiddleware.isUser, reservationController.cancelReservation);

module.exports = router;