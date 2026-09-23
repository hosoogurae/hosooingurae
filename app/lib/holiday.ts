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

/** 하루 이상 이어지는 휴무 기간. startDate/endDate는 "YYYY-MM-DD"(포함, 둘 다 같으면 하루짜리). */
export interface HolidayPeriod {
  /** 화면에 그대로 보여줄 이름(예: "추석 연휴"). */
  name: string;
  startDate: string;
  endDate: string;
}

/**
 * 이 사무소가 실제로 쉬는 날은 세 가지뿐입니다: 설날·추석 연휴, 매달 셋째
 * 주 월요일(공동 휴무), 매주 일요일. 개천절·한글날·삼일절·어린이날·광복절
 * 같은 국경일/법정공휴일은 월~토에 있으면 정상 영업합니다.
 *
 * ⚠️ 이 배열에는 설날·추석 연휴만 넣습니다. 국경일을 여기 추가하면 안
 * 됩니다 — 이 사무소는 국경일에 쉬지 않기 때문입니다. 대체공휴일이 붙는
 * 해에는(설날·추석이 주말과 겹치는 경우) 정부가 발표한 실제 연휴 기간
 * 그대로(대체공휴일 포함) 넣으세요.
 *
 * 매달 셋째 주 월요일 휴무는 여기 넣지 않습니다 — getMonthlyHoliday()가
 * 계산으로 처리하며, getUpcomingHolidays()가 이 배열과 합쳐서 반환합니다.
 */
export const LUNAR_HOLIDAY_PERIODS: HolidayPeriod[] = [
  { name: "추석 연휴", startDate: "2026-09-24", endDate: "2026-09-26" },
  // 2027년 설날(2/7, 일요일)이 주말과 겹쳐 대체공휴일(2/9 화요일)이 붙는다.
  // 정부 발표 연휴 그대로(대체공휴일 포함) 2/6(토)~2/9(화) 4일을 넣는다.
  { name: "설날 연휴", startDate: "2027-02-06", endDate: "2027-02-09" },
];

function formatHolidayLabel(year: number, month: number, day: number): string {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${month}월 ${day}일(${WEEKDAY_LABELS[weekday]})`;
}

/** "YYYY-MM-DD"를 연/월/일 숫자로 쪼갭니다. */
function parseDateStr(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 휴무 기간의 화면 표시용 날짜 범위 라벨을 만듭니다. 하루짜리면 "10월
 * 3일(토)", 같은 달 안이면 "9월 24일(목)~26일(토)"처럼 끝 날짜의 월을
 * 반복하지 않습니다. 달이 다르면(예: 설 연휴가 1월 말~2월 초에 걸치는 해)
 * 양쪽 다 "M월 D일(요일)"로 온전히 씁니다.
 */
export function formatHolidayPeriodRangeLabel(period: HolidayPeriod): string {
  const start = parseDateStr(period.startDate);
  const startLabel = formatHolidayLabel(start.year, start.month, start.day);
  if (period.startDate === period.endDate) return startLabel;

  const end = parseDateStr(period.endDate);
  const endWeekday = WEEKDAY_LABELS[new Date(Date.UTC(end.year, end.month - 1, end.day)).getUTCDay()];
  if (start.year === end.year && start.month === end.month) {
    return `${startLabel}~${end.day}일(${endWeekday})`;
  }
  return `${startLabel}~${formatHolidayLabel(end.year, end.month, end.day)}`;
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

/** getMonthlyHoliday 결과를 하루짜리 HolidayPeriod로 바꿉니다(다른 휴무 기간과 같은 모양으로 다루기 위함). */
function monthlyHolidayToPeriod(year: number, month: number): HolidayPeriod {
  const { day } = getMonthlyHoliday(year, month);
  const dateStr = toDateStr(year, month, day);
  return { name: ASSOCIATION_HOLIDAY_CONTEXT_LABEL, startDate: dateStr, endDate: dateStr };
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

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export interface UpcomingHolidays {
  today: { year: number; month: number; day: number };
  /** 오늘이 어떤 휴무 기간 안이면 그 기간, 아니면 null. 배너가 이 값 하나만 봅니다. */
  activePeriod: HolidayPeriod | null;
  /**
   * "이번 달 또는 다음 달에 시작하는" 휴무 기간을 시작일 순으로 담습니다
   * (지난 기간은 자동으로 빠짐). 매달 셋째 주 월요일 규칙이 원래 "이번
   * 달·다음 달분만" 보여주던 것과 같은 원칙을 LUNAR_HOLIDAY_PERIODS에도
   * 그대로 적용한 것 — 그래서 몇 달 뒤의 설날은 아직 안 보이다가, 그 달이
   * 되면 자동으로 나타납니다(LUNAR_HOLIDAY_PERIODS에 미리 등록해둬도
   * 당장 화면에 몰아서 보이지 않음). 푸터가 이 목록을 그대로 나열합니다.
   */
  upcoming: HolidayPeriod[];
}

/**
 * "오늘"을 기준으로 휴무 정보를 계산합니다. 매달 셋째 주 월요일 규칙(이번
 * 달·다음 달분)과 LUNAR_HOLIDAY_PERIODS(설날·추석)를 합쳐서 판단합니다.
 * today는 반드시 getSeoulToday()로 구한 값(또는 같은 형식의 값)을
 * 넘겨야 합니다. 순수 함수라 today를 고정값으로 넣으면 결과가 항상
 * 같습니다 — 테스트도 이 방식으로 검증합니다.
 */
export function getUpcomingHolidays(today: {
  year: number;
  month: number;
  day: number;
}): UpcomingHolidays {
  const todayStr = toDateStr(today.year, today.month, today.day);
  const { year: nextYear, month: nextMonth } = getNextMonth(today.year, today.month);
  const thisMonthIdx = monthIndex(today.year, today.month);
  const nextMonthIdx = monthIndex(nextYear, nextMonth);

  const allPeriods: HolidayPeriod[] = [
    monthlyHolidayToPeriod(today.year, today.month),
    monthlyHolidayToPeriod(nextYear, nextMonth),
    ...LUNAR_HOLIDAY_PERIODS,
  ];

  // 아직 끝나지 않은 것만(지난 명절은 LUNAR_HOLIDAY_PERIODS에 남겨둬도 여기서 빠짐).
  const notPassed = allPeriods.filter((period) => period.endDate >= todayStr);

  // activePeriod는 "오늘이 그 안에 있는지"만 보므로 기간이 며칠 전에
  // 시작했어도(연휴 중간) 정확히 찾습니다 — 아래 upcoming의 "이번/다음 달
  // 시작" 필터와는 별개입니다.
  const activePeriod =
    notPassed.find((period) => period.startDate <= todayStr && todayStr <= period.endDate) ?? null;

  const upcoming = notPassed
    .filter((period) => {
      const start = parseDateStr(period.startDate);
      const startIdx = monthIndex(start.year, start.month);
      return startIdx === thisMonthIdx || startIdx === nextMonthIdx;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return {
    today: { year: today.year, month: today.month, day: today.day },
    activePeriod,
    upcoming,
  };
}
