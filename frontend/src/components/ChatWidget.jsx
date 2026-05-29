import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/chat`;

const TRANSLATIONS = {
  en: {
    title: "Pharma Premium",
    greeting: "Hi there",
    subtext: "How can we help?",
    send: "Send us a message",
    messages: "Messages",
    home: "Home",
    noActive: "No active conversations yet.",
    history: "History",
    maximize: "Maximize",
    minimize: "Minimize",
    close: "Close",
    voiceActive: "Listening...",
    voiceError: "Voice recognition error",
    greet: "Say Hello",
    bye: "Say Goodbye",
    botHello: "Hello! How can I assist you today?",
    botBye: "Goodbye! Have a great day!",
    placeholder: "Type your message...",
    sendBtn: "Send",
    botThanks: "Thank you for reaching out! One of our experts will get back to you shortly."
  },
  de: {
    title: "Pharma Premium",
    greeting: "Hallo",
    subtext: "Wie können wir helfen?",
    send: "Schreib uns eine Nachricht",
    messages: "Nachrichten",
    home: "Start",
    noActive: "Noch keine aktiven Gespräche.",
    history: "Verlauf",
    maximize: "Vergrößern",
    minimize: "Verkleinern",
    close: "Schließen",
    voiceActive: "Zuhören...",
    voiceError: "Spracherkennungsfehler",
    greet: "Hallo sagen",
    bye: "Tschüss sagen",
    botHello: "Hallo! Wie kann ich Ihnen heute helfen?",
    botBye: "Auf Wiedersehen! Einen schönen Tag noch!",
    placeholder: "Schreibe eine Nachricht...",
    sendBtn: "Senden",
    botThanks: "Vielen Dank für Ihre Nachricht! Einer unserer Experten wird sich in Kürze bei Ihnen melden."
  }
};

export default function ChatWidget() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [language, setLanguage] = useState(() => localStorage.getItem("chat_lang") || "en");
  const [isRecording, setIsRecording] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const t = TRANSLATIONS[language];

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const fetchSessions = async () => {
    if (!user) return;
    try {
      const resp = await fetch(`${API_BASE}/sessions/${user.id}`, { headers: authHeaders() });
      if (!resp.ok) return;
      const data = await resp.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const createNewSession = async (title = "New Chat") => {
    if (!user) return;
    try {
      const resp = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ user_id: user.id, title })
      });
      const data = await resp.json();
      setSessions(prev => [data, ...prev]);
      setCurrentSessionId(data.id);
      setMessages([]);
      setActiveTab("messages");
      return data;
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const fetchSessionMessages = async (sid) => {
    try {
      const resp = await fetch(`${API_BASE}/session/${sid}/messages`, { headers: authHeaders() });
      if (!resp.ok) return;
      const data = await resp.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => { if (isOpen) fetchSessions(); }, [isOpen, user]);
  useEffect(() => { if (currentSessionId) fetchSessionMessages(currentSessionId); }, [currentSessionId]);
  useEffect(() => { if (user && isOpen && sessions.length === 0 && !currentSessionId) createNewSession(); }, [user, isOpen, sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, activeTab]);
  useEffect(() => { localStorage.setItem("chat_lang", language); }, [language]);

  const [isMaximized, setIsMaximized] = useState(() => localStorage.getItem("chat_maximized") === "true");
  useEffect(() => { localStorage.setItem("chat_maximized", isMaximized); }, [isMaximized]);

  const toggleWidget = () => setIsOpen(!isOpen);
  const toggleSize = () => setIsMaximized(!isMaximized);
  const toggleLanguage = () => setLanguage(lang => lang === "en" ? "de" : "en");

  const handleSendMessage = async (e, forcedText = null) => {
    if (e) e.preventDefault();
    const textToSend = forcedText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, content: textToSend, role: "user", timestamp: "Just now" }]);
    setInputValue("");
    setIsLoading(true);
    setActiveTab("messages");

    let sid = currentSessionId;
    if (!sid) {
      const newSess = await createNewSession(textToSend.substring(0, 30) + "...");
      sid = newSess?.id;
    }

    try {
      const resp = await fetch(`${API_BASE}/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          user_id: user?.id,
          session_id: sid,
          message: textToSend,
          language: language
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.detail || "Failed to get response");
      }

      const data = await resp.json();
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.user_msg_id } : m));
      setMessages(prev => [...prev, {
        id: data.bot_msg_id,
        content: data.response,
        role: "assistant",
        timestamp: "Just now",
        suggestions: data.suggestions || []
      }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: `Error: ${err.message}`,
        role: "assistant",
        timestamp: "System"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (id) => {
    try {
      await fetch(`${API_BASE}/session/${id}`, { method: "DELETE", headers: authHeaders() });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) { setCurrentSessionId(null); setMessages([]); }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Speech recognition is not supported in this browser."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "en" ? "en-US" : "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event) => handleSendMessage(null, event.results[0][0].transcript);
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="chat-widget-container">
      <button className={`chat-fab ${isOpen ? "fab-hidden" : ""}`} onClick={toggleWidget} title="Open Chat">
        <div className="chat-fab-icon">💬</div>
      </button>

      <div className={`chat-modal ${isOpen ? "modal-open" : ""} ${isMaximized ? "maximized" : ""}`}>
        <header className="widget-header">
          <div className="header-info">
            <h3 className="brand-title">{t.title}</h3>
            <p className="brand-powered">powered by toolboxx</p>
          </div>
          <div className="header-actions">
            <button className="lang-toggle" onClick={toggleLanguage} title="Switch Language">{language.toUpperCase()}</button>
            <button className="icon-btn" onClick={toggleSize} title={isMaximized ? t.minimize : t.maximize}>
              {isMaximized ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              )}
            </button>
            <button className="icon-btn close-btn" onClick={toggleWidget} title={t.close}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </header>

        <div className="widget-body">
          {activeTab === "home" ? (
            <div className="home-view">
              <div className="greeting-section">
                <span className="waving-hand">👋</span>
                <h1 className="greeting-title">{t.greeting}</h1>
                <p className="greeting-sub">{t.subtext}</p>
              </div>
              <div className="suggestions-section">
                <button className="suggestion-chip" onClick={() => handleSendMessage(null, language === "de" ? "Wie nehme ich meine Medikamente richtig ein?" : "How do I take my medication correctly?")}>
                  <span>💊</span> {language === "de" ? "Medikamente richtig einnehmen" : "Medication guidance"}
                </button>
                <button className="suggestion-chip" onClick={() => handleSendMessage(null, language === "de" ? "Wie lagere ich meine Medikamente?" : "How should I store my medications?")}>
                  <span>🏥</span> {language === "de" ? "Lagerung von Medikamenten" : "Medication storage"}
                </button>
              </div>
              <div className="recent-chats-preview">
                <h4 className="section-title">{t.history}</h4>
                {sessions.slice(0, 3).map(s => (
                  <button key={s.id} className="sess-preview-card" onClick={() => { setCurrentSessionId(s.id); setActiveTab("messages"); }}>
                    <span className="sess-icon">💬</span>
                    <span className="sess-name">{s.title}</span>
                  </button>
                ))}
                <button className="btn-new-chat-main" onClick={() => createNewSession()}>+ Start New Conversation</button>
              </div>
              <div className="action-section">
                <button className="btn-send-message" onClick={() => setActiveTab("messages")}>
                  <span>{t.send}</span>
                  <svg className="arrow-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button className={`btn-voice-input ${isRecording ? "recording" : ""}`} onClick={handleVoiceInput} title={isRecording ? t.voiceActive : "Use Voice Input"}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  {isRecording && <span className="recording-label">{t.voiceActive}</span>}
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              <div className="messages-header-context">
                <span className="active-sess-title">{sessions.find(s => s.id === currentSessionId)?.title || "Chat"}</span>
                <button className="btn-back-home" onClick={() => setActiveTab("home")}>Back</button>
              </div>
              <div className="messages-view">
                {messages.map((msg) => (
                  <div key={msg.id} className={`message-row ${msg.role === "assistant" ? "bot" : "user"}-row fade-in`}>
                    {msg.role === "assistant" && <div className="bot-avatar">💊</div>}
                    <div className={`message-bubble ${msg.role === "assistant" ? "bot" : "user"}-bubble`}>
                      <p className="message-text">{msg.content}</p>
                      <div className="bubble-footer">
                        <span className="message-time">
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>
                    </div>
                    {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="suggestion-chips-container fade-in">
                        {msg.suggestions.map((suggestion, idx) => (
                          <button key={idx} className="dynamic-suggestion-chip" onClick={() => handleSendMessage(null, suggestion)} disabled={isLoading}>
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && <p className="empty-msg">{t.noActive}</p>}
                {isLoading && (
                  <div className="bot-row fade-in">
                    <div className="bot-avatar">💊</div>
                    <div className="message-bubble bot-bubble typing-dots"><span></span><span></span><span></span></div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>
              <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <button type="button" className={`btn-icon-input ${isRecording ? "recording" : ""}`} onClick={handleVoiceInput}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={t.placeholder} autoFocus disabled={isLoading}/>
                <button type="submit" className="btn-send-input" disabled={!inputValue.trim() || isLoading}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>
            </div>
          )}
        </div>

        <nav className="widget-nav">
          <button className={`nav-tab ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>{t.home}</span>
          </button>
          <button className={`nav-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 117 7 7.07 7.07 0 01-6-3.18l-1.42 1.42A8.95 8.95 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
            <span>{t.history}</span>
          </button>
        </nav>

        {activeTab === "history" && (
          <div className="history-full-view fade-in">
            <header className="history-header">
              <h4>Your Conversations</h4>
              <button className="btn-close-history" onClick={() => setActiveTab("home")}>×</button>
            </header>
            <div className="sessions-list">
              {sessions.map(s => (
                <div key={s.id} className={`session-item ${currentSessionId === s.id ? "active" : ""}`}>
                  <div className="sess-clickable" onClick={() => { setCurrentSessionId(s.id); setActiveTab("messages"); }}>
                    <span className="sess-title">{s.title}</span>
                    <span className="sess-date">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <button className="btn-delete-sess" onClick={() => deleteSession(s.id)}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
