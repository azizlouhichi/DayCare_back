
  const Notification = require('../models/notification');
  const io = require('../index').io;

  
  exports.createNotification = async (req, res) => {
    try {
      const { recipient, recipientType, sender, senderType, type, title, message, data, priority } = req.body;

      // Validate required fields
      if (!recipient) {
        return res.status(400).json({ error: 'Recipient is required' });
      }

      const notification = new Notification({
        recipient,
        recipientType,
        sender,
        senderType,
        type,
        title,
        message,
        data,
        priority
      });

      await notification.save();
      
      // Emit notification to specific user's room
      io.to(`user_${notification.recipient}`).emit('newNotification', notification);
      
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  
  exports.getNotifications = async (req, res) => {
    try {
      const { recipientId } = req.query;
      const notifications = await Notification.find({ recipient: recipientId }).sort({ createdAt: -1 });
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  
  exports.markAsRead = async (req, res) => {
    try {
      const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
      res.status(200).json(notification);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  
  exports.markAllAsRead = async (req, res) => {
    try {
      const { recipientId, recipientType } = req.body;
      
      if (!recipientId || !recipientType) {
        return res.status(400).json({ error: 'Recipient ID and type are required' });
      }
      
      const result = await Notification.updateMany(
        { recipient: recipientId, recipientType: recipientType, read: false },
        { read: true }
      );
      
      res.status(200).json({ message: `${result.modifiedCount} notifications marked as read` });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  
  exports.getPrestataireNotifications = async (req, res) => {
    try {
      // Assuming req.user.id contains the prestataire's ID when authenticated
      const prestataireId = req.user.id;
      
      const notifications = await Notification.find({
        recipient: prestataireId,
        recipientType: 'Prestataire'
      }).sort({ createdAt: -1 });
      
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
