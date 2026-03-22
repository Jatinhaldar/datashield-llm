import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, Shield, AlertTriangle, Lock, Sparkles, 
  Paperclip, Mic, Square, File as FileIcon, X 
} from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ----- Text / Document Send Handler -----
  const handleSend = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    const userText = inputValue.trim();
    const currentFile = selectedFile;
    
    setInputValue('');
    clearFile();
    setError(null);
    setIsLoading(true);

    // Add user message to history
    let displayContent = userText;
    if (currentFile) {
      displayContent = `[Attached File: ${currentFile.name}] ${userText}`;
    }

    const newUserMsg = { role: 'user', content: displayContent };
    setMessages((prev) => [...prev, newUserMsg]);

    try {
      let apiResponse;

      if (currentFile) {
        // Use /upload endpoint
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('prompt', userText || "Please analyze this uploaded document.");
        formData.append('ocr_lang', 'eng');

        apiResponse = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Use /chat endpoint
        apiResponse = await axios.post('/chat', {
          user_input: userText
        });
      }

      const { masked, response } = apiResponse.data;
      
      const newAiMsg = {
        role: 'ai',
        content: response || 'No response',
        maskedQuery: masked
      };

      setMessages((prev) => [...prev, newAiMsg]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to securely connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Voice Recording Handlers -----
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        await sendVoice(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoice = async (audioBlob) => {
    setIsLoading(true);
    
    // UI Feedback for user voice chunk
    setMessages((prev) => [...prev, { role: 'user', content: '🎤 [Voice Action Recorded]' }]);

    try {
      const formData = new FormData();
      // Fastapi file upload expects a filename and mimetype
      const audioFile = new File([audioBlob], "voice_record.wav", { type: "audio/wav" });
      formData.append('file', audioFile);

      const apiResponse = await axios.post('/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { masked, response, original } = apiResponse.data;
      
      const newAiMsg = {
        role: 'ai',
        content: response || 'No response',
        maskedQuery: masked
      };

      // optionally we can update the user message with the transcribed text if needed,
      // but showing masked is enough for now.
      
      setMessages((prev) => [...prev, newAiMsg]);
    } catch (err) {
      console.error('Error sending voice:', err);
      setError('Failed to securely process voice data.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      <div className="app-container glass-panel">
        <header className="header">
          <div className="header-icon-wrapper">
            <Shield size={28} className="shield-icon" />
            <Sparkles size={14} className="sparkle-icon" />
          </div>
          <div className="header-text">
            <h1>SecureAI Shield</h1>
            <p>Enterprise-grade PII detection & masking</p>
          </div>
          <div className="header-status">
            <span className="status-dot"></span> Secure Connection
          </div>
        </header>

        <div className="chat-area" ref={scrollAreaRef}>
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Lock size={48} />
              </div>
              <h2>Zero Trust Chat Interface</h2>
              <p>Type any message, attach a document, or record your voice. Our system will intercept, mask, and securely process it before it reaches the AI.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role} fade-in-up`}>
              <div className="message-bubble">
                {msg.content}
              </div>
              
              {msg.role === 'ai' && msg.maskedQuery && msg.maskedQuery !== messages[idx - 1]?.content && (
                <div className="masked-container glass-card" title="This is what the AI actually received">
                  <div className="masked-label">
                    <AlertTriangle size={14} /> Sanitized Payload Sent to AI
                  </div>
                  <div className="masked-text">
                    {msg.maskedQuery}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="message-wrapper ai fade-in-up">
              <div className="message-bubble typing-bubble">
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message glass-card error-card">
              <AlertTriangle size={18} /> {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {selectedFile && (
            <div className="attachment-indicator fade-in-up">
              <FileIcon size={14} />
              <span>{selectedFile.name}</span>
              <button className="clear-attachment" onClick={clearFile} disabled={isLoading}>
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className={`input-form-wrapper glass-card ${isRecording ? 'recording-active' : ''}`}>
            
            <button 
              className="action-button attach-btn" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isRecording}
              title="Attach Document"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect} 
            />

            <textarea
              className="chat-input"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Recording audio... Listening..." : "Enter your query or attach a file..."}
              rows={1}
              disabled={isLoading || isRecording}
            />
            
            {Array.from(inputValue).length === 0 && !selectedFile ? (
              <button 
                className={`action-button mic-btn ${isRecording ? 'is-recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                title={isRecording ? "Stop Recording" : "Record Voice"}
              >
                {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
              </button>
            ) : (
              <button 
                className="send-button"
                onClick={handleSend}
                disabled={isLoading}
                title="Secure Send"
              >
                <Send size={18} />
              </button>
            )}
          </div>
          <div className="input-footer">
            <Lock size={12} /> End-to-end encrypted and PII sanitized
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
