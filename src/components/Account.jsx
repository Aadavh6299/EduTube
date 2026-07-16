import React from "react";
import { UserCircle2 } from "lucide-react";

export default function Account() {
  return (
    <div className="account-page">
      <UserCircle2 className="account-icon" strokeWidth={1.3} />
      <h2 className="account-title">Account</h2>
      <p className="account-text">
        Sign in jaldi aayega — tab tumhara naam, watch history aur progress yahan dikhega.
      </p>
      <button className="account-btn" disabled>Sign in (coming soon)</button>
    </div>
  );
}
