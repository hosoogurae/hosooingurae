import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatFloor,
  formatFloorForSentence,
  formatFloorRange,
  formatMaintenanceFee,
  formatParking,
  formatRooms,
} from "../format/listingFields";

describe("formatFloor", () => {
  it("0을 층 정보 문의로 표시한다", () => {
    expect(formatFloor(0)).toBe("층 정보 문의");
  });

  it("null/undefined도 층 정보 문의로 표시한다", () => {
    expect(formatFloor(null)).toBe("층 정보 문의");
    expect(formatFloor(undefined)).toBe("층 정보 문의");
  });

  it("실제 값은 숫자 그대로 층 단위로 표시한다", () => {
    expect(formatFloor(11)).toBe("11층");
  });
});

describe("formatFloorRange", () => {
  it("현재층이 0이면 전체층과 관계없이 층 정보 문의를 반환한다", () => {
    expect(formatFloorRange(0, 20)).toBe("층 정보 문의");
    expect(formatFloorRange(0, 0)).toBe("층 정보 문의");
  });

  it("전체층만 0이면 현재층만 표시한다", () => {
    expect(formatFloorRange(11, 0)).toBe("11층");
  });

  it("둘 다 있으면 함께 표시한다", () => {
    expect(formatFloorRange(11, 20)).toBe("11층 / 20층");
  });
});

describe("formatArea", () => {
  it("0을 면적 문의로 표시한다", () => {
    expect(formatArea(0)).toBe("면적 문의");
  });

  it("null/undefined도 면적 문의로 표시한다", () => {
    expect(formatArea(null)).toBe("면적 문의");
    expect(formatArea(undefined)).toBe("면적 문의");
  });

  it("실제 값은 prefix와 함께 ㎡ 단위로 표시한다", () => {
    expect(formatArea(84.97)).toBe("84.97㎡");
    expect(formatArea(84.97, "전용 ")).toBe("전용 84.97㎡");
  });
});

describe("formatRooms", () => {
  it("0/null/undefined는 모두 문의로 표시한다", () => {
    expect(formatRooms(0)).toBe("문의");
    expect(formatRooms(null)).toBe("문의");
    expect(formatRooms(undefined)).toBe("문의");
  });

  it("실제 값은 개 단위로 표시한다", () => {
    expect(formatRooms(3)).toBe("3개");
  });
});

describe("formatMaintenanceFee", () => {
  it("0은 관리비 없음으로, null/undefined는 문의로 구분한다", () => {
    expect(formatMaintenanceFee(0)).toBe("관리비 없음");
    expect(formatMaintenanceFee(null)).toBe("문의");
    expect(formatMaintenanceFee(undefined)).toBe("문의");
  });

  it("실제 값은 원 단위로 표시한다", () => {
    expect(formatMaintenanceFee(250000)).toBe("250,000원");
  });
});

describe("formatParking", () => {
  it("0은 주차 불가로, null/undefined는 문의로 구분한다", () => {
    expect(formatParking(0)).toBe("주차 불가");
    expect(formatParking(null)).toBe("문의");
    expect(formatParking(undefined)).toBe("문의");
  });

  it("실제 값은 대 단위로 표시한다", () => {
    expect(formatParking(1569)).toBe("1,569대");
  });
});

describe("formatFloorForSentence", () => {
  it("0/null/undefined는 문장에서 생략할 수 있도록 null을 반환한다", () => {
    expect(formatFloorForSentence(0)).toBeNull();
    expect(formatFloorForSentence(null)).toBeNull();
    expect(formatFloorForSentence(undefined)).toBeNull();
  });

  it("실제 값은 층 단위 문자열을 반환한다", () => {
    expect(formatFloorForSentence(11)).toBe("11층");
  });
});
