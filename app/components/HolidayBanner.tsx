import { formatHolidayPeriodRangeLabel, type UpcomingHolidays } from "../lib/holiday";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { PhoneIcon } from "./icons";

/**
 * 휴무 기간 당일에만 페이지 상단에 표시되는 배너. 오늘 날짜·휴무 정보
 * (holidayInfo)는 app/layout.tsx(서버 컴포넌트)에서 Asia/Seoul 기준으로
 * 미리 계산해 prop으로 내려받습니다.
 *
 * 손님이 급하게 집을 구하다 전화하는 경우가 많아 "문자 남기면 다음
 * 영업일에 연락드리겠습니다" 식으로 돌려보내지 않습니다 — 바로 걸 수
 * 있는 전화번호만 보여줍니다. 클릭 동작이 tel: 링크 하나뿐이라 클라이언트
 * 상태가 필요 없어 서버 컴포넌트로 둡니다.
 */
export default function HolidayBanner({ holidayInfo }: { holidayInfo: UpcomingHolidays }) {
  const { activePeriod } = holidayInfo;
  if (!activePeriod) return null;

  const rangeLabel = formatHolidayPeriodRangeLabel(activePeriod);

  return (
    <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center">
      <p className="text-sm font-bold text-amber-900">
        {rangeLabel}은 {activePeriod.name}입니다.
      </p>
      <p className="mt-0.5 text-xs text-amber-800/80">문의는 전화 주세요.</p>
      <a
        href={PHONE_HREF}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-950"
      >
        <PhoneIcon className="h-4 w-4" />
        {PHONE_NUMBER}
      </a>
    </div>
  );
}
