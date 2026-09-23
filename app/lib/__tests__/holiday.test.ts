import { describe, expect, it } from "vitest";
import {
  ASSOCIATION_HOLIDAY_CONTEXT_LABEL,
  formatHolidayPeriodRangeLabel,
  getMonthlyHoliday,
  getMonthlyHolidayDay,
  getUpcomingHolidays,
  LUNAR_HOLIDAY_PERIODS,
} from "../holiday";

describe("getMonthlyHolidayDay", () => {
  it("2026년 8월은 10일이다 (일반적인 '세 번째 월요일'인 17일이 아님)", () => {
    expect(getMonthlyHolidayDay(2026, 8)).toBe(10);
  });

  it("2026년 9월은 14일이다", () => {
    expect(getMonthlyHolidayDay(2026, 9)).toBe(14);
  });

  it("2026년 10월은 12일이다", () => {
    expect(getMonthlyHolidayDay(2026, 10)).toBe(12);
  });

  it("결과는 항상 월요일이다 (2026~2027년 전체 월 검증)", () => {
    for (let year = 2026; year <= 2027; year++) {
      for (let month = 1; month <= 12; month++) {
        const day = getMonthlyHolidayDay(year, month);
        const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        expect(weekday, `${year}-${month} → ${day}일`).toBe(1);
      }
    }
  });
});

describe("getMonthlyHoliday", () => {
  it("연/월/일과 함께 라벨을 반환한다", () => {
    expect(getMonthlyHoliday(2026, 8)).toEqual({
      year: 2026,
      month: 8,
      day: 10,
      label: "8월 10일(월)",
    });
  });
});

describe("LUNAR_HOLIDAY_PERIODS — 이번에 넣은 명절 데이터", () => {
  it("추석 연휴(2026-09-24~26)가 들어있다", () => {
    expect(LUNAR_HOLIDAY_PERIODS).toContainEqual({
      name: "추석 연휴",
      startDate: "2026-09-24",
      endDate: "2026-09-26",
    });
  });

  it("설날 연휴(2027-02-06~09, 대체공휴일 포함)가 들어있다", () => {
    expect(LUNAR_HOLIDAY_PERIODS).toContainEqual({
      name: "설날 연휴",
      startDate: "2027-02-06",
      endDate: "2027-02-09",
    });
  });

  it("국경일(개천절·한글날 등)은 들어있지 않다 — 이 사무소는 국경일에 쉬지 않는다", () => {
    const names = LUNAR_HOLIDAY_PERIODS.map((p) => p.name);
    expect(names).not.toContain("개천절");
    expect(names).not.toContain("한글날");
    expect(names).not.toContain("삼일절");
    expect(names).not.toContain("광복절");
    expect(names).not.toContain("어린이날");
  });
});

describe("formatHolidayPeriodRangeLabel", () => {
  it("하루짜리는 날짜 하나만 보여준다", () => {
    expect(
      formatHolidayPeriodRangeLabel({
        name: "개천절",
        startDate: "2026-10-03",
        endDate: "2026-10-03",
      }),
    ).toBe("10월 3일(토)");
  });

  it("같은 달 안이면 끝 날짜의 월을 반복하지 않는다", () => {
    expect(
      formatHolidayPeriodRangeLabel({
        name: "추석 연휴",
        startDate: "2026-09-24",
        endDate: "2026-09-26",
      }),
    ).toBe("9월 24일(목)~26일(토)");
  });

  it("설날 연휴(2027-02-06~09)도 같은 달이라 끝 날짜만 짧게 나온다", () => {
    expect(
      formatHolidayPeriodRangeLabel({
        name: "설날 연휴",
        startDate: "2027-02-06",
        endDate: "2027-02-09",
      }),
    ).toBe("2월 6일(토)~9일(화)");
  });

  it("달이 다르면 양쪽 다 온전한 날짜로 보여준다", () => {
    expect(
      formatHolidayPeriodRangeLabel({
        name: "테스트 연휴",
        startDate: "2026-01-30",
        endDate: "2026-02-02",
      }),
    ).toBe("1월 30일(금)~2월 2일(월)");
  });
});

