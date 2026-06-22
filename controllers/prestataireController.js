const mongoose = require('mongoose');
const Prestataire = require('../models/prestataire');
const Reservation = require('../models/reservation');
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailVerification');
const { getIO } = require('../services/io');
const Facture = require('../models/facture');
const Service = require('../models/service');
const Notification = require('../models/notification');
const io = require('../services/io').getIO(); // Add this line

const emitNotification = (recipientId, notification) => {
  io.to(`user_${recipientId}`).emit('newNotification', notification);
};
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '60m';

// Register a new prestataire
exports.register = async (req, res) => {
  console.log('register function called');
  try {
    const { email, motDePasse, type, nom, prenom, telephone, adresse, ville, codePostal, pays, description, choixRole } = req.body;


    if (!email || !motDePasse || !type || !nom || !prenom || !telephone || !adresse || !ville || !codePostal || !pays || !description || !choixRole) {
      return res.status(400).json({ error: 'All fields are required' });
    }


    if (!/^\+?\d{8,15}$/.test(telephone)) {
      return res.status(400).json({ error: 'Phone number must be 11 digits' });
    }


    if (!/^\d{4}$/.test(codePostal)) {
      return res.status(400).json({ error: 'Postal code must be 4 digits' });
    }


    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!req.files || !req.files['photoProfil']) {
      return res.status(400).json({ error: 'Profile photo is required' });
    }


    if (type === 'individual' && !req.files['documentIdentite']) {
      return res.status(400).json({ error: 'Identity document is required for individual prestataires' });
    }

    if (type === 'entreprise' && !req.files['documentEntreprise']) {
      return res.status(400).json({ error: 'Company document is required for enterprise prestataires' });
    }
    const existingPrestataire = await Prestataire.findOne({ email });
    if (existingPrestataire) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const autoVerify = process.env.AUTO_VERIFY_EMAIL === 'true';
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const verificationToken = autoVerify ? undefined : generateVerificationToken();
    const prestataire = new Prestataire({
      email,
      motDePasse: hashedPassword,
      type,
      nom,
      prenom,
      telephone,
      adresse,
      ville,
      codePostal,
      pays,
      choixRole,
      description,
      verificationToken,
      isVerified: autoVerify,
      photoProfil: req.files['photoProfil'][0].path,
      documentIdentite: type === 'individual' ? req.files['documentIdentite'][0].path : null,
      documentEntreprise: type === 'entreprise' ? req.files['documentEntreprise'][0].path : null,
      status: 'pending',
      subscriptionStatus: 'cancel'
    });
    await prestataire.save();
    if (!autoVerify) {
      try {
        await sendVerificationEmail(email, verificationToken);
        console.log(`Verification email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        return res.status(500).json({
          error: 'Registration successful but failed to send verification email. Please contact support.'
        });
      }
    }
    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.', data: prestataire });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, motDePasse, password } = req.body;
    const prestataire = await Prestataire.findOne({ email });
    if (!prestataire) return res.status(404).json({ error: 'Prestataire not found' });

    if (!prestataire.isVerified) {
      return res.status(403).json({ error: 'Account not verified. Please check your email for verification link.' });
    }

    if (!prestataire.motDePasse) return res.status(500).json({ error: 'Password hash not found' });
    const passwordToCheck = motDePasse || password;
    const isPasswordValid = await bcrypt.compare(passwordToCheck, prestataire.motDePasse);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid password' });

    // In the login function, update the jwt.sign call:
    const accessToken = jwt.sign({ prestataireId: prestataire._id, role: 'prestataire' }, ACCESS_TOKEN_SECRET, { expiresIn: JWT_EXPIRATION });
    const refreshToken = jwt.sign({ prestataireId: prestataire._id, role: 'prestataire' }, REFRESH_TOKEN_SECRET);

    prestataire.refreshToken = refreshToken;
    await prestataire.save();

    // Fetch unread notifications for the prestataire
    const unreadNotifications = await Notification.find({
      recipient: prestataire._id,
      recipientType: 'Prestataire',
      read: false
    }).sort({ createdAt: -1 });

    // Join the prestataire to a socket room
    console.log(`Connecting prestataire ${prestataire._id} to socket room`);
    const socketIO = getIO();
    console.log(`Socket.io instance obtained: ${socketIO ? 'success' : 'failed'}`);
    socketIO.to(`prestataire_${prestataire._id}`).emit('prestataireLoggedIn', {
      prestataireId: prestataire._id,
      unreadNotifications: unreadNotifications
    });
    console.log(`Socket event 'prestataireLoggedIn' emitted for prestataire ${prestataire._id}`);

    res.status(200).json({
      accessToken,
      refreshToken,
      unreadNotifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getPrestataires = async (req, res) => {
  try {
    const prestataires = await Prestataire.find();
    res.status(200).json(prestataires);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getPrestataireById = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.params.id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json({
      ...prestataire.toObject(),
      subscriptionStatus: prestataire.subscriptionStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const prestataireId = req.params.id;

    // Check if prestataire exists
    const prestataire = await Prestataire.findById(prestataireId);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }


    const {
      nom,
      prenom,
      email,
      adresse,
      telephone,
      ville,
      codePostal,
      pays,
      description
    } = req.body;


    const updateData = {};
    if (nom) updateData.nom = nom;
    if (prenom) updateData.prenom = prenom;
    if (email) updateData.email = email;
    if (adresse) updateData.adresse = adresse;
    if (telephone) updateData.telephone = telephone;
    if (ville) updateData.ville = ville;
    if (codePostal) updateData.codePostal = codePostal;
    if (pays) updateData.pays = pays;
    if (description) updateData.description = description;


    if (req.file) {
      updateData.photoProfil = req.file.path;
    }


    const updatedPrestataire = await Prestataire.findByIdAndUpdate(
      prestataireId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      prestataire: updatedPrestataire
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.updatePrestataire = async (req, res) => {
  try {
    const { nom, prenom, email, adresse, telephone, ville, codePostal, pays, description, status } = req.body;
    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (email !== undefined) updateData.email = email;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (ville !== undefined) updateData.ville = ville;
    if (codePostal !== undefined) updateData.codePostal = codePostal;
    if (pays !== undefined) updateData.pays = pays;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const prestataire = await Prestataire.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json(prestataire);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.deletePrestataire = async (req, res) => {
  try {
    const prestataire = await Prestataire.findByIdAndDelete(req.params.id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }
    res.status(200).json({ message: 'Prestataire deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




exports.addService = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      subCategory,
      bestOffer,
      bestRating,
      closest,
      promotion,
      newCategory,
      newSubCategory,
      duration,
      availability
    } = req.body;


    if (!name || !description || !price) {
      return res.status(400).json({ error: 'Service name, description, and price are required' });
    }

    const prestataireId = req.params.id;

    let categoryId, subCategoryId;
    let pendingCategoryCreation = false;


    if (newCategory) {
      const existingCategory = await Category.findOne({ name: newCategory.name });
      if (existingCategory) {
        return res.status(400).json({ error: 'Category already exists' });
      }


      const newCategoryDoc = new Category({
        name: newCategory.name,
        description: newCategory.description,
        status: 'pending',
        createdBy: prestataireId,
        isSubCategory: false
      });
      await newCategoryDoc.save();
      categoryId = newCategoryDoc._id;
      pendingCategoryCreation = true;


      if (!newSubCategory) {
        return res.status(400).json({ error: 'A new subcategory must be provided when creating a new category' });
      }


      const existingSubCategory = await SubCategory.findOne({ name: newSubCategory.name, category: categoryId });
      if (existingSubCategory) {
        return res.status(400).json({ error: 'Subcategory already exists in this category' });
      }


      const newSubCategoryDoc = new SubCategory({
        name: newSubCategory.name,
        description: newSubCategory.description,
        category: categoryId,
        services: []
      });
      await newSubCategoryDoc.save();
      subCategoryId = newSubCategoryDoc._id;


      await Category.findByIdAndUpdate(
        categoryId,
        { $push: { subCategories: newSubCategoryDoc._id } }
      );


      const admin = await Admin.findOne({ role: 'Admin' });
      const categoryNotification = new Notification({
        recipient: admin._id,
        recipientType: 'Admin',
        type: 'SYSTEM',
        title: 'New Category and SubCategory Pending Approval',
        message: `New category "${newCategory.name}" and subcategory "${newSubCategory.name}" require approval`,
        data: { categoryId: newCategoryDoc._id, subCategoryId: newSubCategoryDoc._id }
      });
      await categoryNotification.save();
    } else {

      if (newSubCategory) {

        if (!category) {
          return res.status(400).json({ error: 'Category ID is required when adding a new subcategory' });
        }

        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
          return res.status(400).json({ error: 'Category must exist to add a new subcategory' });
        }


        categoryId = existingCategory._id;

        // Check if subcategory already exists
        const existingSubCategory = await SubCategory.findOne({ name: newSubCategory.name, category: categoryId });
        if (existingSubCategory) {
          return res.status(400).json({ error: 'Subcategory already exists in this category' });
        }


        const newSubCategoryDoc = new SubCategory({
          name: newSubCategory.name,
          description: newSubCategory.description,
          category: categoryId,
          services: []
        });
        await newSubCategoryDoc.save();
        subCategoryId = newSubCategoryDoc._id;
        pendingCategoryCreation = true;


        await Category.findByIdAndUpdate(
          categoryId,
          { $push: { subCategories: newSubCategoryDoc._id } }
        );


        const admin = await Admin.findOne({ role: 'Admin' });
        const subCategoryNotification = new Notification({
          recipient: admin._id,
          recipientType: 'Admin',
          type: 'SYSTEM',
          title: 'New SubCategory Pending Approval',
          message: `New subcategory "${newSubCategory.name}" requires approval`,
          data: { subCategoryId: newSubCategoryDoc._id }
        });
        await subCategoryNotification.save();
      } else {
        categoryId = mongoose.Types.ObjectId.isValid(category)
          ? category
          : (await Category.findOne({ name: category, isSubCategory: false }))._id;

        subCategoryId = mongoose.Types.ObjectId.isValid(subCategory)
          ? subCategory
          : (await SubCategory.findOne({ name: subCategory, category: categoryId }))._id;
      }
    }

    const prestataire = await Prestataire.findById(prestataireId);
    if (!prestataire) {
      return res.status(400).json({ error: 'Invalid prestataire ID' });
    }


    console.log('Creating service with categoryId:', categoryId);
    console.log('Creating service with subCategoryId:', subCategoryId);


    const service = new Service({
      name,
      description,
      price: Number(price),
      images: req.files ? req.files.map(file => file.path) : [],
      category: categoryId,
      subCategory: subCategoryId,
      bestOffer,
      bestRating,
      closest,
      promotion,
      prestataireId: prestataireId,
      providerId: prestataireId,
      address: prestataire.adresse,
      status: pendingCategoryCreation ? 'en attente' : 'confirmé',
      duration: duration || null,
      availability: availability || 'available'
    });

    await service.save();


    const prestataireNotification = new Notification({
      recipient: prestataireId,
      recipientType: 'Prestataire',
      type: 'SYSTEM',
      title: pendingCategoryCreation ? 'Service Pending Category Approval' : 'Service Created',
      message: pendingCategoryCreation
        ? 'Your service has been created but is pending category/subcategory approval'
        : 'Your service has been created successfully',
      data: { serviceId: service._id }
    });
    await prestataireNotification.save();

    return res.status(201).json({
      service,
      categoryStatus: pendingCategoryCreation ? 'pending' : 'approved',
      serviceStatus: service.status,
      message: pendingCategoryCreation
        ? 'Service created and waiting for category/subcategory approval'
        : 'Service created successfully'
    });
  } catch (error) {
    console.error('Error adding service:', error);
    return res.status(400).json({ error: error.message });
  }
};

// Accept a reservation
exports.acceptReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }


    if (reservation.prestataireId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this reservation' });
    }


    reservation.status = 'confirmé';
    await reservation.save();

    // Create notification for user
    const userNotification = new Notification({
      recipient: reservation.userId,
      recipientType: 'User',
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Confirmed',
      message: `Your reservation for ${reservation.serviceName} has been confirmed`,
      data: { reservationId: reservation._id }
    });

    await userNotification.save();
    console.log('User notification:', userNotification);

    emitNotification(userNotification.recipient, userNotification);

    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.declineReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }


    if (reservation.prestataireId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this reservation' });
    }


    reservation.status = 'annulé';
    await reservation.save();
    const userNotification = new Notification({
      recipient: reservation.userId,
      recipientType: 'User',
      type: 'RESERVATION_CANCELLED',
      title: 'Reservation Declined',
      message: `Your reservation for ${reservation.serviceName} has been declined`,
      data: { reservationId: reservation._id }
    });

    await userNotification.save();
    console.log('User notification:', userNotification);

    emitNotification(userNotification.recipient, userNotification);

    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.prepareInvoice = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('prestataireId');

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }


    if (reservation.prestataireId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to prepare invoice for this reservation' });
    }


    if (reservation.status !== 'confirmé') {
      return res.status(400).json({ error: 'Only confirmed reservations can have invoices prepared' });
    }

    const prestataire = reservation.prestataireId;


    const montantTotal = req.body.invoicePreparation?.montantTotal;
    const montantHT = req.body.invoicePreparation?.montantHT;
    const tauxTVA = req.body.invoicePreparation?.tauxTVA;


    reservation.invoicePreparation = {
      workHours: req.body.workHours || req.body.invoicePreparation?.details?.workHours || 1,
      details: {
        tarifHoraire: req.body.details?.tarifHoraire || req.body.invoicePreparation?.details?.tarifHoraire || reservation.price,
        equipements: req.body.details?.equipements || req.body.invoicePreparation?.details?.equipements || 0,
        nombrePersonnel: req.body.details?.nombrePersonnel || req.body.invoicePreparation?.details?.nombrePersonnel || 0,
        coutPersonnel: req.body.details?.coutPersonnel || req.body.invoicePreparation?.details?.coutPersonnel || 0
      },
      tva: req.body.tva || (prestataire.type === 'entreprise' ? 0.2 : 0),
      tauxTVA: tauxTVA || (prestataire.type === 'entreprise' ? 20 : 0),
      preparedAt: new Date()
    };


    let basePrice = reservation.price;


    if (reservation.invoicePreparation.workHours) {
      basePrice = reservation.invoicePreparation.details.tarifHoraire * reservation.invoicePreparation.workHours;
    }

    // For enterprise prestataires, add equipment and personnel costs
    if (prestataire.type === 'entreprise') {
      basePrice += reservation.invoicePreparation.details.equipements;
      basePrice += (reservation.invoicePreparation.details.nombrePersonnel *
        reservation.invoicePreparation.details.coutPersonnel);
    }


    reservation.invoicePreparation.montantHT = montantHT || basePrice;


    const tvaAmount = reservation.invoicePreparation.montantHT * reservation.invoicePreparation.tva;


    reservation.invoicePreparation.montantTotal = montantTotal || (reservation.invoicePreparation.montantHT + tvaAmount);


    reservation.invoicePreparation.estimatedPrice = reservation.invoicePreparation.montantTotal;

    await reservation.save();

    const userNotification = new Notification({
      recipient: reservation.userId,
      recipientType: 'User',
      type: 'INVOICE_PREPARED',
      title: 'Invoice Prepared',
      message: `${prestataire.nom} has prepared an invoice for your service. Estimated price: ${reservation.invoicePreparation.montantTotal}`,
      data: {
        reservationId: reservation._id,
        estimatedPrice: reservation.invoicePreparation.montantTotal
      }
    });

    await userNotification.save();


    emitNotification(userNotification.recipient, userNotification);

    res.status(200).json({
      message: 'Invoice details prepared successfully',
      reservation,
      estimatedPrice: reservation.invoicePreparation.montantTotal
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.completeReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('prestataireId');

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }


    if (reservation.prestataireId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to complete this reservation' });
    }


    if (reservation.status !== 'confirmé') {
      return res.status(400).json({ error: 'Only confirmed reservations can be completed' });
    }


    if (!reservation.price) {
      return res.status(400).json({ error: 'Price is required to complete the reservation' });
    }

    const prestataire = reservation.prestataireId;


    if (prestataire.type === 'entreprise' && !reservation.invoicePreparation) {
      return res.status(400).json({
        error: 'For enterprise prestataires, invoice details must be prepared before completing the reservation',
        message: 'Please use the prepare-invoice endpoint first'
      });
    }


    let workHours, details, tva, montantHT, montantTotal;

    if (reservation.invoicePreparation) {

      workHours = reservation.invoicePreparation.workHours;
      details = reservation.invoicePreparation.details;
      tva = reservation.invoicePreparation.tva;
      montantHT = reservation.invoicePreparation.montantHT;
      montantTotal = reservation.invoicePreparation.montantTotal;
    } else {

      workHours = req.body.workHours;
      details = req.body.details || {};
      tva = req.body.tva || 0;


      if (prestataire.type === 'individual' && !workHours) {
        return res.status(400).json({ error: 'Work hours are required to complete the reservation for individual prestataires' });
      }
    }


    reservation.workHours = workHours || 1;


    let additionalServicesTotal = 0;

    const additionalServices = req.body.additionalServices ||
      (req.body.invoice && req.body.invoice.additionalServices) || [];

    if (additionalServices && Array.isArray(additionalServices)) {
      // Map the additionalServices to ensure they have the correct structure
      reservation.additionalServices = additionalServices.map(service => ({
        name: service.name,
        description: service.description || '',
        price: service.price || service.cost || 0  // Handle both price and cost
      }));

      additionalServicesTotal = reservation.additionalServices.reduce(
        (total, service) => total + (service.price || 0), 0
      );
    }

    // Calculate final price
    let finalPrice;

    // Use finalPrice from request if provided
    if (req.body.finalPrice) {
      finalPrice = req.body.finalPrice;
    } else if (prestataire.type === 'entreprise' && reservation.invoicePreparation) {
      // For enterprise prestataires with prepared invoice
      finalPrice = montantTotal + additionalServicesTotal;
    } else {
      // For individual prestataires or backward compatibility
      finalPrice = reservation.price * (workHours || 1) + additionalServicesTotal;
    }

    // Set the final price
    reservation.finalPrice = finalPrice;

    // Update reservation status
    reservation.status = 'terminé';
    await reservation.save();

    // Generate invoice
    let facture = null;

    if (prestataire.type === 'entreprise') {
      // Generate invoice number with 'ENT' prefix for enterprise
      const invoiceNumber = `ENT-${Date.now()}`;

      // Create facture with prepared details
      // For enterprise prestataires
      // For enterprise prestataires
      facture = new Facture({
        numeroFacture: invoiceNumber,
        reservationId: reservation._id,
        userId: reservation.userId,
        prestataireId: reservation.prestataireId._id,
        serviceId: reservation.serviceId,
        serviceName: reservation.serviceName,
        montantTotal: finalPrice,
        tva: tva || 0.2,
        montantHT: montantHT || (finalPrice / (1 + (tva || 0.2))),
        details: {
          tarifHoraire: details.tarifHoraire || reservation.price,
          heuresTravail: workHours || 1,
          equipements: details.equipements || 0,
          nombrePersonnel: details.nombrePersonnel || 0,
          coutPersonnel: details.coutPersonnel || 0,
          additionalServices: reservation.additionalServices || []  // Move this inside details
        },
        status: 'en attente',
        type: 'enterprise'
      });

      await facture.save();
      reservation.invoiceId = facture._id;
      reservation.paymentStatus = 'facturé';
      await reservation.save();
      // Create notification for enterprise invoice
      const userNotification = new Notification({
        recipient: reservation.userId,
        recipientType: 'User',
        type: 'PAYMENT_RECEIVED',
        title: 'Enterprise Invoice Generated',
        message: `Invoice #${invoiceNumber} has been generated for your service with ${prestataire.nom}. Final price: ${finalPrice}`,
        data: { invoiceId: facture._id }
      });

      await userNotification.save();

      // Emit notification
      emitNotification(userNotification.recipient, userNotification);
    } else {
      // For individual prestataires, create a simple invoice/receipt
      const invoiceNumber = `IND-${Date.now()}`;

      facture = new Facture({
        numeroFacture: invoiceNumber,
        reservationId: reservation._id,
        userId: reservation.userId,
        prestataireId: reservation.prestataireId._id,
        serviceId: reservation.serviceId,
        serviceName: reservation.serviceName,
        montantTotal: finalPrice,
        tva: 0,
        montantHT: finalPrice,
        details: {
          tarifHoraire: details.tarifHoraire || reservation.price,
          heuresTravail: workHours || 1,
          equipements: details.equipements || 0,
          nombrePersonnel: 1,
          coutPersonnel: 0
        },
        status: 'en attente',
        type: 'individual'
      });

      // After saving the facture
      await facture.save();

      // Update the reservation with the invoice reference
      reservation.invoiceId = facture._id;
      reservation.paymentStatus = 'facturé';
      await reservation.save();

      // Create notification for individual invoice
      const userNotification = new Notification({
        recipient: reservation.userId,
        recipientType: 'User',
        type: 'INVOICE_PREPARED',
        title: 'Individual Invoice Generated',
        message: `Invoice #${invoiceNumber} has been generated for your service with ${prestataire.nom}. Final price: ${finalPrice.toFixed(2)}`,
        data: { invoiceId: facture._id }
      });

      await userNotification.save();

      // Emit notification
      emitNotification(userNotification.recipient, userNotification);
    }

    // For all prestataires, notify the user of completion
    const userNotification = new Notification({
      recipient: reservation.userId,
      recipientType: 'User',
      type: 'SERVICE_COMPLETED',
      title: 'Service Completed',
      message: `Your service with ${prestataire.nom} has been completed. Final price: ${finalPrice.toFixed(2)}`,
      data: {
        reservationId: reservation._id,
        invoiceId: facture ? facture._id : null
      }
    });

    await userNotification.save();

    // Emit completion notification
    emitNotification(userNotification.recipient, userNotification);

    res.status(200).json({
      message: 'Reservation completed successfully',
      reservation,
      invoice: facture,
      finalPrice: finalPrice  // Make sure this is included
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get prestataire profile with reservations and services
exports.getPrestataireProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Get prestataire details
    const prestataire = await Prestataire.findById(id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }

    // Get all services for this prestataire
    const services = await Service.find({ prestataireId: id });

    // Get all reservations for this prestataire
    const reservations = await Reservation.find({ prestataireId: id })
      .populate('userId', 'nom prenom email telephone')
      .populate('serviceId', 'name description price');

    res.status(200).json({
      prestataire,
      services,
      reservations
    });
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

    // Find prestataire with the refresh token
    const prestataire = await Prestataire.findOne({ refreshToken });

    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire not found' });
    }

    // Clear the refresh token and access token from the prestataire document
    prestataire.refreshToken = undefined;
    prestataire.accessToken = undefined;
    await prestataire.save();

    // Emit socket event for prestataire logout
    const io = getIO();
    if (io) {
      io.to(`prestataire_${prestataire._id}`).emit('prestataireLoggedOut', { prestataireId: prestataire._id });
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
