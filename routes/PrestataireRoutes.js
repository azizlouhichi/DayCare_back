const express = require('express');
const router = express.Router();
const prestataireController = require('../controllers/prestataireController');
const authMiddleware = require('../middleware/auth');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const subscriptionController = require('../controllers/subscriptionController');
const bodyParser = require('body-parser');


/**
 * @swagger
 * /api/prestataire/register:
 *   post:
 *     summary: Register a new prestataire
 *     tags: [Prestataire]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Prestataire'
 *     responses:
 *       201:
 *         description: Prestataire registered successfully
 *       400:
 *         description: Bad request
 */
router.post('/register', uploadMiddleware.prestataireDocsUpload, prestataireController.register);

/**
 * @swagger
 * /api/prestataire/login:
 *   post:
 *     summary: Login a prestataire
 *     tags: [Prestataire]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post('/login', prestataireController.login);

/**
 * @swagger
 * /api/prestataire:
 *   get:
 *     summary: Get all prestataires
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of prestataires
 *       401:
 *         description: Unauthorized
 */
router.get('/', prestataireController.getPrestataires);

/**
 * @swagger
 * /api/prestataire/{id}:
 *   get:
 *     summary: Get a single prestataire by ID
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Prestataire ID
 *     responses:
 *       200:
 *         description: Prestataire data
 *       404:
 *         description: Prestataire not found
 */
router.get('/:id', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.getPrestataireById);

/**
 * @swagger
 * /api/prestataire/{id}:
 *   put:
 *     summary: Update a prestataire by ID
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Prestataire ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Prestataire'
 *     responses:
 *       200:
 *         description: Prestataire updated
 *       404:
 *         description: Prestataire not found
 */
router.put('/:id', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.updatePrestataire);

/**
 * @swagger
 * /api/prestataire/{id}:
 *   delete:
 *     summary: Delete a prestataire by ID
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Prestataire ID
 *     responses:
 *       200:
 *         description: Prestataire deleted
 *       404:
 *         description: Prestataire not found
 */
router.delete('/:id', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.deletePrestataire);

/**
 * @swagger
 * /api/prestataire/{id}/services:
 *   post:
 *     summary: Add a service to prestataire
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Prestataire ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *     responses:
 *       200:
 *         description: Service added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Prestataire not found
 */
router.post('/:id/services', authMiddleware.isAuthenticated, authMiddleware.isProvider,uploadMiddleware.multipleUpload, prestataireController.addService);

/**
 * @swagger
 * /api/prestataire/reservations/{id}/accept:
 *   put:
 *     summary: Accept a reservation
 *     tags: [Prestataire]
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
 *         description: Reservation accepted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.put('/reservations/:id/accept', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.acceptReservation);

/**
 * @swagger
 * /api/prestataire/reservations/{id}/decline:
 *   put:
 *     summary: Decline a reservation
 *     tags: [Prestataire]
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
 *         description: Reservation declined successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.put('/reservations/:id/decline', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.declineReservation);

/**
 * @swagger
 * /api/prestataire/reservations/{id}/complete:
 *   put:
 *     summary: Complete a reservation
 *     tags: [Prestataire]
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
 *         description: Reservation completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to complete this reservation
 *       404:
 *         description: Reservation not found
 */
// router.put('/reservations/:id/complete', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.completeReservation);

// Swagger setup
//  options = {
//   definition: {
//     // openapi: '3.0.0',
//     info: {
//       title: 'Prestataire API',
//       version: '1.0.0',
//     },
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         }
//       },
//       schemas: {
//         Prestataire: {
//           type: 'object',
//           properties: {
//             type: { 
//               type: 'string',
//               enum: ['individual', 'entreprise'],
//               description: 'Type of prestataire (individual or entreprise)'
//             },
//             name: { type: 'string' },
//             email: { type: 'string' },
//             password: { type: 'string' },
//             phone: { type: 'string' },
//             address: { type: 'string' },
//             photoProfil: { 
//               type: 'string', 
//               format: 'binary',
//               description: 'Profile photo (required for individual prestataires)' 
//             },
//             documentIdentite: { 
//               type: 'string', 
//               format: 'binary',
//               description: 'Identity document (required for individual prestataires)' 
//             },
//             documentEntreprise: { 
//               type: 'string', 
//               format: 'binary',
//               description: 'Company document (required for entreprise prestataires)' 
//             },
//             services: { type: 'array', items: { type: 'string' } },
//             rating: { type: 'number' },
//             availability: { type: 'boolean' }
//           },
//           required: ['type', 'name', 'email', 'password']
//         },
//         Service: {
//           type: 'object',
//           properties: {
//             name: { type: 'string' },
//             description: { type: 'string' },
//             price: { type: 'number' },
//             category: { type: 'string' },
//             subcategory: { type: 'string' },
//             duration: { type: 'string' },
//             prestataireId: { type: 'string' }
//           },
//           required: ['name', 'description', 'price', 'category', 'prestataireId']
//         }
//       }
//     }
//   },
//   apis: ['./routes/*.js'],
// };

