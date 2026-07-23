"use client";

import { useState, type FormEvent } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setError("네트워크 오류로 로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-center text-sm font-semibold tracking-wide text-gold-600">
        ADMIN
      </p>
      <h1 className="mt-2 text-center text-2xl font-black text-navy-950">
        관리자 로그인
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy-800/70">아이디</span>
          <input
            required
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-lg border border-navy-900/15 bg-white px-4 py-3.5 text-base text-navy-900 outline-none focus:border-gold-500"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy-800/70">비밀번호</span>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-navy-900/15 bg-white px-4 py-3.5 text-base text-navy-900 outline-none focus:border-gold-500"
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3.5 text-base font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