describe("getUpcomingHolidays — 활성 기간(activePeriod)", () => {
  it("추석 연휴 첫날(9/24)이면 그 기간이 activePeriod다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 9, day: 24 });
    expect(result.activePeriod).toEqual({
      name: "추석 연휴",
      startDate: "2026-09-24",
      endDate: "2026-09-26",
    });
  });

  it("추석 연휴 중간(9/25)에도 activePeriod로 잡힌다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 9, day: 25 });
    expect(result.activePeriod?.name).toBe("추석 연휴");
  });

  it("추석 연휴가 끝난 다음날(9/27)은 activePeriod가 없다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 9, day: 27 });
    expect(result.activePeriod).toBeNull();
  });

  it("매달 셋째 주 월요일 당일(8/10)은 협회 휴무 라벨로 activePeriod가 잡힌다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 8, day: 10 });
    expect(result.activePeriod).toEqual({
      name: ASSOCIATION_HOLIDAY_CONTEXT_LABEL,
      startDate: "2026-08-10",
      endDate: "2026-08-10",
    });
  });

  it("평범한 평일은 activePeriod가 없다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 8, day: 5 });
    expect(result.activePeriod).toBeNull();
  });

  it("개천절(10/3)·한글날(10/9)은 국경일이라 activePeriod가 되지 않는다(정상 영업)", () => {
    expect(getUpcomingHolidays({ year: 2026, month: 10, day: 3 }).activePeriod).toBeNull();
    expect(getUpcomingHolidays({ year: 2026, month: 10, day: 9 }).activePeriod).toBeNull();
  });
});

describe("getUpcomingHolidays — 이번 달/다음 달에 시작하는 것만 upcoming에 담긴다", () => {
  it("추석 당일(9/24) 기준: 추석 연휴 + 다음 달(10월) 협회 휴무만 보이고, 5달 뒤 설날은 안 보인다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 9, day: 24 });
    expect(result.upcoming).toEqual([
      { name: "추석 연휴", startDate: "2026-09-24", endDate: "2026-09-26" },
      { name: ASSOCIATION_HOLIDAY_CONTEXT_LABEL, startDate: "2026-10-12", endDate: "2026-10-12" },
    ]);
    // 설날(2027-02)은 아직 "이번 달/다음 달"이 아니므로 목록에 없어야 한다.
    expect(result.upcoming.some((p) => p.name === "설날 연휴")).toBe(false);
  });

  it("이번 달 협회 휴무가 이미 지났으면(8/15) 다음 달(9월)에 시작하는 것들만 upcoming에 남는다", () => {
    // 8월엔 이미 지난 협회 휴무만 있어 빠지고, 9월(다음 달)엔 협회 휴무와
    // 추석 연휴가 둘 다 시작하므로 둘 다 남는다.
    const result = getUpcomingHolidays({ year: 2026, month: 8, day: 15 });
    expect(result.upcoming).toEqual([
      { name: ASSOCIATION_HOLIDAY_CONTEXT_LABEL, startDate: "2026-09-14", endDate: "2026-09-14" },
      { name: "추석 연휴", startDate: "2026-09-24", endDate: "2026-09-26" },
    ]);
  });

  it("설날이 있는 달(2027-01)이 되면 upcoming에 나타난다", () => {
    const result = getUpcomingHolidays({ year: 2027, month: 1, day: 20 });
    expect(result.upcoming.some((p) => p.name === "설날 연휴")).toBe(true);
  });

  it("12월에서 1월로 넘어갈 때 다음 달 계산이 연도 롤오버를 반영한다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 12, day: 1 });
    const monthlyEntries = result.upcoming.filter(
      (p) => p.name === ASSOCIATION_HOLIDAY_CONTEXT_LABEL,
    );
    expect(monthlyEntries.some((p) => p.startDate.startsWith("2027-01"))).toBe(true);
  });
});
