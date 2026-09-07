import { ADDRESS_LINES, COMPANY_NAME, PHONE_NUMBER } from "../data/contact";

/**
 * 계약 준비물 안내 문자 전용 순수 텍스트 로직입니다(Supabase 등 서버 전용
 * 코드를 여기 섞지 않습니다 — 클라이언트 컴포넌트에서 그대로 import).
 * 사무소명·주소·전화번호는 app/data/contact.ts 값만 씁니다.
 *
 * 요일·조사는 사람이 손으로 쓰면 틀리기 쉬워(예: 날짜만 보고 요일을
 * 잘못 적는 것) 전부 코드로 계산합니다. 금액은 절대 넣지 않습니다 —
 * 계약금 액수가 문자로 잘못 나가면 실제 사고이므로, 항목 이름("계약금")만
 * 문장에 넣고 금액은 사람이 통화·대면으로 직접 확인하게 합니다.
 */

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * "YYYY-MM-DD" → "9월 8일(화)". new Date(dateStr)로 바로 파싱하면 ISO
 * 문자열이 UTC 자정으로 해석돼 타임존에 따라 하루 밀릴 수 있어, 연·월·일을
 * 직접 분리해 로컬 날짜로 만듭니다.
 */
export function formatContractDateKorean(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${month}월 ${day}일(${weekday})`;
}

/** "HH:MM"(24시간) → "오후 6시" / "오후 6시 30분". */
export function formatContractTimeKorean(timeStr: string): string {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  const period = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${period} ${hour12}시` : `${period} ${hour12}시 ${minute}분`;
}

/**
 * 완성형 한글 음절(가~힣)의 종성(받침) 유무를 유니코드 계산으로 판정합니다.
 * 그 범위 밖(영문/숫자/기호 등)이면 받침 없음으로 취급합니다 — 준비물
 * 항목명은 전부 한글이라 실무에서는 해당 없는 경우입니다.
 */
export function hasBatchim(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) return false;
  const code = trimmed.codePointAt(trimmed.length - 1);
  if (code === undefined || code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** word의 받침 유무에 따라 withBatchim/withoutBatchim 중 알맞은 조사를 고릅니다. */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return hasBatchim(word) ? withBatchim : withoutBatchim;
}

export interface ContractPrepSmsInput {
  /** 손님 이름. 비우면 이름 없이 자연스럽게 나갑니다. */
  customerName?: string;
  /** YYYY-MM-DD */
  dateStr: string;
  /** HH:MM(24시간) */
  timeStr: string;
  /** 체크된 준비물 항목 이름 목록(금액 없음 — "계약금"처럼 이름만). */
  items: string[];
}

/**
 * 계약 준비물 안내 문자 초안을 만듭니다. 초안일 뿐이고 최종 문장은
 * 화면에서 사람이 직접 고칩니다.
 */
export function buildContractPrepSms(input: ContractPrepSmsInput): string {
  const dateLabel = formatContractDateKorean(input.dateStr);
  const timeLabel = formatContractTimeKorean(input.timeStr);
  const name = input.customerName?.trim();

  const lines: string[] = [
    name
      ? `${name}님, ${dateLabel} 계약 시 필요한 사항 안내드립니다.`
      : `${dateLabel} 계약 시 필요한 사항 안내드립니다.`,
  ];

  if (input.items.length > 0) {
    const itemsText = input.items.join(", ");
    const particle = josa(input.items[input.items.length - 1], "을", "를");
    lines.push(`${itemsText}${particle} 지참해 주세요.`);
  }

  lines.push(`${timeLabel}에 ${COMPANY_NAME}에서 뵙겠습니다.`);
  lines.push(ADDRESS_LINES[0]);
  lines.push(`문의 ${PHONE_NUMBER}`);

  return lines.join("\n");
}
