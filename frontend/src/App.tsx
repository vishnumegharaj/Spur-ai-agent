import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

type MessageRole = "user" | "ai" | "system" | "error";

type Message = {
  role: MessageRole;
  text: string;
};

const FALLBACK_ERROR_MESSAGE =
  "⚠️ Sorry, I'm having trouble responding right now. Please try again.";

const MAX_MESSAGE_LENGTH = 1000;
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [inputError, setInputError] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Load history */
  useEffect(() => {
    const stored = localStorage.getItem("sessionId");
    if (stored) {
      const id = Number(stored);
      if (!isNaN(id)) {
        fetchHistory(id);
      } else {
        localStorage.removeItem("sessionId");
        showWelcomeMessage();
      }
    } else {
      showWelcomeMessage();
    }
  }, []);

  const showWelcomeMessage = () => {
    setMessages([
      { role: "system", text: "👋 Hi! How can I help you today?" },
    ]);
    setSessionId(null);
  };

  const fetchHistory = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/chat/history/${id}`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!data || typeof data.sessionId !== "number" || !Array.isArray(data.messages)) {
        throw new Error("Invalid response format");
      }
      
      setSessionId(data.sessionId);
      setMessages(data.messages);
      localStorage.setItem("sessionId", String(data.sessionId));
    } catch (error) {
      console.error("Failed to fetch history:", error);
      localStorage.removeItem("sessionId");
      setSessionId(null);
      showWelcomeMessage();
    }
  };

  const clearErrors = () => {
    setMessages((prev) => prev.filter((m) => m.role !== "error"));
    setInputError("");
  };

  const addErrorMessage = (text: string) => {
    setMessages((prev) => {
      const withoutErrors = prev.filter((m) => m.role !== "error");
      return [...withoutErrors, { role: "error", text }];
    });
  };

  const validateInput = (text: string): string | null => {
    if (!text.trim()) {
      return "Message cannot be empty";
    }
    
    if (text.length > MAX_MESSAGE_LENGTH) {
      return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`;
    }
    
    return null;
  };

  const sendMessage = async () => {
    const validationError = validateInput(input);
    if (validationError) {
      setInputError(validationError);
      return;
    }
    
    if (loading) return;

    const userText = input.trim();
    setInput("");
    setInputError("");
    clearErrors();
    
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data?.error || `Server error (${res.status})`;
        addErrorMessage(errorMsg);
        return;
      }

      const data = await res.json();

      if (!data || typeof data.reply !== "string") {
        addErrorMessage("Invalid response from server");
        return;
      }

      if (typeof data.sessionId === "number") {
        setSessionId(data.sessionId);
        localStorage.setItem("sessionId", String(data.sessionId));
      }

      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
      
    } catch (error) {
      console.error("Send message error:", error);
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          addErrorMessage("Request timed out. Please try again.");
        } else if (error.message.includes("Failed to fetch")) {
          addErrorMessage("Network error. Please check your connection.");
        } else {
          addErrorMessage(FALLBACK_ERROR_MESSAGE);
        }
      } else {
        addErrorMessage(FALLBACK_ERROR_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (inputError) {
      setInputError("");
    }
    
    if (value.length > MAX_MESSAGE_LENGTH * 0.9) {
      const remaining = MAX_MESSAGE_LENGTH - value.length;
      if (remaining > 0) {
        setInputError(`${remaining} characters remaining`);
      } else {
        setInputError(`Message too long by ${Math.abs(remaining)} characters`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        <div className="chat-header">AI Support</div>

        <div className="chat-body">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.text}
              </ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="typing-indicator">
              Agent is typing
              <span className="typing">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="chat-input-bar">
          <div style={{ flex: 1, position: "relative" }}>
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              disabled={loading}
            />
            {inputError && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  left: "0",
                  fontSize: "12px",
                  color: inputError.includes("remaining") ? "#f59e0b" : "#ef4444",
                }}
              >
                {inputError}
              </div>
            )}
          </div>
          <button 
            onClick={sendMessage} 
            disabled={loading || !!validateInput(input)}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;