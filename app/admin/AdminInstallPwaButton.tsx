"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * 브라우저 기본 설치 기능(Chrome의 beforeinstallprompt)을 그대로 쓰는
 * 아주 작은 버튼입니다. 설치 가능한 상태가 아니면 아예 렌더링하지
 * 않고, 팝업/배너 없이 다른 네비게이션 링크와 같은 모양으로만
 * 보여줍니다.
 */
export function AdminInstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!deferredPrompt) return null;

  async function handleInstallClick() {
    await deferredPrompt?.prompt();
    setDeferredPrompt(null);
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="rounded-md px-3 py-2 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-900/5 sm:text-base"
    >
      홈 화면에 설치
    </button>
  );
}
