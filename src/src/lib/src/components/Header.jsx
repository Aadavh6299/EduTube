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
        placeholder="Search within this level..."
        value={query}
        onChange={e => onQueryChange(e.target.value)}
      />
    </header>
  );
}
