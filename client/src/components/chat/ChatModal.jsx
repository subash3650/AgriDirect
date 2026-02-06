import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import './Chat.css';

const ChatModal = ({ recipientId, recipientType, recipientName, conversationId: existingConvId, onClose }) => {
    const { socket, isConnected, refreshCounts } = useSocket();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState(existingConvId || null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize conversation or load existing one
    useEffect(() => {
        const initConversation = async () => {
            try {
                const token = localStorage.getItem('token');

                if (existingConvId) {
                    // Load existing conversation
                    const response = await fetch(`/api/conversations/${existingConvId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        setMessages(data.messages);
                        setConversationId(existingConvId);
                        refreshCounts(); // Refresh unread count
                    }
                } else {
                    // Create or get existing conversation with recipient
                    const response = await fetch('/api/conversations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            recipientId,
                            recipientType
                        })
                    });
                    const data = await response.json();
                    if (data.success) {
                        setConversationId(data.conversation._id);
                        // If existing conversation, load messages
                        if (data.existing) {
                            const msgResponse = await fetch(`/api/conversations/${data.conversation._id}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const msgData = await msgResponse.json();
                            if (msgData.success) {
                                setMessages(msgData.messages);
                                refreshCounts(); // Refresh unread count
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to initialize conversation:', err);
            } finally {
                setLoading(false);
            }
        };

        initConversation();
    }, [recipientId, recipientType, existingConvId]);

    // Join conversation room when conversationId is set
    useEffect(() => {
        if (socket && conversationId) {
            socket.emit('join_conversation', conversationId);

            return () => {
                socket.emit('leave_conversation', conversationId);
            };
        }
    }, [socket, conversationId]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data) => {
            if (data.message.conversationId === conversationId) {
                // Avoid duplicate messages
                setMessages(prev => {
                    const exists = prev.some(m => m._id === data.message._id);
                    if (exists) return prev;
                    return [...prev, data.message];
                });
            }
        };

        const handleTyping = (data) => {
            if (data.conversationId === conversationId && data.userId !== localStorage.getItem('userId')) {
                setIsTyping(data.isTyping);
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleTyping);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleTyping);
        };
    }, [socket, conversationId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversationId) return;

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text: newMessage })
            });

            const data = await response.json();
            if (data.success) {
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleTypingChange = (e) => {
        setNewMessage(e.target.value);

        // Emit typing event
        if (socket && conversationId) {
            socket.emit('typing', { conversationId, isTyping: true });

            // Clear previous timeout
            if (typingTimeout) clearTimeout(typingTimeout);

            // Set new timeout to stop typing
            const timeout = setTimeout(() => {
                socket.emit('typing', { conversationId, isTyping: false });
            }, 1000);

            setTypingTimeout(timeout);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get current user ID from stored user object
    const storedUser = localStorage.getItem('user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const currentUserId = currentUser?._id || currentUser?.id || '';

    // Check if message is from current user
    const isMyMessage = (msg) => {
        const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString() || '';
        return senderId === currentUserId;
    };

    return (
        <div className="chat-modal-overlay" onClick={(e) => e.target.className === 'chat-modal-overlay' && onClose()}>
            <div className="chat-modal">
                {/* Header */}
                <div className="chat-header">
                    <div className="chat-header-info">
                        <span className="chat-avatar">
                            {recipientType === 'farmer' ? '🧑‍🌾' : '👤'}
                        </span>
                        <div>
                            <h3>{recipientName}</h3>
                            <span className="chat-status">
                                {isConnected ? (isTyping ? 'Typing...' : '🟢 Online') : '⚪ Offline'}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="chat-close-btn">✕</button>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {loading ? (
                        <div className="chat-loading">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="chat-empty">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div
                                key={msg._id || index}
                                className={`chat-message ${isMyMessage(msg) ? 'sent' : 'received'}`}
                            >
                                <div className="message-bubble">
                                    <p>{msg.text}</p>
                                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                                </div>
                            </div>
                        ))
                    )}
                    {isTyping && (
                        <div className="chat-message received">
                            <div className="message-bubble typing">
                                <span className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="chat-input-form">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTypingChange}
                        placeholder="Type a message..."
                        className="chat-input"
                        disabled={loading || !conversationId}
                    />
                    <button
                        type="submit"
                        className="chat-send-btn"
                        disabled={sending || !newMessage.trim() || !conversationId}
                    >
                        {sending ? '...' : '➤'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatModal;
