const Chat = require('../models/chat');


exports.createChat = async (req, res) => {
  try {
    const { participants } = req.body;
    const chat = new Chat({ participants });
    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.addMessage = async (req, res) => {
  try {
    const { chatId, sender, content } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    chat.messages.push({ sender, content });
    await chat.save();
    res.status(200).json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};