"use client";

import { useState } from "react";

export function AdminLogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline disabled:opacity-50"
    >
      {loggingOut ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
