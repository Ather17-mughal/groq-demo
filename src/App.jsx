import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am an AI Assistant created by Ather, a student at Sukkur IBA University. How can I help you today?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Speak welcome message on load
  useEffect(() => {
    speakText(messages[0].content);
  }, []);

  async function speakText(text) {
    try {
      setSpeaking(true);

      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const res = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      );

      if (!res.ok) {
        console.error("ElevenLabs error:", res.status);
        // Fallback to browser voice if ElevenLabs fails
        fallbackSpeak(text);
        return;
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setSpeaking(false);
        fallbackSpeak(text);
      };

      audio.play();

    } catch (err) {
      console.error("Voice error:", err);
      fallbackSpeak(text);
    }
  }

  // Fallback to browser voice if ElevenLabs fails
  function fallbackSpeak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google')) ||
                      voices.find(v => v.lang === 'en-US');
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    stopSpeaking();

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
              content: `You are a helpful AI assistant created by Ather,
              a student at Sukkur IBA University, Pakistan.
              If anyone asks who created you, who made you, or who built you:
              "I was created by Ather, a student at Sukkur IBA University, Pakistan."
              Never say you are made by Meta, Groq, OpenAI or any other company.
              Be helpful, clear and concise.`
            },
            ...updatedMessages
          ],
          max_tokens: 500
        })
      });

      const data = await res.json();

      if (data.error) {
        const errMsg = "Sorry, something went wrong: " + data.error.message;
        setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
        speakText(errMsg);
      } else {
        const aiReply = data.choices[0].message.content;
        setMessages(prev => [...prev, { role: "assistant", content: aiReply }]);
        speakText(aiReply);
      }

    } catch (err) {
      const errMsg = "Error: " + err.message;
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
      speakText(errMsg);
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
    stopSpeaking();
    setMessages([{
      role: "assistant",
      content: "Hello! I am an AI Assistant created by Ather, a student at Sukkur IBA University. How can I help you today?"
    }]);
  }

  return (
    <div className="chat-container">

      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="avatar">A</div>
          <div>
            <h1>AI Assistant</h1>
            <p className="online">
              {speaking ? "🔊 Speaking..." : "● Online"}
            </p>
          </div>
        </div>
        <div className="header-buttons">
          {speaking && (
            <button className="clear-btn stop-btn" onClick={stopSpeaking}>
              ⏹ Stop
            </button>
          )}
          <button className="clear-btn" onClick={clearChat}>
            Clear
          </button>
        </div>
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
              {msg.role === "assistant" && (
                <button
                  className="replay-btn"
                  onClick={() => speakText(msg.content)}
                  title="Replay voice"
                >
                  🔊
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="msg-avatar user-avatar">U</div>
            )}
          </div>
        ))}

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