const express = require('express');
const { protect } = require('../middleware/auth');
const {
    getConversations,
    getConversation,
    createConversation,
    sendMessage,
    markAsRead,
    getUnreadCount,
    deleteConversation
} = require('../controllers/conversation.controller');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Conversation routes
router.get('/', getConversations);
router.get('/unread', getUnreadCount);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.post('/:id/messages', sendMessage);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteConversation);

module.exports = router;
