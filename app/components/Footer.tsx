import {
  ADDRESS_LINES,
  BUSINESS_HOURS,
  BUSINESS_REG_NUMBER,
  CEO_NAME,
  COMPANY_NAME,
  NAVER_MAP_URL,
  PHONE_HREF,
  PHONE_NUMBER,
} from "../data/contact";
import { LocationIcon, PhoneIcon } from "./icons";

const INFO_ROWS = [
  { label: "대표자", value: CEO_NAME },
  { label: "사업자등록번호", value: BUSINESS_REG_NUMBER },
  {
    label: "주소",
    value: (
      <>
        {ADDRESS_LINES[0]}
        <br />
        {ADDRESS_LINES[1]}
      </>
    ),
  },
  { label: "영업시간", value: BUSINESS_HOURS },
];

export default function Footer() {
  return (
    <footer className="border-t border-navy-900/10 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-bold text-navy-900">{COMPANY_NAME}</p>

          <dl className="mt-4 grid gap-2 text-sm text-navy-800/70 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-1">
            {INFO_ROWS.map((row) => (
              <div key={row.label} className="flex gap-2">
                <dt className="w-28 shrink-0 whitespace-nowrap font-semibold text-navy-800/50">
                  {row.label}
                </dt>
                <dd>{row.value}</dd>
              </div>
            ))}
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 whitespace-nowrap font-semibold text-navy-800/50">
                전화
              </dt>
              <dd>
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center gap-1 font-semibold text-navy-900 hover:text-gold-600"
                >
                  <PhoneIcon className="h-3.5 w-3.5 text-gold-600" />
                  {PHONE_NUMBER}
                </a>
              </dd>
            </div>
          </dl>
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
    </footer>
  );
}
