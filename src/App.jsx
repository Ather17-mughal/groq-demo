import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am ANTHER created by Ather, a student at Sukkur IBA University. How can I help you today?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `You are a helpful ANTHER created by Ather,
              a student at Sukkur IBA University, Pakistan.
              If anyone asks who created you, who made you, or who built you:
              "I was created by Ather, a student at Sukkur IBA University, Pakistan."
              Never say you are made by Meta, Groq, OpenAI or any other company.
              Be helpful, clear and concise.`
            },
            // Send full conversation history for context
            ...updatedMessages
          ],
          max_tokens: 500
        })
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Sorry, something went wrong: " + data.error.message
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.choices[0].message.content
        }]);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error: " + err.message
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([{
      role: "assistant",
      content: "Hello! I am ANTHER created by Ather, a student at Sukkur IBA University. How can I help you today?"
    }]);
  }

  return (
    <div className="chat-container">

      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="avatar">A</div>
          <div>
            <h1>ANTHER</h1>
            <p className="online">● Online</p>
          </div>
        </div>
        <button className="clear-btn" onClick={clearChat}>
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="messages-wrapper">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-row ${msg.role === "user" ? "user-row" : "ai-row"}`}
          >
            {msg.role === "assistant" && (
              <div className="msg-avatar">A</div>
            )}
            <div className={`message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="msg-avatar user-avatar">U</div>
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="message-row ai-row">
            <div className="msg-avatar">A</div>
            <div className="message ai-msg typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)"
          disabled={loading}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>

    </div>
  );
}