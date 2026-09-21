const express = require('express');
const router = express.Router();
const {
  streamChat,
  getConversations,
  getConversation,
  deleteConversation,
} = require('../controllers/chatController');

// Chat streaming endpoint
router.post('/chat/stream', streamChat);

// Conversation management
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

module.exports = router;
