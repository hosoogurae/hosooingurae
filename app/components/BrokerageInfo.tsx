import {
  ADDRESS_LINES,
  BROKERAGE_REG_NUMBER,
  BUSINESS_REG_NUMBER,
  CEO_NAME,
  COMPANY_NAME,
  PHONE_HREF,
  PHONE_NUMBER,
} from "../data/contact";

const ROWS = [
  { label: "중개사무소 명칭", value: COMPANY_NAME },
  {
    label: "소재지",
    value: (
      <>
        {ADDRESS_LINES[0]}
        <br />
        {ADDRESS_LINES[1]}
      </>
    ),
  },
  {
    label: "연락처",
    value: (
      <a
        href={PHONE_HREF}
        className="font-semibold text-navy-900 hover:text-gold-600"
      >
        {PHONE_NUMBER}
      </a>
    ),
  },
  { label: "개설등록번호", value: BROKERAGE_REG_NUMBER },
  { label: "개업공인중개사", value: CEO_NAME },
  { label: "사업자등록번호", value: BUSINESS_REG_NUMBER },
];

/**
 * 공인중개사법상 중개대상물 표시·광고 시 반드시 나타나야 하는 중개사무소
 * 정보 블록입니다(명칭·소재지·연락처·개설등록번호·개업공인중개사 성명·
 * 사업자등록번호). 값은 app/data/contact.ts 한 곳에서만 가져오며, 이
 * 컴포넌트를 축약하거나 항목을 빼지 않습니다.
 */
export default function BrokerageInfo() {
  return (
    <dl className="grid gap-2 text-sm text-navy-800/70 sm:grid-cols-2 sm:gap-x-8">
      {ROWS.map((row) => (
        <div key={row.label} className="flex gap-2">
          <dt className="w-32 shrink-0 whitespace-nowrap font-semibold text-navy-800/50">
            {row.label}
          </dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
