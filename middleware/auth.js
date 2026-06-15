const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Admin = require('../models/admin');
const Prestataire = require('../models/prestataire');
require('dotenv').config();

// Secret keys for JWT
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

/**
 * Middleware to verify if the request has a valid JWT token
 * This is the base authentication check that should be used first
 */
exports.isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Extract role and ID
    const { role, userId, adminId, prestataireId } = decoded;
    
    if (!role) {
      return res.status(403).json({ 
        success: false,
        message: 'Invalid token: role not found'
      });
    }

    // Attach basic user info to request
    req.user = {
      role: role.toLowerCase(),
      id: userId || adminId || prestataireId,
      tokenData: decoded
    };
    
    // Log for debugging
    console.log(`Authenticated user: ${req.user.role} (${req.user.id})`);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired',
        expired: true
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Middleware to verify if the authenticated user is an admin
 * Must be used after isAuthenticated
 */
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Verify admin exists in database
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(403).json({ 
        success: false,
        message: 'Admin not found in database'
      });
    }
    
    // Attach full admin data to request
    req.admin = admin;
    console.log(`Admin verified: ${admin._id}`);
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Admin verification error'
    });
  }
};

/**
 * Middleware to verify if the authenticated user is a provider (prestataire)
 * Must be used after isAuthenticated
 */
exports.isProvider = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!['prestataire', 'provider'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Provider access required'
      });
    }
    
    // Verify provider exists in database
    const prestataire = await Prestataire.findById(req.user.id);
    if (!prestataire) {
      return res.status(403).json({ 
        success: false,
        message: 'Provider not found in database'
      });
    }
    // Check if prestataire is approved
    if (prestataire.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account must be approved by an admin to access this resource.'
      });
    }
    // Allow access to subscription purchase endpoint even if no active subscription
    if (
      req.originalUrl &&
      req.method === 'POST' &&
      req.originalUrl.includes('/api/prestataire/subscribe')
    ) {
      req.prestataire = prestataire;
      return next();
    }
    // Check if prestataire has an active subscription
    const now = new Date();
    if (!prestataire.subscriptionType || !prestataire.subscriptionStartDate || !prestataire.subscriptionEndDate ||
        prestataire.subscriptionEndDate < now) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active subscription to access this resource.'
      });
    }
    // Attach full provider data to request
    req.prestataire = prestataire;
    console.log(`Provider verified: ${prestataire._id}`);
    
    next();
  } catch (error) {
    console.error('Provider verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Provider verification error'
    });
  }
};

/**
 * Middleware to verify if the authenticated user is a regular user
 * Must be used after isAuthenticated
 */
exports.isUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role.toLowerCase();
    if (userRole !== 'user' && userRole !== 'utilisateur') {
      return res.status(403).json({ 
        success: false,
        message: 'User access required'
      });
    }
    
    // Verify user exists in database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(403).json({ 
        success: false,
        message: 'User not found in database'
      });
    }
    
    // Attach full user data to request
    req.userData = user;
    console.log(`User verified: ${user._id}`);
    
    next();
  } catch (error) {
    console.error('User verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'User verification error'
    });
  }
};

/**
 * Middleware to verify if the user's email is verified
 * Must be used after isUser, isProvider, or isAdmin
 */
exports.isVerified = async (req, res, next) => {
  try {
    // Check which type of user we're dealing with
    const userObject = req.userData || req.prestataire || req.admin;
    
    if (!userObject) {
      return res.status(400).json({ 
        success: false,
        message: 'User data not found. Use this middleware after isUser, isProvider, or isAdmin'
      });
    }
    
    if (!userObject.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: 'Email verification required',
        verificationRequired: true
      });
    }
    
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Verification check error'
    });
  }
};

/**
 * Middleware to check if the user has specific permissions
 * Must be used after isAdmin, isProvider, or isUser
 * @param {Array} requiredPermissions - Array of permission strings
 */
exports.hasPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Check which type of user we're dealing with
      const userObject = req.admin || req.prestataire || req.userData;
      
      if (!userObject) {
        return res.status(400).json({ 
          success: false,
          message: 'User data not found. Use this middleware after isUser, isProvider, or isAdmin'
        });
      }
      
      // Skip permission check for admins if they have superAdmin flag
      if (req.admin && req.admin.superAdmin) {
        return next();
      }
      
      // Check if user has all required permissions
      const userPermissions = userObject.permissions || [];
      const hasAllPermissions = requiredPermissions.every(
        permission => userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return res.status(403).json({ 
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermissions,
          current: userPermissions
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Permission check error'
      });
    }
  };
};

/**
 * Middleware to refresh an expired token
 * Uses the refresh token to issue a new access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // Extract user data
    const { role, userId, adminId, prestataireId } = decoded;
    
    if (!role) {
      return res.status(403).json({ 
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Determine the user ID based on role
    const id = userId || adminId || prestataireId;
    
    // Create a new access token
    const newAccessToken = jwt.sign(
      { role, [getIdFieldForRole(role)]: id },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newAccessToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token expired, please login again',
        loginRequired: true
      });
    }
    
    console.error('Token refresh error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Helper function to get the correct ID field name based on role
function getIdFieldForRole(role) {
  const normalizedRole = role.toLowerCase();
  
  if (['user', 'utilisateur'].includes(normalizedRole)) {
    return 'userId';
  }
  
  if (['prestataire', 'provider'].includes(normalizedRole)) {
    return 'prestataireId';
  }
  
  if (normalizedRole === 'admin') {
    return 'adminId';
  }
  
  return 'userId'; // Default
}