import type { ReactNode } from "react";
import {
  ADDRESS_LINES,
  BROKERAGE_REG_NUMBER,
  BUSINESS_REG_NUMBER,
  CEO_NAME,
  COMPANY_NAME,
  PHONE_HREF,
  PHONE_NUMBER,
} from "../data/contact";

interface BrokerageInfoProps {
  /** 사무소명 줄 오른쪽에 놓을 요소(예: Footer의 "네이버지도로 보기" 버튼). */
  headerExtra?: ReactNode;
  /** 주소와 등록번호 줄 사이에 끼워 넣을 내용(예: Footer의 영업시간/휴무). */
  children?: ReactNode;
}

/**
 * 공인중개사법상 중개대상물 표시·광고 시 반드시 나타나야 하는 중개사무소
 * 정보(명칭·소재지·연락처·개설등록번호·개업공인중개사 성명·사업자등록번호)
 * 를 모두 표시합니다. 값은 app/data/contact.ts 한 곳에서만 가져오며, 항목을
 * 빼지 않습니다.
 *
 * "표시 의무"는 "크게 표시할 의무"가 아니므로, 손님이 실제로 찾는 정보
 * (사무소명·전화번호·주소)만 크게 보여주고, 등록번호 3종(개업공인중개사·
 * 개설등록번호·사업자등록번호)은 한 줄로 묶어 작은 회색 글씨로 표시합니다.
 */
export default function BrokerageInfo({ headerExtra, children }: BrokerageInfoProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-bold text-navy-900">{COMPANY_NAME}</p>
        {headerExtra}
      </div>

      <a
        href={PHONE_HREF}
        className="mt-1 block text-2xl font-black text-gold-600 transition-colors hover:text-gold-700 sm:text-3xl"
      >
        {PHONE_NUMBER}
      </a>

      <p className="mt-3 break-keep text-sm leading-relaxed text-navy-800/80">
        {ADDRESS_LINES[0]}
        <br />
        {ADDRESS_LINES[1]}
      </p>

      {children}

      <p className="mt-4 break-keep border-t border-navy-900/10 pt-3 text-xs text-navy-800/40">
        개업공인중개사 {CEO_NAME} · 개설등록번호 {BROKERAGE_REG_NUMBER} · 사업자등록번호{" "}
        {BUSINESS_REG_NUMBER}
      </p>
    </div>
  );
}
