"use client";

import { usePathname } from "next/navigation";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { PhoneIcon } from "./icons";

export default function FloatingCallButton() {
  const pathname = usePathname();
  // 매물 상세페이지는 ContactActions의 모바일 하단 고정 바에 이미 전화
  // 버튼이 있어(app/components/ContactActions.tsx), 겹치지 않도록 이
  // 페이지에서는 숨깁니다. 매물 목록(/listings, id 없음)은 그대로 둡니다.
  if (pathname?.startsWith("/listings/")) return null;

  return (
    <a
      href={PHONE_HREF}
      aria-label={`전화 문의 ${PHONE_NUMBER}`}
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 shadow-lg shadow-black/30 transition-transform hover:scale-105 active:scale-95 md:hidden"
    >
      <PhoneIcon className="h-7 w-7" />
    </a>
  );
}
