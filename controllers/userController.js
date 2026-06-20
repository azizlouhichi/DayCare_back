const bcrypt = require('bcrypt');
const User = require('../models/user');
const { Resend } = require('resend');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailVerification');

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { motDePasse } = req.body;
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const verificationToken = generateVerificationToken();
    const user = new User({
      ...req.body,
      motDePasse: hashedPassword,
      verificationToken,
      isVerified: false,
      photoProfil: req.file ? req.file.path : null
    });
    await user.save();

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Email send failed (user still created):', emailError.message);
    }

    res.status(201).json({
      message: 'User created successfully. Please check your email for verification.',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user profile by ID
exports.getUserProfile = async (req, res) => {
  try {
    console.log('Finding user with ID:', req.params.id);
    const user = await User.findById(req.params.id);

    if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Utilisateur non trouvé dans la collection User" 
            });
        }
    console.log('User reservations before populate:', user.reservations);
    
    const populatedUser = await User.findById(req.params.id).populate({
      path: 'reservations',
      model: 'Reservation',
      populate: [
        {
          path: 'serviceId',
          select: 'name description price scheduledAt'
        },
        {
          path: 'prestataireId',
          select: 'nom prenom email telephone'
        }
      ]
    });
    
    console.log('User reservations after populate:', populatedUser.reservations);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({
      profile: user.profile,
      photoProfil: user.photoProfil,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      role: user.role,
      adresse: user.adresse,
      reservations: populatedUser.reservations.map(reservation => ({
        id: reservation._id,
        service: {
          name: reservation.serviceId?.name,
          description: reservation.serviceId?.description,
          price: reservation.serviceId?.price,
          date: reservation.serviceId?.scheduledAt
        },
        prestataire: {
          name: reservation.prestataireId?.nom,
          surname: reservation.prestataireId?.prenom,
          email: reservation.prestataireId?.email,
          phone: reservation.prestataireId?.telephone
        },
        status: reservation.status,
        reservationDate: reservation.reservationDateTime
      }))
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ error: error.message });
  }
};


// Update a user by ID
exports.updateUser = async (req, res) => {
  try {
    const { nom, prenom, email, adresse, telephone } = req.body;
    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (email !== undefined) updateData.email = email;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (telephone !== undefined) updateData.telephone = telephone;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Update user profile including photo
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get updated fields from request body
    const { nom, prenom, email, adresse, telephone } = req.body;
    
    // Create update object with fields that are provided
    const updateData = {};
    if (nom) updateData.nom = nom;
    if (prenom) updateData.prenom = prenom;
    if (email) updateData.email = email;
    if (adresse) updateData.adresse = adresse;
    if (telephone) updateData.telephone = telephone;
    
    // If a new profile photo was uploaded, add it to the update data
    if (req.file) {
      updateData.photoProfil = req.file.path;
    }
    
    // Update the user with the new data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Delete a user by ID
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Forgot password — generate OTP and send by email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: 'Day Care <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #0474ED, #0258C4); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 26px;">Password Reset</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Day Care Services</p>
          </div>
          <div style="padding: 40px; text-align: center;">
            <p style="color: #555; font-size: 16px; margin-bottom: 24px;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
            <div style="display: inline-block; background: #f0f6ff; border: 2px dashed #0474ED; border-radius: 12px; padding: 20px 40px; margin: 0 auto;">
              <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #0474ED;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 13px; margin-top: 30px;">If you didn't request this, ignore this email.</p>
          </div>
        </div>
      `
    });
    if (emailError) throw new Error(emailError.message);

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    user.motDePasse = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};