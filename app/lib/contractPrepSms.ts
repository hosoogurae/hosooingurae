import { ADDRESS_LINES, COMPANY_NAME, PHONE_NUMBER } from "../data/contact";
import type { ContractPrepRole } from "./contractPrepItems";

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

/** 매수인·매도인은 매매계약, 임차인·임대인은 임대차계약. */
export function getContractTypeLabel(role: ContractPrepRole): "매매계약" | "임대차계약" {
  return role === "매수인" || role === "매도인" ? "매매계약" : "임대차계약";
}

/**
 * 자연어 특수 처리 대상인 3개 라벨. 이 라벨과 정확히 같은 문자열일 때만
 * 아래 buildPrepParagraph가 문장에 자연스럽게 녹여 넣습니다 — 관리자가
 * "항목 관리"에서 라벨을 다른 문구로 바꾸면(예: "계약금"→"계약금(중도금 포함)")
 * 더는 특수 취급하지 않고 일반 항목처럼 다룹니다(정보 손실 없음, 표현만
 * 달라짐 — 아래 extraItems로 빠져 "추가 준비물"에 나열됩니다).
 */
const MONEY_LABEL = "계약금";
const TRANSFER_LIMIT_LABEL = "계좌이체 한도 확인";
const RECEIVE_ACCOUNT_LABEL = "계약금을 수령할 본인 명의 계좌번호";
/** "지참" 문장에 자연스럽게 녹아드는 일반 항목. 그 외(관리자가 새로 추가한
 * 준비물, 특수계약 준비물 등)는 전부 "추가 준비물"로 따로 표시합니다. */
const GENERAL_FOLD_LABELS = new Set(["신분증", "도장"]);

function isPayerRole(role: ContractPrepRole): boolean {
  return role === "매수인" || role === "임차인";
}

/**
 * 체크된 준비물을 "지참" 문장 + 계좌 관련 문장으로 자연스럽게 합칩니다.
 * 하나도 없으면 undefined(문단 자체를 생략 — 준비물을 하나도 안 골랐을 때
 * "지참해 주세요" 같은 빈 안내를 보내지 않기 위함입니다).
 */
function buildPrepParagraph(role: ContractPrepRole, checkedLabels: string[]): string | undefined {
  const payer = isPayerRole(role);
  const hasMoney = checkedLabels.includes(MONEY_LABEL);
  const hasTransferLimit = payer && checkedLabels.includes(TRANSFER_LIMIT_LABEL);
  const hasReceiveAccount = !payer && checkedLabels.includes(RECEIVE_ACCOUNT_LABEL);

  // 신분증·도장은 항상 지참 문장에 녹아듭니다. "계약금"은 계좌이체 한도
  // 확인과 함께 체크됐을 때만 그 문장 안에 흡수되고(중복 표기 방지),
  // 그렇지 않으면 신분증·도장과 같은 일반 지참 항목으로 남습니다.
  // 그 외(관리자가 새로 추가한 준비물 등)는 여기 섞이지 않고
  // buildContractPrepSms의 "추가 준비물" 줄로 따로 빠집니다.
  const generalLabels = checkedLabels.filter((label) => {
    if (GENERAL_FOLD_LABELS.has(label)) return true;
    if (label === MONEY_LABEL && !hasTransferLimit) return true;
    return false;
  });

  let moneyClause: string | undefined;
  if (hasTransferLimit) {
    moneyClause = hasMoney
      ? "계약금 이체에 불편이 없도록 계좌이체 한도를 미리 확인해 주세요."
      : "계좌이체 한도를 미리 확인해 주세요.";
  } else if (hasReceiveAccount) {
    moneyClause = "계약금을 수령하실 본인 명의 계좌번호를 준비해 주세요.";
  }

  if (generalLabels.length === 0 && !moneyClause) return undefined;

  if (generalLabels.length === 0) return moneyClause;

  const particle = josa(generalLabels[generalLabels.length - 1], "을", "를");
  const generalSentence = `${generalLabels.join(", ")}${particle} 지참해 주`;

  return moneyClause ? `${generalSentence}시고 ${moneyClause}` : `${generalSentence}세요.`;
}

export interface ContractPrepSmsInput {
  role: ContractPrepRole;
  /** 손님 이름. 비우면 이름 없이 자연스럽게 나갑니다. */
  customerName?: string;
  /** YYYY-MM-DD. 문자 작성일이 아니라 실제 계약일입니다. */
  dateStr: string;
  /** HH:MM(24시간) */
  timeStr: string;
  /** 체크된 일반 준비물 항목 이름 목록(공통+역할, 금액 없음). */
  items: string[];
  /**
   * 체크된 특수계약(공동명의·대리계약·법인계약) 준비물 항목 이름 목록.
   * 기본 역할 준비물과 구분해서 "추가 준비물"로 표시합니다.
   */
  specialItems?: string[];
}

/**
 * 계약 준비물 안내 문자 초안을 만듭니다. 초안일 뿐이고 최종 문장은
 * 화면에서 사람이 직접 고칩니다.
 */
export function buildContractPrepSms(input: ContractPrepSmsInput): string {
  const dateLabel = formatContractDateKorean(input.dateStr);
  const timeLabel = formatContractTimeKorean(input.timeStr);
  const contractLabel = getContractTypeLabel(input.role);
  const name = input.customerName?.trim();
  // 같은 라벨이 중복으로 들어와도(예: 화면 상태 실수) 문장이 겹치지 않게
  // 순서는 유지한 채 한 번씩만 남깁니다.
  const items = Array.from(new Set(input.items));

  const lines: string[] = [
    name
      ? `${name}님, ${dateLabel} ${contractLabel} 일정 안내드립니다.`
      : `${dateLabel} ${contractLabel} 일정 안내드립니다.`,
  ];

  const prepParagraph = buildPrepParagraph(input.role, items);
  if (prepParagraph) lines.push(prepParagraph);

  // "추가 준비물": 3개 특수 라벨(계약금/계좌이체 한도 확인/계약금을 수령할
  // 본인 명의 계좌번호)과 지참 문장에 녹아드는 일반 항목(신분증·도장)을
  // 뺀 나머지 — 관리자가 항목 관리에서 새로 추가한 준비물, 그리고 체크된
  // 특수계약 준비물이 여기 해당합니다. Set으로 중복을 제거합니다.
  const RECOGNIZED_LABELS = new Set([MONEY_LABEL, TRANSFER_LIMIT_LABEL, RECEIVE_ACCOUNT_LABEL]);
  const allChecked = [...items, ...(input.specialItems ?? [])];
  const extraLabels = Array.from(
    new Set(
      allChecked.filter(
        (label) => !RECOGNIZED_LABELS.has(label) && !GENERAL_FOLD_LABELS.has(label),
      ),
    ),
  );

  if (extraLabels.length > 0) {
    lines.push(`추가 준비물: ${extraLabels.join(", ")}`);
  }

  lines.push(`${timeLabel}에 ${COMPANY_NAME}에서 뵙겠습니다.`);
  lines.push(ADDRESS_LINES[0]);
  lines.push(`문의 ${PHONE_NUMBER}`);

  return lines.join("\n");
}
