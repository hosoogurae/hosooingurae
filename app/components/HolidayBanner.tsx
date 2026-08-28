"use client";

import { useState, useSyncExternalStore } from "react";
import { MessageSquareText } from "lucide-react";
import { buildHolidayInquiryMessage, buildSmsHref, isMobileDevice } from "../lib/listingInquiry";
import type { UpcomingHolidays } from "../lib/holiday";

// ContactActions.tsx와 동일한 패턴: 문자 문의 대상 번호는 환경변수로만
// 관리하고, 없으면 버튼 자체를 숨깁니다.
const INQUIRY_MOBILE_NUMBER = process.env.NEXT_PUBLIC_INQUIRY_MOBILE?.trim() || undefined;

// 구독할 대상이 없는 정적 값이라 아무 것도 하지 않는 구독 함수를 씁니다.
// 서버에서는 기기를 알 수 없으니 null을 반환해 하이드레이션 불일치를 피하고,
// 마운트된 클라이언트에서만 실제 값을 읽습니다(ContactActions.tsx와 동일).
function subscribe() {
  return () => {};
}
function getServerSnapshot() {
  return null;
}

/**
 * 휴무일 당일에만 페이지 상단에 표시되는 배너. 오늘 날짜(today)는
 * app/layout.tsx(서버 컴포넌트)에서 Asia/Seoul 기준으로 미리 계산해
 * prop으로 내려받습니다 — 이 컴포넌트가 직접 new Date()를 부르면 서버와
 * 클라이언트의 계산 시점이 달라 하이드레이션 불일치가 날 수 있습니다.
 */
export default function HolidayBanner({ holidayInfo }: { holidayInfo: UpcomingHolidays }) {
  const isMobile = useSyncExternalStore(subscribe, isMobileDevice, getServerSnapshot);
  const [copied, setCopied] = useState(false);

  if (!holidayInfo.todayIsHoliday) return null;

  const dateLabel = `${holidayInfo.today.month}월 ${holidayInfo.today.day}일`;
  const message = buildHolidayInquiryMessage(dateLabel);
  const buttonClass =
    "mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-950";

  async function handleDesktopClick() {
    if (!INQUIRY_MOBILE_NUMBER) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      // 클립보드 권한이 없는 환경 등은 조용히 무시합니다.
    }
  }

  return (
    <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center">
      <p className="text-sm font-bold text-amber-900">오늘({dateLabel})은 사무실 휴무일입니다.</p>
      <p className="mt-0.5 text-xs text-amber-800/80">
        문자로 문의 남겨주시면 다음 영업일에 연락드리겠습니다.
      </p>

      {INQUIRY_MOBILE_NUMBER &&
        (isMobile === true ? (
          <a href={buildSmsHref(INQUIRY_MOBILE_NUMBER, message)} className={buttonClass}>
            <MessageSquareText className="h-4 w-4" strokeWidth={2} />
            문자 문의
          </a>
        ) : isMobile === false ? (
          <div className="relative inline-block">
            <button type="button" onClick={handleDesktopClick} className={buttonClass}>
              <MessageSquareText className="h-4 w-4" strokeWidth={2} />
              문자 문의
            </button>
            {copied && (
              <p className="absolute inset-x-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-navy-950 px-3 py-2 text-center text-xs font-medium text-white shadow-lg">
                문의 내용이 복사되었습니다. 문자 앱에서 {INQUIRY_MOBILE_NUMBER}로 보내주세요.
              </p>
            )}
          </div>
        ) : (
          // 기기 판별 전(SSR/최초 렌더)에는 자리만 차지하는 상태로 보여줘
          // 하이드레이션 이후 레이아웃이 튀지 않게 합니다.
          <span className={`${buttonClass} opacity-0`} aria-hidden="true">
            <MessageSquareText className="h-4 w-4" strokeWidth={2} />
            문자 문의
          </span>
        ))}
    </div>
  );
}
