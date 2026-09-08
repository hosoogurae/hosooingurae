"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

// canonical 도메인 하나만 가리켜야 하는 값이라 NEXT_PUBLIC_SITE_URL을
// 씁니다(요청 host 기반 origin이 아님 — app/lib/siteUrl.ts의 buildSiteUrl과
// 같은 원칙. 이 컴포넌트는 클라이언트라 그 서버 전용 함수 대신 env를
// 직접 읽습니다). 빌드 시 클라이언트 번들에 그대로 인라인되므로 모듈
// 최상단에서 바로 읽어도 됩니다(ContactActions.tsx의 KAKAO_CHANNEL_URL과
// 동일한 패턴).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined;

/**
 * 매물 상세 페이지 전용 공유 버튼. 카카오 SDK 등 외부 스크립트를 붙이지
 * 않고 Web Share API(navigator.share)만 씁니다 — 지원하는 기기(주로
 * 모바일)에서는 OS 공유 시트가 떠서 카톡·문자·메일 등 아무 곳으로나 보낼
 * 수 있고, 지원하지 않는 환경(주로 데스크톱)에서는 링크를 클립보드에
 * 복사합니다. 지원 여부는 클릭 시점에 판정하므로(버튼 자체는 서버·클라
 * 이언트에서 항상 같은 모습) 하이드레이션 불일치가 없습니다.
 */
export default function ShareButton({
  title,
  text,
  path,
  className = "",
}: {
  /** navigator.share의 title. 공유 앱에 따라 안 쓰일 수 있습니다. */
  title: string;
  /** "단지명 · 거래유형 · 가격" 형태의 한 줄 요약. */
  text: string;
  /** 매물 상세 페이지 경로("/listings/{id}"). SITE_URL과 합쳐 절대 URL을 만듭니다. */
  path: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!SITE_URL) return null;
  const url = `${SITE_URL}${path}`;

  async function handleClick() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // 사용자가 공유 시트를 취소한 경우 등(AbortError 포함) — 조용히 무시합니다.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 드문 환경 — 조용히 무시합니다.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:border-gold-400 hover:text-gold-400 ${className}`}
    >
      <Share2 className="h-4 w-4" strokeWidth={2} />
      {copied ? "링크가 복사되었습니다" : "공유하기"}
    </button>
  );
}
