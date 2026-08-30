import Image from "next/image";
import Link from "next/link";
import { BUSINESS_HOURS, COMPANY_NAME, NAVER_MAP_URL, WEEKLY_CLOSED_LABEL } from "../data/contact";
import { OFFICE_PHOTO } from "../data/media";
import { ASSOCIATION_HOLIDAY_CONTEXT_LABEL, type UpcomingHolidays } from "../lib/holiday";
import BrokerageInfo from "./BrokerageInfo";
import { LocationIcon } from "./icons";

export default function Footer({ holidayInfo }: { holidayInfo: UpcomingHolidays }) {
  const holidayDateLine = holidayInfo.thisMonth
    ? `${holidayInfo.thisMonth.label} · 다음 ${holidayInfo.next.label} · ${ASSOCIATION_HOLIDAY_CONTEXT_LABEL}`
    : `${holidayInfo.next.label} · ${ASSOCIATION_HOLIDAY_CONTEXT_LABEL}`;

  return (
    <footer className="border-t border-navy-900/10 bg-white px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <BrokerageInfo
          headerExtra={
            <div className="flex flex-col items-end gap-2">
              {OFFICE_PHOTO && (
                <div className="flex flex-col items-center gap-1">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-navy-900/10">
                    <Image
                      src={OFFICE_PHOTO}
                      alt="호수공인중개사사무소 외관"
                      fill
                      sizes="4rem"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-[11px] text-navy-800/50">이 간판을 찾으세요</p>
                </div>
              )}
              <a
                href={NAVER_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 px-5 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:bg-gold-500/10"
              >
                <LocationIcon className="h-4 w-4 text-gold-600" />
                네이버지도로 보기
              </a>
            </div>
          }
        >
          <div className="mt-4 flex flex-col gap-1 text-sm text-navy-800/70">
            <p className="flex gap-2">
              <span className="w-20 shrink-0 whitespace-nowrap font-semibold text-navy-800/50">
                영업시간
              </span>
              <span>{BUSINESS_HOURS}</span>
            </p>
            <p className="flex gap-2">
              <span className="w-20 shrink-0 whitespace-nowrap font-semibold text-navy-800/50">
                휴무
              </span>
              <span>
                {WEEKLY_CLOSED_LABEL}
                <br />
                {holidayDateLine}
              </span>
            </p>
          </div>
        </BrokerageInfo>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 break-keep text-[11px] text-navy-800/40 sm:justify-start">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </p>
          <Link
            href="/privacy"
            className="inline-flex min-h-[44px] items-center transition-colors hover:text-navy-800/60 sm:min-h-0"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center transition-colors hover:text-navy-800/60 sm:min-h-0"
          >
            관리자
          </Link>
        </div>
      </div>
    </footer>
  );
}
