const express = require('express');
const router = express.Router();
const factureController = require('../controllers/factureController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Factures
 *   description: Facture management
 */

/**
 * @swagger
 * /api/factures:
 *   post:
 *     summary: Create a new facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Facture'
 *     responses:
 *       201:
 *         description: Facture created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// router.post('/', authMiddleware.isAuthenticated, factureController.generateFacture);

/**
 * @swagger
 * /api/factures:
 *   get:
 *     summary: Get all factures
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of factures
 *       401:
 *         description: Unauthorized
 */
router.get('/my-invoices', authMiddleware.isAuthenticated, factureController.getFactures);
router.post('/payments/:invoiceId/create-payment-intent', authMiddleware.isAuthenticated, factureController.createPaymentIntent);
/**
 * @swagger
 * /api/factures/{id}:
 *   get:
 *     summary: Get a facture by ID
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Facture ID
 *     responses:
 *       200:
 *         description: Facture data
 *       404:
 *         description: Facture not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authMiddleware.isAuthenticated, factureController.getFactureById);

/**
 * @swagger
 * /api/factures/{id}:
 *   put:
 *     summary: Update a facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Facture ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Facture'
 *     responses:
 *       200:
 *         description: Facture updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Facture not found
 */
router.put('/:id', authMiddleware.isAuthenticated, factureController.updateFacture);

/**
 * @swagger
 * /api/factures/{id}:
 *   delete:
 *     summary: Delete a facture
 *     tags: [Factures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Facture ID
 *     responses:
 *       200:
 *         description: Facture deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Facture not found
 */
router.delete('/:id', authMiddleware.isAuthenticated, factureController.deleteFacture);

module.exports = router;