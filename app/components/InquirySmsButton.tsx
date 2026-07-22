"use client";

import { useState, useSyncExternalStore } from "react";
import { buildSmsHref, isMobileDevice } from "../lib/listingInquiry";

// 구독할 대상이 없는 정적 값이라(페이지 로드 중 기기가 바뀌지 않음) 아무 것도
// 하지 않는 구독 함수를 씁니다. 서버에서는 기기를 알 수 없으니 null을 반환해
// 하이드레이션 불일치를 피하고, 마운트된 클라이언트에서만 실제 값을 읽습니다.
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return null;
}

export default function InquirySmsButton({
  phoneNumber,
  message,
}: {
  phoneNumber: string;
  message: string;
}) {
  const isMobile = useSyncExternalStore(
    subscribe,
    isMobileDevice,
    getServerSnapshot,
  );
  const [copied, setCopied] = useState(false);

  const baseClass =
    "rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-center text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition-transform hover:scale-[1.03]";

  if (isMobile === null) {
    // 기기 판별 전: 레이아웃이 튀지 않도록 자리만 동일하게 차지하는 비활성 버튼.
    return (
      <span className={`${baseClass} opacity-0`} aria-hidden="true">
        문의하기
      </span>
    );
  }

  if (isMobile) {
    return (
      <a href={buildSmsHref(phoneNumber, message)} className={baseClass}>
        문의하기
      </a>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 등은 조용히 무시합니다.
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-center">
      <button type="button" onClick={handleCopy} className={baseClass}>
        {copied ? "문의 내용 복사됨" : "문의 내용 복사하기"}
      </button>
      <span className="text-xs text-white/60">
        문자 문의: <span className="font-semibold text-white/80">{phoneNumber}</span>
      </span>
    </div>
  );
}
