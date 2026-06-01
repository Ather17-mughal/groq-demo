import { useState } from "react";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askAI() {
    if (!input.trim()) return;
    setLoading(true);
    setResponse("");
    setError("");

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
              content: `You are a helpful ANTHER AI created by Ather, 
              a student at Sukkur IBA University, Pakistan.
              
              If anyone asks who created you, who made you, or who built you — always answer:
              "I was created by Ather, a student at Sukkur IBA University, Pakistan."
              
              Never say you are made by Meta, Groq, OpenAI or any other company.
              Always be helpful, clear and concise in your answers.`
            },
            {
              role: "user",
              content: input
            }
          ],
          max_tokens: 500
        })
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
      } else {
        setResponse(data.choices[0].message.content);
      }

    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") askAI();
  }

  return (
    <div className="container">
      <div className="header">
        <div className="badge">AI Powered</div>
        <h1>ANTHER AI</h1>
        <p className="subtitle">Created by Ather — Sukkur IBA University</p>
      </div>

      <div className="input-wrapper">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={loading}
        />
        <button onClick={askAI} disabled={loading}>
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </div>

      {loading && (
        <div className="status">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      )}

      {error && (
        <div className="response-box error-box">
          <div className="response-label error-label">ERROR</div>
          {error}
        </div>
      )}

      {response && (
        <div className="response-box">
          <div className="response-label">AI Response</div>
          <p className="response-text">{response}</p>
        </div>
      )}

      <div className="footer">
        Built with Groq API • Sukkur IBA University
      </div>
    </div>
  );
}