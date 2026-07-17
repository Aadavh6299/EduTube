import React from "react";

export default function Header({ query, onQueryChange, onLogoClick }) {
  return (
    <header className="header">
      <button className="logo" onClick={onLogoClick} aria-label="EduTube home">
        <span className="logo-mark">▶</span>
        <span className="logo-text">EduTube</span>
      </button>
      <input
        className="search"
        type="text"
        placeholder="Search any topic, teacher, or video..."
        value={query}
        onChange={e => onQueryChange(e.target.value)}
      />
    </header>
  );
}
