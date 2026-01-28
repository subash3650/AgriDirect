import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import './Buyer.css';

const BuyerMessages = () => {
    const { socket, isConnected } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/conversations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setConversations(data.conversations);
                    if (data.conversations.length > 0 && !activeConversation) {
                        setActiveConversation(data.conversations[0]);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch conversations:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    useEffect(() => {
        if (!activeConversation) return;

        const fetchMessages = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/conversations/${activeConversation._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setMessages(data.messages);
                    fetch(`/api/conversations/${activeConversation._id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            }
        };

        fetchMessages();

        if (socket) {
            socket.emit('join_conversation', activeConversation._id);
        }

        return () => {
            if (socket) {
                socket.emit('leave_conversation', activeConversation._id);
            }
        };
    }, [activeConversation, socket]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data) => {
            if (activeConversation && data.message.conversationId === activeConversation._id) {
                setMessages(prev => [...prev, data.message]);
            }
            setConversations(prev => prev.map(conv => {
                if (conv._id === data.conversation._id) {
                    return { ...conv, lastMessage: data.conversation.lastMessage };
                }
                return conv;
            }));
        };

        const handleTyping = (data) => {
            if (activeConversation && data.conversationId === activeConversation._id) {
                setIsTyping(data.isTyping);
                setTypingUser(data.userName);
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleTyping);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleTyping);
        };
    }, [socket, activeConversation]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/conversations/${activeConversation._id}/messages`, {
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
                setConversations(prev => prev.map(conv => {
                    if (conv._id === activeConversation._id) {
                        return {
                            ...conv,
                            lastMessage: {
                                text: newMessage,
                                senderId: data.message.senderId,
                                timestamp: data.message.createdAt
                            }
                        };
                    }
                    return conv;
                }));
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleTypingChange = (e) => {
        setNewMessage(e.target.value);
        if (socket && activeConversation) {
            socket.emit('typing', { conversationId: activeConversation._id, isTyping: true });
            setTimeout(() => {
                socket.emit('typing', { conversationId: activeConversation._id, isTyping: false });
            }, 1000);
        }
    };

    const getOtherParticipant = (conversation) => {
        // Get user ID from stored user object
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const myId = currentUser?._id || currentUser?.id || '';

        // Find the participant that is NOT the current user
        return conversation.participants?.find(p => {
            const participantId = p.userId?._id?.toString() || p.userId?.toString() || '';
            return participantId !== myId;
        }) || {};
    };

    const handleDeleteConversation = async (convId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this conversation?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/conversations/${convId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setConversations(prev => prev.filter(c => c._id !== convId));
                if (activeConversation?._id === convId) {
                    setActiveConversation(null);
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;

        if (diff < 86400000) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
            return d.toLocaleDateString([], { weekday: 'short' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Get current user ID for message alignment
    const storedUserData = localStorage.getItem('user');
    const currentUserObj = storedUserData ? JSON.parse(storedUserData) : null;
    const currentUserId = currentUserObj?._id || currentUserObj?.id || '';

    const isMyMessage = (msg) => {
        const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString() || '';
        return senderId === currentUserId;
    };

    if (loading) {
        return (
            <div className="messages-page">
                <div className="container">
                    <div className="loading-state">Loading messages...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="messages-page">
            <div className="container">
                <h1 className="page-title">💬 Messages</h1>

                <div className="messages-layout">
                    <div className="conversations-sidebar">
                        <div className="sidebar-header">
                            <h3>Conversations</h3>
                            <span className="connection-status">
                                {isConnected ? '🟢 Online' : '⚪ Offline'}
                            </span>
                        </div>

                        {conversations.length === 0 ? (
                            <div className="empty-conversations">
                                <p>No messages yet</p>
                                <span>Start a conversation with a farmer!</span>
                            </div>
                        ) : (
                            <div className="conversation-list">
                                {conversations.map(conv => {
                                    const other = getOtherParticipant(conv);
                                    const isActive = activeConversation?._id === conv._id;

                                    return (
                                        <div
                                            key={conv._id}
                                            className={`conversation-item ${isActive ? 'active' : ''}`}
                                            onClick={() => setActiveConversation(conv)}
                                        >
                                            <div className="conv-avatar">
                                                {other.userType === 'farmer' ? '🧑‍🌾' : '👤'}
                                            </div>
                                            <div className="conv-info">
                                                <div className="conv-header">
                                                    <span className="conv-name">{other.name || 'Unknown'}</span>
                                                    <span className="conv-time">
                                                        {formatTime(conv.lastMessage?.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="conv-preview">
                                                    <span className="conv-last-message">
                                                        {conv.lastMessage?.text?.substring(0, 40) || 'No messages'}
                                                        {conv.lastMessage?.text?.length > 40 ? '...' : ''}
                                                    </span>
                                                </div>
                                                {conv.productContext?.productName && (
                                                    <span className="conv-product">
                                                        📦 {conv.productContext.productName}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                className="conv-delete-btn"
                                                onClick={(e) => handleDeleteConversation(conv._id, e)}
                                                title="Delete conversation"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="chat-window">
                        {!activeConversation ? (
                            <div className="empty-chat">
                                <div className="empty-chat-icon">💬</div>
                                <h3>Select a conversation</h3>
                                <p>Choose a conversation from the list to start messaging</p>
                            </div>
                        ) : (
                            <>
                                <div className="chat-header-bar">
                                    <div className="chat-user-info">
                                        <span className="chat-user-avatar">
                                            {getOtherParticipant(activeConversation).userType === 'farmer' ? '🧑‍🌾' : '👤'}
                                        </span>
                                        <div>
                                            <h4>{getOtherParticipant(activeConversation).name}</h4>
                                            <span className="chat-user-type">
                                                {getOtherParticipant(activeConversation).userType === 'farmer' ? 'Farmer' : 'Buyer'}
                                            </span>
                                        </div>
                                    </div>
                                    {activeConversation.productContext?.productName && (
                                        <div className="chat-product-context">
                                            📦 Discussing: {activeConversation.productContext.productName}
                                        </div>
                                    )}
                                </div>

                                <div className="chat-messages-area">
                                    {messages.length === 0 ? (
                                        <div className="empty-messages">
                                            <p>No messages in this conversation yet.</p>
                                            <span>Start the conversation!</span>
                                        </div>
                                    ) : (
                                        messages.map((msg, index) => (
                                            <div
                                                key={msg._id || index}
                                                className={`message-bubble-wrapper ${isMyMessage(msg) ? 'sent' : 'received'}`}
                                            >
                                                <div className="message-bubble-content">
                                                    <p>{msg.text}</p>
                                                    <span className="message-timestamp">
                                                        {formatTime(msg.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {isTyping && (
                                        <div className="typing-indicator-bar">
                                            <span>{typingUser || 'Someone'} is typing...</span>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="chat-input-bar">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={handleTypingChange}
                                        placeholder="Type your message..."
                                        className="message-input"
                                    />
                                    <button
                                        type="submit"
                                        className="send-button"
                                        disabled={sending || !newMessage.trim()}
                                    >
                                        {sending ? '...' : '➤'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyerMessages;
