const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { specs, swaggerUi } = require('./swagger');
const { initializeSocket } = require('./services/io'); 
const Stripe = require('stripe');
const Subscription = require('./models/subscription'); 
const Prestataire = require('./models/prestataire');
const Facture = require('./models/facture');
const Reservation = require('./models/reservation');
const Notification = require('./models/notification');

dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(helmet());

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/prestataire/login', authLimiter);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP server
const server = http.createServer(app);

// Initialize Socket.IO - This must be done first
initializeSocket(server);

// Now that the socket is initialized, you can safely use getIO
const io = require('./services/io').getIO(); // Get io instance from the service
const emitNotification = (recipientId, notification) => {
  io.to(`user_${recipientId}`).emit('newNotification', notification);
};
// Verify token on socket connection (optional — allows unauthenticated connections for visitors)
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      socket.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      // Token invalid — socket connects but cannot join user rooms
    }
  }
  next();
});

io.on('connection', (socket) => {
  console.log('New client connected: ', socket.id);

  socket.on('joinRoom', (userId) => {
    if (!socket.user) {
      socket.emit('error', { message: 'Authentication required to join a room' });
      return;
    }
    const tokenUserId = (socket.user.userId || socket.user.prestataireId || socket.user.adminId)?.toString();
    if (tokenUserId !== userId?.toString()) {
      socket.emit('error', { message: 'Cannot join another user\'s room' });
      return;
    }
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
  });
});


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));


app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


// Routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const prestataireRoutes = require('./routes/prestataireRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const factureRoutes = require('./routes/factureRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const stripeWebhook = require('./routes/stripeWebhook');
const recommendationRoute = require("./routes/recommendation");
const notificationRoutes = require('./routes/notificationRoutes'); 

app.use('/api/admin', adminRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/prestataire', prestataireRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/stripeWebhook', stripeWebhook);
app.use('/api/notifications', notificationRoutes); // Add this line


