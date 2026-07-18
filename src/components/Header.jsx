import React, { useState, useRef, useCallback } from "react";
import { Mic } from "lucide-react";

export default function Header({ query, onQueryChange, onLogoClick }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      onQueryChange(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onQueryChange]);

  return (
    <header className="header">
      <button className="logo" onClick={onLogoClick} aria-label="EduTube home">
        <span className="logo-mark">▶</span>
        <span className="logo-text">EduTube</span>
      </button>
      <div className="search-wrap">
        <input
          className="search"
          type="text"
          placeholder="Search any topic, teacher, or video..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
        <button
          type="button"
          className={`mic-btn ${listening ? "mic-btn-active" : ""}`}
          onClick={startListening}
          aria-label="Search by voice"
        >
          <Mic className="mic-icon" />
        </button>
      </div>
    </header>
  );
}
