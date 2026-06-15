const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientType'
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['User', 'Prestataire','Admin']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderType'
  },
  senderType: {
    type: String,
    enum: ['User', 'Prestataire', 'System']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'RESERVATION_CONFIRMED',
      'RESERVATION_CANCELLED',
      'RESERVATION_REMINDER',
      'PAYMENT_RECEIVED',
      'RATING_RECEIVED',
      'NEW_MESSAGE',
      'SERVICE_COMPLETED',
      'SYSTEM_ANNOUNCEMENT',
      'NEW_RESERVATION',
      'RESERVATION_CONFIRMED_BY_PRESTATAIRE',
      'RESERVATION_CREATED',
      'RESERVATION_CONFIRMED_BY_YOU',
      'RESERVATION_CANCELLED_BY_YOU',
      'SERVICE_COMPLETED_BY_YOU',
      'ACCOUNT_STATUS_CHANGED',
      'INVOICE_PREPARED',
      'SYSTEM'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;