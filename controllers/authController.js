const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { getIO } = require('../services/io');
const io = require('../services/io').getIO();
const Notification = require('../models/notification');


// Secret keys for JWT
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '60m';


// Register a new user
// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

exports.register = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const autoVerify = process.env.AUTO_VERIFY_EMAIL === 'true';

    const user = new User({
      ...req.body,
      motDePasse: hashedPassword,
      verificationToken: autoVerify ? undefined : verificationToken,
      isVerified: autoVerify
    });

    if (user.motDePasse === motDePasse || !user.motDePasse.startsWith('$2b$')) {
      throw new Error('Password was not hashed properly');
    }

    await user.save();

    if (autoVerify) {
      return res.status(201).json({ message: 'Registration successful. Your account is verified.' });
    }

    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        html: `Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`
      });
      console.log(`Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        error: 'Registration successful but failed to send verification email. Please contact support.'
      });
    }

    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login a user
// Login a user
exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Account not verified. Please check your email for verification link.' });
    }

    if (!user.motDePasse || !motDePasse) {
      return res.status(500).json({ error: 'Password data missing' });
    }
    const isPasswordValid = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid password' });

    const accessToken = jwt.sign({
      userId: user._id,
      role: user.choixRole || 'user' // Default to 'user' if choixRole is not set
    }, ACCESS_TOKEN_SECRET, { expiresIn: '60m' });
    const refreshToken = jwt.sign({
      userId: user._id,
      role: user.choixRole || 'user' // Default to 'user' if choixRole is not set
    }, REFRESH_TOKEN_SECRET);

    user.refreshToken = refreshToken;
    await user.save();

    // Fetch unread notifications for the user
    const unreadNotifications = await Notification.find({
      recipient: user._id,
      recipientType: 'User',
      read: false
    }).sort({ createdAt: -1 });

    console.log(`User ${user._id} logged in successfully`);

    // Debug socket connection
    console.log(`Attempting socket connection for user ${user._id}`);
    const io = getIO(); // Use getIO() to access io safely
    console.log(`Socket.io instance obtained: ${io ? 'success' : 'failed'}`);

    // Join the user to a socket room
    io.to(`user_${user._id}`).emit('userLoggedIn', {
      userId: user._id,
      unreadNotifications: unreadNotifications
    }); // Emit event after user login with notifications
    console.log(`Socket event emitted for user ${user._id}`);


    res.status(200).json({
      accessToken,
      refreshToken,
      unreadNotifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(404).json({ error: 'Invalid verification token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();


    const filePath = path.join(__dirname, '../views/verificationSuccess.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading verification success template:', err);
        return res.status(200).json({ message: 'Email verified successfully' });
      }
      res.status(200).send(data);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'Token is required' });

  try {
    const user = await User.findOne({ refreshToken: token });
    if (!user) return res.status(403).json({ error: 'Invalid refresh token' });

    jwt.verify(token, REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid refresh token' });

      const accessToken = jwt.sign({ userId: user._id, role: user.choixRole }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      res.status(200).json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        html: `Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a>`
      });
      console.log(`Verification email resent to ${email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }

    res.status(200).json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }


    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }


    user.refreshToken = undefined;
    await user.save();


    const io = getIO();
    if (io) {
      io.to(`user_${user._id}`).emit('userLoggedOut', { userId: user._id });
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};