app.get('/stripe-redirect/success', async (req, res) => {
  try {
    const { session_id, type, invoiceId, prestataireId } = req.query;
    
    console.log('🎉 Success redirect received:', { session_id, type, invoiceId, prestataireId });

   
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      // Handle invoice payments
      if (type === 'invoice' && invoiceId) {
        // Update invoice status
        const facture = await Facture.findByIdAndUpdate(
          invoiceId,
          {
            status: 'payée',
            datePaiement: new Date(),
            dateModification: new Date(),
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent
          },
          { new: true }
        );

        if (facture) {
          // Update the reservation payment status
          await Reservation.findByIdAndUpdate(
            facture.reservationId,
            { paymentStatus: 'payé' },
            { new: true }
          );

          // Create notifications with correct fields
          const userNotification = new Notification({
            recipient: facture.userId,
            recipientType: 'User',
            title: 'Payment Successful',
            message: `Your invoice #${facture.numeroFacture} has been paid successfully`,
            type: 'PAYMENT_RECEIVED',
            relatedId: facture._id
          });
          await userNotification.save();
          emitNotification(userNotification.recipient, userNotification);
          console.log("userNotification", userNotification);

          const prestataireNotification = new Notification({
            recipient: facture.prestataireId,
            recipientType: 'Prestataire',
            title: 'Payment Received',
            message: `Invoice #${facture.numeroFacture} has been paid by the client`,
            type: 'PAYMENT_RECEIVED',
            relatedId: facture._id
          });
          await prestataireNotification.save();
          emitNotification(prestataireNotification.recipient, prestataireNotification);
          console.log("prestataireNotification", prestataireNotification);
        }
      }

      // Handle subscription payments
      if (type !== 'invoice' && prestataireId) {
        const prices = { monthly: 50, '6months': 250, yearly: 480 };
        const amount = prices[type];

        const startDate = new Date();
        let endDate = new Date(startDate);
        if (type === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
        if (type === '6months') endDate.setMonth(endDate.getMonth() + 6);
        if (type === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

        // Update prestataire
        await Prestataire.findByIdAndUpdate(
          prestataireId,
          {
            subscriptionType: type,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            subscriptionStatus: 'active',
          },
          { new: true }
        );

        // Create subscription record
        const subscription = new Subscription({
          prestataireId,
          type,
          amount,
          paymentDate: startDate,
          startDate,
          endDate,
          status: 'active',
          paymentMethod: 'card',
          transactionId: session.payment_intent || session.id,
        });

        await subscription.save();
      }
    }
    
    
    res.status(200).send({
      success: true,
      
    });
  } catch (error) {
    console.error('❌ Error in success redirect:', error);
    res.status(500).send({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
});



// Add a simple payment-success endpoint for direct API access
app.get('/payment-success', (req, res) => {
  res.status(200).send({
    success: true,
    message: 'Payment successful'
  });
});
// app.get('/stripe-redirect/success', async (req, res) => {
//   try {
//     const { session_id, type, invoiceId } = req.query;
    
//     console.log('🎉 Success redirect received:', { session_id, type, invoiceId });

//     // Retrieve the session from Stripe to verify it's completed
//     const session = await stripe.checkout.sessions.retrieve(session_id);
    
//     if (session.payment_status === 'paid') {
//       if (type === 'invoice' && invoiceId) {
//         // Update invoice status
//         const facture = await Facture.findByIdAndUpdate(
//           invoiceId,
//           {
//             status: 'payée',
//             datePaiement: new Date(),
//             dateModification: new Date(),
//             stripeSessionId: session.id,
//             stripePaymentIntentId: session.payment_intent
//           },
//           { new: true }
//         );

//         if (facture) {
//           // Update the reservation payment status
//           await Reservation.findByIdAndUpdate(
//             facture.reservationId,
//             { paymentStatus: 'payé' },
//             { new: true }
//           );

//           // Create notifications
//           const userNotification = new Notification({
//             recipient: facture.userId,
//             message: `Your invoice #${facture.numeroFacture} has been paid successfully`,
//             type: 'payment',
//             relatedId: facture._id
//           });
//           await userNotification.save();
//           emitNotification(userNotification.recipient, userNotification);
//            Console.log("userNotification",userNotification) 
//           const prestataireNotification = new Notification({
//             recipient: facture.prestataireId,
//             message: `Invoice #${facture.numeroFacture} has been paid by the client`,
//             type: 'payment',
//             relatedId: facture._id
//           });
//           await prestataireNotification.save();
//           emitNotification(prestataireNotification.recipient, userNotification);
//           console.log("prestataireNotification",prestataireNotification)
//           return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
//         }
//       }

//       // Handle subscription payments
//       if (type && type !== 'invoice' && req.query.prestataireId) {
//         const prices = { monthly: 50, '6months': 250, yearly: 480 };
//         const amount = prices[type];

//         const startDate = new Date();
//         let endDate = new Date(startDate);
//         if (type === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
//         if (type === '6months') endDate.setMonth(endDate.getMonth() + 6);
//         if (type === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

//         // Update prestataire
//         await Prestataire.findByIdAndUpdate(
//           prestataireId,
//           {
//             subscriptionType: type,
//             subscriptionStartDate: startDate,
//             subscriptionEndDate: endDate,
//             subscriptionStatus: 'active',
//           },
//           { new: true }
//         );

//         // Create subscription record
//         const subscription = new Subscription({
//           prestataireId,
//           type,
//           amount,
//           paymentDate: startDate,
//           startDate,
//           endDate,
//           status: 'active',
//           paymentMethod: 'card',
//           transactionId: session.payment_intent || session.id,
//         });

//         await subscription.save();

//         return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
//       }
//     }

//     res.redirect(`${process.env.FRONTEND_URL}/payment-error`);
//   } catch (error) {
//     console.error('❌ Error processing payment success:', error);
//     res.redirect(`${process.env.FRONTEND_URL}/payment-error`);
//   }
// });
// ✅ Stripe Checkout cancel redirect handler
// Stripe Checkout success redirect (serves redirect.html for deep linking)
// app.get('/stripe-redirect/success', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
// });
app.use("/api/recommendation", recommendationRoute);


// Seeder categories
const seedDefaultCategories = require('./seeders/defaultCategories');
seedDefaultCategories().then(() => {
  const PORT = process.env.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
