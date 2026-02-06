import React, { useState, useRef, useEffect, useContext } from 'react';
import './AIChatAssistant.css';
import { FaRobot, FaMicrophone, FaPaperPlane, FaTimes, FaCamera, FaVolumeUp } from 'react-icons/fa';
import { BiMicrophoneOff } from 'react-icons/bi';
import { AuthContext } from '../../contexts/AuthContext';

const AI_SERVICE_URL = 'http://localhost:5008';

const AIChatAssistant = () => {
    const { user, token } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "வணக்கம்! 🙏 நான் AgriBot. உங்கள் பொருட்களை சேர்க்க குரல் மூலம் பேசுங்கள்.\n\nHello! I am AgriBot. Speak to add your products.",
            sender: 'bot'
        }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState('ta-IN'); // Default Tamil
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = false;
        recognition.lang = language;
        recognition.interimResults = false;
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Text-to-Speech function
    const speakResponse = (text) => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Detect language and set voice
            const isTamil = /[\u0B80-\u0BFF]/.test(text); // Tamil Unicode range
            utterance.lang = isTamil ? 'ta-IN' : 'en-IN';
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1;

            window.speechSynthesis.speak(utterance);
        }
    };

    const toggleChat = () => setIsOpen(!isOpen);

    const toggleLanguage = () => {
        const newLang = language === 'ta-IN' ? 'en-IN' : 'ta-IN';
        setLanguage(newLang);
        if (recognition) {
            recognition.lang = newLang;
        }
    };

    const startListening = () => {
        if (!recognition) {
            alert("Browser doesn't support speech recognition. Please type instead.");
            return;
        }
        setIsListening(true);
        recognition.lang = language;
        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
            // Auto-send after voice input
            handleSend(transcript);
        };

        recognition.onerror = (event) => {
            console.error("Speech error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSend = async (textToSend) => {
        const text = textToSend || input;
        if (!text.trim() && !selectedImage) return;

        // Add User Message with image preview if any
        const userMsg = {
            id: Date.now(),
            text: text || "📷 Photo uploaded",
            sender: 'user',
            image: imagePreview
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            let response;
            const headers = {};

            // Add auth token if logged in
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            if (selectedImage) {
                // Send with image
                const formData = new FormData();
                formData.append('message', text || 'Please identify this product');
                formData.append('language', language === 'ta-IN' ? 'ta' : 'en');
                formData.append('image', selectedImage);

                response = await fetch(`${AI_SERVICE_URL}/chat/image`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData
                });
            } else {
                // Send text only
                response = await fetch(`${AI_SERVICE_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        message: text,
                        language: language === 'ta-IN' ? 'ta' : 'en'
                    })
                });
            }

            const data = await response.json();

            // Clear image after sending
            removeImage();

            // Add Bot Message
            const botMsg = {
                id: Date.now() + 1,
                text: data.response || "Sorry, I couldn't understand that.",
                sender: 'bot',
                action: data.action
            };
            setMessages(prev => [...prev, botMsg]);

            // Speak the response aloud (TTS)
            speakResponse(data.response);

        } catch (error) {
            console.error("AI Error:", error);
            const errorText = "மன்னிக்கவும், சேவையகத்துடன் இணைப்பதில் சிக்கல். மீண்டும் முயற்சிக்கவும்.\n\nSorry, trouble connecting to server. Please try again.";
            const errorMsg = {
                id: Date.now() + 1,
                text: errorText,
                sender: 'bot'
            };
            setMessages(prev => [...prev, errorMsg]);
            speakResponse(errorText);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Only show for farmers who are logged in
    if (!user || user.role !== 'farmer') {
        return null;
    }

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button className="ai-fab" onClick={toggleChat} aria-label="Open AI Assistant">
                    <FaRobot className="ai-icon" />
                    <span className="ai-fab-pulse"></span>
                </button>
            )}

            {/* Chat Interface */}
            {isOpen && (
                <div className="ai-chat-container">
                    <div className="ai-header">
                        <div className="ai-title">
                            <h3>🤖 AgriBot</h3>
                            <div className="ai-subtitle">குரல் உதவியாளர் | Voice Assistant</div>
                        </div>
                        <div className="ai-header-actions">
                            <button
                                className={`lang-toggle ${language === 'ta-IN' ? 'tamil' : 'english'}`}
                                onClick={toggleLanguage}
                                title="Switch Language"
                            >
                                {language === 'ta-IN' ? 'தமிழ்' : 'EN'}
                            </button>
                            <button className="close-btn" onClick={toggleChat}>
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    <div className="ai-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.sender}`}>
                                {msg.image && (
                                    <img src={msg.image} alt="Uploaded" className="message-image" />
                                )}
                                <div className="message-text">{msg.text}</div>
                                {msg.sender === 'bot' && msg.action && (
                                    <div className={`action-badge ${msg.action}`}>
                                        {msg.action === 'product_created' && '✅ Product Added'}
                                        {msg.action === 'product_updated' && '✅ Product Updated'}
                                    </div>
                                )}
                                {msg.sender === 'bot' && (
                                    <button
                                        className="speak-btn"
                                        onClick={() => speakResponse(msg.text)}
                                        title="Listen"
                                    >
                                        <FaVolumeUp />
                                    </button>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message bot loading-message">
                                <div className="loading-animation">
                                    <div className="loading-dot"></div>
                                    <div className="loading-dot"></div>
                                    <div className="loading-dot"></div>
                                </div>
                                <span className="loading-text">Processing...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="image-preview-container">
                            <img src={imagePreview} alt="Preview" className="image-preview" />
                            <button className="remove-image-btn" onClick={removeImage}>
                                <FaTimes />
                            </button>
                        </div>
                    )}

                    <div className="ai-input-area">
                        {/* Image Upload Button */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="camera-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload Photo"
                            disabled={isLoading}
                        >
                            <FaCamera />
                        </button>

                        {/* Voice Button - Primary interaction for farmers */}
                        <button
                            className={`voice-btn ${isListening ? 'listening' : ''}`}
                            onClick={startListening}
                            title={language === 'ta-IN' ? 'தமிழில் பேசுங்கள்' : 'Speak in English'}
                            disabled={isLoading}
                        >
                            {isListening ? <BiMicrophoneOff /> : <FaMicrophone />}
                        </button>

                        <input
                            type="text"
                            className="text-input"
                            placeholder={language === 'ta-IN' ? 'பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்...' : 'Speak or type...'}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading || isListening}
                        />

                        <button
                            className="send-btn"
                            onClick={() => handleSend()}
                            disabled={isLoading || isListening || (!input.trim() && !selectedImage)}
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIChatAssistant;
