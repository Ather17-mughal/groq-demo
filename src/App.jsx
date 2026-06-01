import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("latest Tech news Today");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Salam! I am Anther created by Ather, a student at Sukkur IBA University. How can I help you today?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSource, setVoiceSource] = useState("off");
  const [voiceStatusMessage, setVoiceStatusMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const audioRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function speakText(text) {
    if (!voiceEnabled) return;
    try {
      setSpeaking(true);
      setVoiceSource("requesting");
      setVoiceStatusMessage("Requesting ElevenLabs audio...");

      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const res = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/MF3mGyEYCl7XYWbV9V6O",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      );

      console.log("ElevenLabs request status:", res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "<failed to read body>");
        console.error("ElevenLabs error:", res.status, res.statusText, errorText);
        setVoiceSource("fallback");
        setVoiceStatusMessage(`ElevenLabs failed: ${res.status} ${res.statusText}`);
        // Fallback to browser voice if ElevenLabs fails
        fallbackSpeak(text);
        return;
      }

      setVoiceSource("elevenlabs");
      setVoiceStatusMessage("Using ElevenLabs voice.");
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        console.warn("Audio playback error, falling back to browser TTS.");
        setSpeaking(false);
        fallbackSpeak(text);
      };

      await audio.play().catch((err) => {
        console.warn("Audio play promise rejected, falling back to browser TTS.", err);
        setVoiceSource("fallback");
        setVoiceStatusMessage("ElevenLabs audio playback failed, using browser fallback.");
        fallbackSpeak(text);
      });

    } catch (err) {
      console.error("Voice error:", err);
      console.log("Using fallback browser speech synthesis.");
      setVoiceSource("fallback");
      setVoiceStatusMessage("ElevenLabs request failed, using browser fallback.");
      fallbackSpeak(text);
    }
  }

  // Fallback to browser voice if ElevenLabs fails
  function fallbackSpeak(text) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.82;    // slower = more natural
    utterance.pitch = 0.95;   // slightly lower = less robotic
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();

    // Best voices priority order
    const preferred =
      voices.find(v => v.name === 'Google US English') ||
      voices.find(v => v.name === 'Microsoft Aria Online (Natural)') ||
      voices.find(v => v.name === 'Microsoft Jenny Online (Natural)') ||
      voices.find(v => v.name === 'Samantha') ||
      voices.find(v => v.name.includes('Google')) ||
      voices.find(v => v.name.includes('Natural')) ||
      voices.find(v => v.lang === 'en-US');

    if (preferred) {
      console.log("Using voice:", preferred.name);
      utterance.voice = preferred;
    }

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

  async function sendMessage(overrideText) {
    const messageText = overrideText !== undefined ? overrideText : input;
    if (!messageText.trim() || loading) return;

    const userMessage = { role: "user", content: messageText };
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
              content: `You are a helpful Anther created by Ather,
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
      content: "Salam! I am Anther created by Ather, a student at Sukkur IBA University. How can I help you today?"
    }]);
  }

  return (
    <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>

      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="avatar">A</div>
          <div>
            <h1>Anther</h1>
            <p className="online">
              {speaking ? "🔊 Speaking..." : "● Online"}
            </p>
            <p className="voice-status">
              {!voiceEnabled
                ? "Voice: off"
                : voiceSource === "elevenlabs"
                ? "Voice: ElevenLabs"
                : voiceSource === "fallback"
                ? "Voice: browser fallback"
                : voiceSource === "requesting"
                ? "Voice: requesting ElevenLabs..."
                : "Voice: checking..."}
            </p>
            {voiceStatusMessage && (
              <p className="voice-status-message">{voiceStatusMessage}</p>
            )}
          </div>
        </div>
            <div className="header-buttons">
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(prev => !prev)}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>
          <button
            className="clear-btn voice-toggle-btn"
            onClick={() => {
              const enabled = !voiceEnabled;
              setVoiceEnabled(enabled);
              setVoiceSource(enabled ? "checking" : "off");
              setVoiceStatusMessage(enabled ? "Voice enabled. New answers will speak." : "Voice disabled.");
            }}
          >
            {voiceEnabled ? "🔊 Voice On" : "🔈 Voice Off"}
          </button>
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
          placeholder="Type a message..."
          disabled={loading}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>

    </div>
  );
}