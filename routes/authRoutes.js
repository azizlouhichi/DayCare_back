
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require('../models/user');
const Prestataire = require('../models/prestataire');

// Register a new user
router.post('/register', authController.register);

// Login a user
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login a user
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - motDePasse
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               motDePasse:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not verified
 *       404:
 *         description: User not found
 */
router.post('/login', authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Logout route
router.post('/logout', authController.logout);

// Resend verification email
router.post('/resend-verification', authController.resendVerification);

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    let account = await User.findOne({ verificationToken: token });
    if (!account) {
      account = await Prestataire.findOne({ verificationToken: token });
      if (!account) return res.status(404).json({ error: 'Invalid verification token' });
    }

    account.isVerified = true;
    account.verificationToken = undefined;
    await account.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;