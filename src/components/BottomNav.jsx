import React from "react";
import { Home, Zap, UserCircle2 } from "lucide-react";

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "shorts", label: "Shorts", icon: Zap },
  { id: "account", label: "Account", icon: UserCircle2 },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`}
            onClick={() => onSelect(t.id)}
          >
            <Icon className="bottom-nav-icon" strokeWidth={isActive ? 2.4 : 1.8} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
