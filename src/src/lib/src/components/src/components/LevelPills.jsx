import React from "react";

export default function LevelPills({ levels, activeId, onSelect }) {
  return (
    <nav className="pills" aria-label="Education level">
      {levels.map(l => (
        <button
          key={l.id}
          className={`pill ${l.id === activeId ? "pill-active" : ""}`}
          onClick={() => onSelect(l.id)}
        >
          <span aria-hidden="true">{l.emoji}</span> {l.label}
        </button>
      ))}
    </nav>
  );
}