//  specs = swaggerJsdoc(options);
// router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /api/prestataire/subscribe:
 *   post:
 *     summary: Purchase a subscription for a prestataire
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [monthly, 6months, yearly]
 *               paymentMethod:
 *                 type: string
 *             required:
 *               - type
 *               - paymentMethod
 *     responses:
 *       201:
 *         description: Subscription purchased successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Payment failed
 */


router.post('/subscribe', authMiddleware.isAuthenticated, authMiddleware.isProvider, subscriptionController.purchaseSubscription);
// router.post('/webhook', bodyParser.raw({ type: 'application/json' }), subscriptionController.stripeWebhook);



/**
 * @swagger
 * /api/prestataire/profile/{id}:
 *   get:
 *     summary: Get prestataire profile with reservations and services
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Prestataire ID
 *     responses:
 *       200:
 *         description: Prestataire profile data with reservations and services
 *       404:
 *         description: Prestataire not found
 */
router.get('/profile/:id', authMiddleware.isAuthenticated, prestataireController.getPrestataireProfile);
/**
 * @swagger
 * /api/prestataire/profile/{id}:
 *   put:
 *     summary: Update prestataire profile including photo
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Prestataire ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               email:
 *                 type: string
 *               adresse:
 *                 type: string
 *               telephone:
 *                 type: string
 *               ville:
 *                 type: string
 *               codePostal:
 *                 type: string
 *               pays:
 *                 type: string
 *               description:
 *                 type: string
 *               photoProfil:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Prestataire not found
 */
router.put('/profile/:id', authMiddleware.isAuthenticated, uploadMiddleware.singleUpload, prestataireController.updateProfile);

/**
 * @swagger
 * /api/prestataire/reservations/{id}/accept:
 *   put:
 *     summary: Accept a reservation
 *     tags: [Prestataire]
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
 *         description: Reservation accepted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
// router.put('/reservations/:id/decline', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.declineReservation);

/**
 * @swagger
 * /api/prestataire/reservations/{id}/complete:
 *   put:
 *     summary: Mark reservation as completed
 *     tags: [Prestataire]
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
 *         description: Reservation completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */router.put('/reservations/:id/prepare-invoice', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.prepareInvoice);
router.put('/reservations/:id/complete', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.completeReservation);

// Swagger setup
// const options = {
//   definition: {
//     // openapi: '3.0.0',
//     info: {
//       title: 'Prestataire API',
//       version: '1.0.0',
//     },
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         }
//       },
//       schemas: {
//         Prestataire: {
//           type: 'object',
//           properties: {
//             type: { 
//               type: 'string',
//               enum: ['individual', 'entreprise'],
//               description: 'Type of prestataire (individual or entreprise)'
//             },
//             name: { type: 'string' },
//             email: { type: 'string' },
//             password: { type: 'string' },
//             phone: { type: 'string' },
//             address: { type: 'string' },
//             photoProfil: { 
//               type: 'string', 
//               format: 'binary',
//               description: 'Profile photo (required for individual prestataires)' 
//             },
//             documentIdentite: { 
//               type: 'string', 
//               format: 'binary',
//               description: 'Identity document (required for individual prestataires)' 
//             },
//             documentEntreprise: { 
//               type: 'string', 
//               format: 'binary',
//               description: 'Company document (required for entreprise prestataires)' 
//             },
//             services: { type: 'array', items: { type: 'string' } },
//             rating: { type: 'number' },
//             availability: { type: 'boolean' }
//           },
//           required: ['type', 'name', 'email', 'password']
//         },
//         Service: {
//           type: 'object',
//           properties: {
//             name: { type: 'string' },
//             description: { type: 'string' },
//             price: { type: 'number' },
//             category: { type: 'string' },
//             subcategory: { type: 'string' },
//             duration: { type: 'string' },
//             prestataireId: { type: 'string' }
//           },
//           required: ['name', 'description', 'price', 'category', 'prestataireId']
//         }
//       }
//     }
//   },
//   apis: ['./routes/*.js'],
// };

// const specs = swaggerJsdoc(options);
// router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /api/prestataire/subscribe:
 *   post:
 *     summary: Purchase a subscription for a prestataire
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [monthly, 6months, yearly]
 *               paymentMethod:
 *                 type: string
 *             required:
 *               - type
 *               - paymentMethod
 *     responses:
 *       201:
 *         description: Subscription purchased successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Payment failed
 */



/**
 * @swagger
 * /api/prestataire/logout:
 *   post:
 *     summary: Logout a prestataire
 *     tags: [Prestataire]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Bad request (missing refresh token)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Prestataire not found
 */
router.post('/logout', authMiddleware.isAuthenticated, authMiddleware.isProvider, prestataireController.logout);
module.exports = router;
