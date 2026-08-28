import { describe, expect, it } from "vitest";
import { getMonthlyHoliday, getMonthlyHolidayDay, getUpcomingHolidays } from "../holiday";

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

describe("getUpcomingHolidays", () => {
  it("휴무일 이전이면 이번 달과 다음 달 휴무일을 모두 반환한다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 8, day: 5 });
    expect(result.todayIsHoliday).toBe(false);
    expect(result.thisMonth).toEqual({
      year: 2026,
      month: 8,
      day: 10,
      label: "8월 10일(월)",
    });
    expect(result.next).toEqual({
      year: 2026,
      month: 9,
      day: 14,
      label: "9월 14일(월)",
    });
  });

  it("휴무일 당일이면 todayIsHoliday가 true이고 thisMonth도 그대로 남는다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 8, day: 10 });
    expect(result.todayIsHoliday).toBe(true);
    expect(result.thisMonth?.day).toBe(10);
  });

  it("이번 달 휴무일이 지났으면 thisMonth는 null이고 다음 달만 남는다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 8, day: 15 });
    expect(result.todayIsHoliday).toBe(false);
    expect(result.thisMonth).toBeNull();
    expect(result.next).toEqual({
      year: 2026,
      month: 9,
      day: 14,
      label: "9월 14일(월)",
    });
  });

  it("12월에서 1월로 넘어갈 때 연도가 롤오버된다", () => {
    const result = getUpcomingHolidays({ year: 2026, month: 12, day: 1 });
    expect(result.next.year).toBe(2027);
    expect(result.next.month).toBe(1);
  });
});
