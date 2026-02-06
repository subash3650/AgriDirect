const express = require('express');
const { protect } = require('../middleware/auth');
const conversationController = require('../controllers/conversation.controller');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', conversationController.getConversations);
router.get('/unread', conversationController.getUnreadCount);
router.post('/', conversationController.createConversation);
router.get('/:id', conversationController.getConversation);
router.post('/:id/messages', conversationController.sendMessage);
router.put('/:id/read', conversationController.markAsRead);
router.delete('/:id', conversationController.deleteConversation);

module.exports = router;
