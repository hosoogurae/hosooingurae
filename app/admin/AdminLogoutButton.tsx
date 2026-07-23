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
      className="rounded-md border border-navy-900/15 px-3 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600 disabled:opacity-50 sm:text-base"
    >
      {loggingOut ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
