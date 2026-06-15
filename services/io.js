

const socketIO    = require('socket.io');
const Chat        = require('../models/chat');        
const User        = require('../models/user');
const Prestataire = require('../models/prestataire');

let io;
const userSocketMap = new Map();   

async function getParticipantInfo(id) {
  // Try User first, then Prestataire
  let doc = await User.findById(id).lean();
  if (!doc) doc = await Prestataire.findById(id).lean();
  if (!doc) return null;

  return {
    id:       doc._id.toString(),
    name:     `${doc.prenom ?? ''} ${doc.nom ?? ''}`.trim(),
    photo:    doc.photoProfil || null,
    email:    doc.email       || null,
    verified: !!doc.isVerified
  };
}

function initializeSocket(server) {
  if (io) return;                   

  io = socketIO(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('✅  New socket connected:', socket.id);

    socket.on('error', err => {
      console.error(`Socket ${socket.id} error:`, err);
    });

    socket.on('joinRoom', (userId) => {
      socket.join(`user_${userId}`);
      userSocketMap.set(userId, socket.id);
      console.log(`Socket ${socket.id} joined user_${userId}`);
    });

    socket.on('joinChat', async ({ userId, prestataireId }) => {
      try {
    
        const [uInfo, pInfo] = await Promise.all([
          getParticipantInfo(userId),
          getParticipantInfo(prestataireId)
        ]);

        if (!uInfo || !pInfo) {
          socket.emit('chatError', { msg: 'Compte introuvable.' });
          return;
        }
        if (!uInfo.verified || !pInfo.verified) {
          socket.emit('chatError', { msg: 'Compte non vérifié.' });
          return;
        }

        const roomName = `chat_${[uInfo.id, pInfo.id].sort().join('_')}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined ${roomName}`);

        let chat = await Chat.findOne({
          participants: { $all: [uInfo.id, pInfo.id] }
        });

        if (!chat) {
          chat = new Chat({ participants: [uInfo.id, pInfo.id], messages: [] });
          await chat.save();
        }

        await Promise.all([
          User.updateOne(
            { _id: uInfo.id }, { $addToSet: { chats: chat._id } }
          ).exec(),
          Prestataire.updateOne(
            { _id: pInfo.id }, { $addToSet: { chats: chat._id } }
          ).exec()
        ]);

        socket.emit('chatJoined', { roomName, chatId: chat._id });
      } catch (err) {
        console.error('joinChat error:', err);
        socket.emit('chatError', { msg: 'Erreur serveur.' });
      }
    });

    socket.on('sendMessage', async ({ senderId, receiverId, message }) => {
      try {
        const [senderInfo, receiverInfo] = await Promise.all([
          getParticipantInfo(senderId),
          getParticipantInfo(receiverId)
        ]);

        if (!senderInfo?.verified || !receiverInfo?.verified) {
          socket.emit('chatError', { msg: 'Accès refusé (non vérifié).' });
          return;
        }

        const roomName = `chat_${[senderId, receiverId].sort().join('_')}`;

        
        let chat = await Chat.findOne({
          participants: { $all: [senderId, receiverId] }
        });
        if (!chat) {
          chat = new Chat({ participants: [senderId, receiverId], messages: [] });
        }

        chat.messages.push({
          sender:   senderId,
          content:  message,
          readBy:   [senderId],        
          timestamp: new Date()
        });
        await chat.save();

        io.to(roomName).emit('receiveMessage', {
          chatId:     chat._id,
          messageId:  chat.messages.at(-1)._id,
          senderId,
          senderName:  senderInfo.name,
          senderPhoto: senderInfo.photo,
          senderEmail: senderInfo.email,
          content:     message,
          timestamp:   chat.messages.at(-1).timestamp
        });

        console.log(`🗨️  ${senderId} → ${receiverId}: "${message}"`);
      } catch (err) {
        console.error('sendMessage error:', err);
        socket.emit('chatError', { msg: 'Erreur lors de l’envoi.' });
      }
    });

    socket.on('userTyping',     ({ roomId, userId }) => socket.to(roomId).emit('userTyping',     { userId }) );
    socket.on('userStopTyping', ({ roomId, userId }) => socket.to(roomId).emit('userStopTyping', { userId }) );

    socket.on('messageRead', async ({ chatId, messageId, userId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const msg = chat.messages.id(messageId);
        if (msg && !msg.readBy.includes(userId)) {
          msg.readBy.push(userId);
          await chat.save();

          const roomName = `chat_${chat.participants.map(id => id.toString()).sort().join('_')}`;
          io.to(roomName).emit('messageRead', { messageId, userId });
        }
      } catch (e) {
        console.error('messageRead error:', e);
      }
    });

    socket.on('disconnect', () => {
      for (const [uid, sid] of userSocketMap.entries()) {
        if (sid === socket.id) {
          userSocketMap.delete(uid);
          console.log(`🔌  User ${uid} disconnected`);
          break;
        }
      }
    });
  });
}

function getIO() {
  if (!io) {
  
    console.warn('Socket.io not initialized yet, returning null');
    return null;
  }
  return io;
}

module.exports = { initializeSocket, getIO };
