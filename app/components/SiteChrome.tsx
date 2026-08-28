"use client";

import { usePathname } from "next/navigation";
import type { ApartmentComplexOption } from "../lib/listings";
import type { UpcomingHolidays } from "../lib/holiday";
import Header from "./Header";
import Footer from "./Footer";
import FloatingCallButton from "./FloatingCallButton";
import HolidayBanner from "./HolidayBanner";

/**
 * 관리자(/admin) 영역은 손님용 헤더/푸터/플로팅 전화버튼을 쓰지 않습니다 —
 * 관리자 전용 화면이라 손님용 요소가 보이면 안 됩니다(AdminNav가 관리자
 * 전용 헤더 역할을 대신합니다). usePathname은 SSR 시점에도 실제 요청
 * 경로를 그대로 반환하므로(클라이언트 하이드레이션 이후에만 값이
 * 채워지는 것이 아님), 서버가 처음 내려주는 HTML부터 이미 올바른 쪽만
 * 렌더링되어 화면이 깜빡이거나 밀리지 않습니다.
 */
export function SiteChrome({
  apartmentComplexes,
  holidayInfo,
  children,
}: {
  apartmentComplexes: ApartmentComplexOption[];
  holidayInfo: UpcomingHolidays;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <HolidayBanner holidayInfo={holidayInfo} />
      <Header apartmentComplexes={apartmentComplexes} />
      <main className="flex-1">{children}</main>
      <Footer holidayInfo={holidayInfo} />
      <FloatingCallButton />
    </>
  );
}
