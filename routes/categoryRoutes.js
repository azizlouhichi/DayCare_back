const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');
const serviceController = require('../controllers/serviceController');
/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management
 */

// /**
//  * @swagger
//  * /api/categories:
//  *   post:
//  *     summary: Create a new category
//  *     tags: [Categories]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/Category'
//  *     responses:
//  *       201:
//  *         description: Category created successfully
//  *       400:
//  *         description: Bad request
//  *       401:
//  *         description: Unauthorized
//  */
// router.post('/', authenticatePrestataire, async (req, res) => {
//   try {
//     const { name, description, isSubCategory, parentCategory, bestOffer, bestRating, closest, promotion } = req.body;
    
//     const category = new Category({
//       name,
//       description,
//       createdBy: req.user.id,
//       isSubCategory,
//       parentCategory,
//       bestOffer,
//       bestRating,
//       closest,
//       promotion
//     });

//     await category.save();
//     res.status(201).send(category);
//   } catch (error) {
//     res.status(400).send(error);
//   }
// });

// /**
//  * @swagger
//  * /api/categories/pending:
//  *   get:
//  *     summary: Get pending categories (admin only)
//  *     tags: [Categories]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: List of pending categories
//  *       401:
//  *         description: Unauthorized
//  *       500:
//  *         description: Server error
//  */
// router.get('/pending', authenticateAdmin, async (req, res) => {
//   try {
//     const categories = await Category.find({ status: 'pending' });
//     res.send(categories);
//   } catch (error) {
//     res.status(500).send();
//   }
// });

// /**
//  * @swagger
//  * /api/categories/{id}/status:
//  *   patch:
//  *     summary: Approve/reject category (admin only)
//  *     tags: [Categories]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: Category ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               status:
//  *                 type: string
//  *                 enum: [approved, rejected]
//  *     responses:
//  *       200:
//  *         description: Category status updated
//  *       400:
//  *         description: Bad request
//  *       401:
//  *         description: Unauthorized
//  *       404:
//  *         description: Category not found
//  */
// router.patch('/:id/status', authenticateAdmin, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const category = await Category.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true }
//     );

//     if (!category) {
//       return res.status(404).send();
//     }

//     res.send(category);
//   } catch (error) {
//     res.status(400).send(error);
//   }
// });



router.get('/all', categoryController.getAllCategories);
router.get('/subcategories', categoryController.getAllSubCategories);
router.get('/categories-and-subcategories', categoryController.getAllCategoriesAndSubCategories);
router.get('/subcategories/:subCategoryId/services', authMiddleware.isAuthenticated, authMiddleware.isUser, serviceController.getServicesBySubCategory);
    
//     async (req, res) => {
//   try {
//     const { subCategoryId } = req.params;
//     const services = await serviceController.getServicesBySubCategory(subCategoryId);
//     res.status(200).json(services);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;