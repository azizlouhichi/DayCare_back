const Reservation = require('../models/reservation');
const Notification = require('../models/notification');
const User = require('../models/user');
const Prestataire = require('../models/prestataire'); // Add this line
const Facture = require('../models/facture'); // Add this line
const io = require('../services/io').getIO();
const multer = require('../middleware/uploadMiddleware');

// Helper function to emit notifications to specific user rooms
const emitNotification = (recipientId, notification) => {
  io.to(`user_${recipientId}`).emit('newNotification', notification);
};

// Create a new reservation
exports.createReservation = async (req, res) => {
  try {
    const userRole = req.user.role.toLowerCase();
    if (userRole !== 'user' && userRole !== 'utilisateur' && userRole !== 'prestataire') {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
    
    // Validate required fields
    const { adresse, description, reservationDateTime, prestataireId, serviceName, price } = req.body;
    if (!adresse || !description || !reservationDateTime || !prestataireId || !serviceName || !price || !req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: adresse, description, reservationDateTime, prestataireId, serviceName, price, and at least one image'
      });
    }
    
    const reservationData = {
      ...req.body,
      userId: req.user.id, // Make sure userId is set from the authenticated user
      prestataireId: req.user.role === 'prestataire' ? req.user.id : req.body.prestataireId,
      images: req.files.map(file => file.path) // Store the uploaded image paths
    };
    const reservation = new Reservation(reservationData);
    await reservation.save();
    
    // Update the user's reservations array with the new reservation ID
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { reservations: reservation._id } }
    );
    
    // Create notifications for new reservation
    const userNotification = new Notification({
      recipient: req.user.id,
      recipientType: 'User',
      type: 'RESERVATION_CREATED',
      title: 'Reservation Created',
      message: `You have created a new  reservation for ${reservation.serviceName}`,
      data: { reservationId: reservation._id }
    }); 
    
    const prestataireNotification = new Notification({
      recipient: req.body.prestataireId,
      recipientType: 'Prestataire',
      type: 'NEW_RESERVATION',
      title: 'New Reservation',
      message: `You have a new reservation for ${reservation.serviceName}`,
      data: { reservationId: reservation._id }
    });
    
    await userNotification.save();
    await prestataireNotification.save();
    
    console.log('User notification:', userNotification);
    console.log('Prestataire notification:', prestataireNotification);

    emitNotification(userNotification.recipient, userNotification);
    emitNotification(prestataireNotification.recipient, prestataireNotification);
    
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all reservations (optionally filtered by userId or prestataireId)
exports.getReservations = async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    
    // If user is a prestataire, only show their reservations
    if (req.user.role === 'prestataire') {
      query.prestataireId = req.user.id;
    } 
    // If user is a regular user, show only their reservations
    else if (req.user.role === 'user' || req.user.role === 'utilisateur') {
      query.userId = req.user.id;
    }
    // If userId is explicitly provided (for admins or other special cases)
    else if (userId) {
      query.userId = userId;
    }
    
    const reservations = await Reservation.find(query)
      .populate('prestataireId')
      .populate('userId')
      .populate('serviceId');
      
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single reservation by ID
exports.getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('prestataireId')
      .populate('userId')
      .populate({
        path: 'serviceId',
        select: 'images name description price'
      });
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Check if the user has permission to view this reservation
    if (req.user.role === 'prestataire' && reservation.prestataireId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this reservation' });
    }
    
    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a reservation by ID
exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const oldStatus = reservation.status;
    const newStatus = req.body.status;
    const userRole = req.user?.role;
    
    // Role-based status update validation
    if (!userRole) {
      return res.status(403).json({ 
        error: 'User role not found in token' 
      });
    }
    
    if (userRole === 'user') {
      if (newStatus !== 'annulé' && newStatus !== oldStatus) {
        return res.status(403).json({ 
          error: 'Users can only cancel reservations or keep current status' 
        });
      }
    } else if (userRole === 'prestataire') {
      if (newStatus !== 'confirmé' && newStatus !== 'refusé' && newStatus !== 'terminé') {
        return res.status(403).json({ 
          error: 'User access required' 
        });
      }
    }
    
    // Validate status transition
    if (newStatus === 'confirmé' && oldStatus !== 'en attente') {
      return res.status(400).json({ error: 'Only pending reservations can be accepted' });
    }
    
    if (newStatus === 'terminé' && oldStatus !== 'confirmé') {
      return res.status(400).json({ error: 'Only accepted reservations can be completed' });
    }
    
    if (newStatus === 'annulé' && oldStatus === 'terminé') {
      return res.status(400).json({ error: 'Completed reservations cannot be cancelled' });
    }
    
    // Update reservation
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    // Send notifications based on status change
    if (newStatus !== oldStatus) {
      let userNotification, prestataireNotification;
      
      if (newStatus === 'confirmé') {
        userNotification = new Notification({
          recipient: updatedReservation.userId,
          recipientType: 'User',
          type: 'RESERVATION_CONFIRMED',
          title: 'Reservation Confirmed',
          message: `Your reservation for ${updatedReservation.serviceName} has been confirmed`,
          data: { reservationId: updatedReservation._id }
        });
        
        prestataireNotification = new Notification({
          recipient: updatedReservation.prestataireId,
          recipientType: 'Prestataire',
          type: 'RESERVATION_CONFIRMED_BY_YOU',
          title: 'Reservation Confirmed',
          message: `You have confirmed reservation for ${updatedReservation.serviceName}`,
          data: { reservationId: updatedReservation._id }
        });
      } else if (newStatus === 'terminé') {
        userNotification = new Notification({
          recipient: updatedReservation.userId,
          recipientType: 'User',
          type: 'SERVICE_COMPLETED',
          title: 'Service Completed',
          message: `Your service ${updatedReservation.serviceName} has been completed`,
          data: { reservationId: updatedReservation._id }
        });
        
        prestataireNotification = new Notification({
          recipient: updatedReservation.prestataireId,
          recipientType: 'Prestataire',
          type: 'SERVICE_COMPLETED_BY_YOU',
          title: 'Service Completed',
          message: `You have completed service ${updatedReservation.serviceName}`,
          data: { reservationId: updatedReservation._id }
        });
      } else if (newStatus === 'annulé') {
        userNotification = new Notification({
          recipient: updatedReservation.userId,
          recipientType: 'User',
          type: 'RESERVATION_CANCELLED',
          title: 'Reservation Cancelled',
          message: `Your reservation for ${updatedReservation.serviceName} has been cancelled`,
          data: { reservationId: updatedReservation._id }
        });
        
        prestataireNotification = new Notification({
          recipient: updatedReservation.prestataireId,
          recipientType: 'Prestataire',
          type: 'RESERVATION_CANCELLED_BY_YOU',
          title: 'Reservation Cancelled',
          message: `You have cancelled reservation for ${updatedReservation.serviceName}`,
          data: { reservationId: updatedReservation._id }
        });
      }
      
      // Auto-generate invoice for 'entreprise' type prestataires when marking reservation as completed
      if (newStatus === 'terminé' && userRole === 'prestataire') {
        // Get prestataire details to check type
        const prestataire = await Prestataire.findById(req.user.id);
        
        if (prestataire && prestataire.type === 'entreprise') {
          // Calculate invoice details based on reservation
          const workHours = updatedReservation.workHours || 1;
          const hourlyRate = updatedReservation.price || 0;
          const equipmentCost = req.body.equipmentCost || 0;
          const personnelCount = req.body.personnelCount || 0;
          const personnelCost = req.body.personnelCost || 0;
          
          const montantHT = (workHours * hourlyRate) + equipmentCost + (personnelCount * personnelCost);
          const tva = montantHT * 0.19; // 19% TVA
          const montantTotal = montantHT + tva;
          
          // Generate invoice number
          const invoiceNumber = `INV-${Date.now()}`;
          
          // Create facture
          const facture = new Facture({
            numeroFacture: invoiceNumber,
            reservationId: updatedReservation._id,
            userId: updatedReservation.userId,
            prestataireId: updatedReservation.prestataireId,
            serviceId: updatedReservation.serviceId,
            serviceName: updatedReservation.serviceName,
            details: {
              heuresTravail: workHours,
              tarifHoraire: hourlyRate,
              equipements: equipmentCost,
              nombrePersonnel: personnelCount,
              coutPersonnel: personnelCost
            },
            montantHT: montantHT,
            tva: tva,
            montantTotal: montantTotal,
            status: 'en attente'
          });
          
          await facture.save();
          
          // Update reservation with facture reference and final price
          // Change these lines:
          updatedReservation.invoiceId = facture._id;
          updatedReservation.finalPrice = montantTotal;
          updatedReservation.paymentStatus = 'facturé'; // Update payment status
          await updatedReservation.save();
          
          // Send notification to user about invoice generation
          const invoiceNotification = new Notification({
            recipient: updatedReservation.userId,
            recipientType: 'User',
            type: 'INVOICE_GENERATED',
            title: 'Invoice Generated',
            message: `An invoice #${invoiceNumber} has been generated for your completed service ${updatedReservation.serviceName}`,
            data: { 
              reservationId: updatedReservation._id,
              // To these:
              // updatedReservation.invoiceId = facture._id; <- This line causes the error
              invoiceId: facture._id 
            }
          });
          
          await invoiceNotification.save();
          emitNotification(invoiceNotification.recipient, invoiceNotification);
        }
      }
      
      if (userNotification) {
        await userNotification.save();
        console.log('Sending notification to user room:', `user_${userNotification.recipient}`, userNotification);
        io.to(`user_${userNotification.recipient}`).emit('newNotification', userNotification);
      }

      if (prestataireNotification) {
        await prestataireNotification.save();
        console.log('Sending notification to provider room:', `prestataire_${updatedReservation.prestataireId}`, prestataireNotification);
        io.to(`prestataire_${prestataireNotification.recipient}`).emit('newNotification', prestataireNotification);
      }
    }

    io.to(`user_${updatedReservation.userId}`).emit('reservationUpdated', updatedReservation);
    io.to(`prestataire_${updatedReservation.prestataireId}`).emit('reservationUpdated', updatedReservation);
    res.status(200).json(updatedReservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a reservation by ID
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Create notifications for reservation deletion
    // const userNotification = new Notification({
    //   recipient: reservation.id,
    //   recipientType: 'User',
    //   type: 'RESERVATION_CANCELLED',
    //   title: 'Reservation Cancelled',
    //   message: `Your reservation for ${reservation.serviceName} has been cancelled`,
    //   data: { reservationId: reservation._id }
    // });
    
    // const prestataireNotification = new Notification({
    //   recipient: reservation.prestataireId,
    //   recipientType: 'Prestataire',
    //   type: 'RESERVATION_CANCELLED_BY_YOU',
    //   title: 'Reservation Cancelled',
    //   message: `Reservation for ${reservation.serviceName} has been cancelled`,
    //   data: { reservationId: reservation._id }
    // });
    
    // await userNotification.save();
    // await prestataireNotification.save();
    
    // io.emit('reservationDeleted', reservation);
    // io.emit('newNotification', { recipient: userNotification.recipient, notification: userNotification });
    // io.emit('newNotification', { recipient: prestataireNotification.recipient, notification: prestataireNotification });
    
    res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(403).json({ error: 'User role not found in token' });
    }

    if (reservation.status !== 'en attente') {
      return res.status(400).json({ error: 'Only pending reservations can be cancelled' });
    }

    reservation.status = 'annulé';
    await reservation.save();

    const userNotification = new Notification({
      
      recipient: reservation.userId,
      recipientType: 'User',
      type: 'RESERVATION_CANCELLED',
      title: 'Reservation Cancelled',
      message: `Your reservation for ${reservation.serviceName} has been cancelled`,
      data: { reservationId: reservation._id }
    });
    console.log(userNotification); // Log the userNotification object to the termina

    const prestataireNotification = new Notification({
      recipient: reservation.prestataireId,
      recipientType: 'Prestataire',
      type: 'RESERVATION_CANCELLED',
      title: 'Reservation Cancelled',
      message: `Reservation for ${reservation.serviceName} has been cancelled`,
      data: { reservationId: reservation._id }
    });
    console.log(prestataireNotification); // Log the prestataireNotification object to the terminal

    await userNotification.save();
    await prestataireNotification.save();

    // io.emit('reservationCancled', reservation);
    emitNotification(userNotification.recipient, userNotification);
    emitNotification(prestataireNotification.recipient, prestataireNotification);

    res.status(200).json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get reservations by payment status
exports.getReservationsByPaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    const userId = req.user.id;
    
    let query = { userId };
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    const reservations = await Reservation.find(query).sort({ createdAt: -1 });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};