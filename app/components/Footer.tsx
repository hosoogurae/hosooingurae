import Link from "next/link";
import { BUSINESS_HOURS, COMPANY_NAME, NAVER_MAP_URL } from "../data/contact";
import BrokerageInfo from "./BrokerageInfo";
import { LocationIcon } from "./icons";

export default function Footer() {
  return (
    <footer className="border-t border-navy-900/10 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-bold text-navy-900">{COMPANY_NAME}</p>

          <div className="mt-4">
            <BrokerageInfo />
          </div>

          <p className="mt-3 flex gap-2 text-sm text-navy-800/70">
            <span className="w-32 shrink-0 whitespace-nowrap font-semibold text-navy-800/50">
              영업시간
            </span>
            <span>{BUSINESS_HOURS}</span>
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
          <a
            href={NAVER_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 px-5 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:bg-gold-500/10"
          >
            <LocationIcon className="h-4 w-4 text-gold-600" />
            네이버지도로 보기
          </a>
          <p className="text-xs text-navy-800/50">
            &copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights
            reserved.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl items-center justify-center md:justify-end">
        <Link
          href="/privacy"
          className="inline-flex min-h-[44px] items-center justify-center px-4 text-[11px] text-navy-800/30 transition-colors hover:text-navy-800/50 md:inline-block md:min-h-0 md:px-2 md:py-3"
        >
          개인정보처리방침
        </Link>
      </div>
    </footer>
  );
}
