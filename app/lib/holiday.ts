const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 협회 지정 휴무일 옆에 붙이는 맥락 표현. 규칙("3주차 월요일" 등)을
 * 그대로 설명하면 손님이 더 헷갈리므로, "동네 부동산 공동 휴무"라는
 * 성격만 알려줍니다.
 */
export const ASSOCIATION_HOLIDAY_CONTEXT_LABEL = "구래동 부동산 공동 휴무";

export interface HolidayDate {
  year: number;
  month: number;
  day: number;
  /** "8월 10일(월)" 형식. */
  label: string;
}

export interface UpcomingHolidays {
  today: { year: number; month: number; day: number };
  todayIsHoliday: boolean;
  /** 이번 달 휴무일. 이미 지났으면 null. */
  thisMonth: HolidayDate | null;
  /** 다음 달 휴무일 (매달 3주차 월요일이 반드시 있으므로 항상 존재). */
  next: HolidayDate;
}

function formatHolidayLabel(year: number, month: number, day: number): string {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${month}월 ${day}일(${WEEKDAY_LABELS[weekday]})`;
}

function getNextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * 구래동 부동산 협회 기준 매달 휴무일("3주차 월요일")의 날짜(일)를
 * 계산합니다. 규칙: 주는 일요일에 시작하고, 1일이 포함된 주가 1주차입니다.
 *
 * 공식: 그달 1일의 요일(dow1, 일=0~토=6)을 알면 1주차 일요일은 "1 - dow1"일,
 * 3주차 월요일은 그로부터 15일 뒤이므로 "16 - dow1"일입니다. dow1은 UTC
 * 기준으로 구합니다 — 달력상의 날짜 계산이라 실제 타임존과 무관하고, UTC로
 * 고정해야 로컬 타임존에 따라 자정 근처에서 날짜가 밀리는 걸 막을 수
 * 있습니다.
 */
export function getMonthlyHolidayDay(year: number, month: number): number {
  const dow1 = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 16 - dow1;
}

export function getMonthlyHoliday(year: number, month: number): HolidayDate {
  const day = getMonthlyHolidayDay(year, month);
  return { year, month, day, label: formatHolidayLabel(year, month, day) };
}

/**
 * 실제 현재 시각을 Asia/Seoul 기준 연/월/일로 읽습니다. 값이 호출 시점의
 * 실제 시계에 좌우되므로, 반드시 서버 컴포넌트(app/layout.tsx의
 * RootLayout)에서만 호출하세요. 클라이언트에서 부르면 상담 도우미에서
 * 겪었던 것과 같은 하이드레이션 불일치가 재현될 수 있습니다.
 */
export function getSeoulToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

/**
 * "오늘"을 기준으로 이번 달·다음 달 휴무일을 계산합니다. today는 반드시
 * getSeoulToday()로 구한 값(또는 같은 형식의 값)을 넘겨야 합니다. 순수
 * 함수라 today를 고정값으로 넣으면 결과가 항상 같습니다 — 테스트도 이
 * 방식으로 검증합니다.
 */
export function getUpcomingHolidays(today: {
  year: number;
  month: number;
  day: number;
}): UpcomingHolidays {
  const thisMonthHoliday = getMonthlyHoliday(today.year, today.month);
  const { year: nextYear, month: nextMonth } = getNextMonth(today.year, today.month);
  const nextMonthHoliday = getMonthlyHoliday(nextYear, nextMonth);

  const todayIsHoliday = today.day === thisMonthHoliday.day;
  // thisMonthHoliday는 today와 연/월이 항상 같으므로(위에서 그렇게 계산),
  // 일(day)만 비교하면 "이미 지났는지"를 정확히 판정할 수 있습니다.
  const thisMonthAlreadyPassed = today.day > thisMonthHoliday.day;

  return {
    today: { year: today.year, month: today.month, day: today.day },
    todayIsHoliday,
    thisMonth: thisMonthAlreadyPassed ? null : thisMonthHoliday,
    next: nextMonthHoliday,
  };
}
