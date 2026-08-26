import { describe, expect, it } from "vitest";
import { buildAllAdCopyFormats, type AdCopyListingInput } from "../adCopy";

const BASE: AdCopyListingInput = {
  id: "listing-1",
  complexName: "호수마을e편한세상2단지",
  complexAddress: "경기도 김포시 구래동 6874-17",
  transactionType: "매매",
  priceLabel: "4억 1,000만원",
  building: "203동",
  floor: 11,
  totalFloors: 20,
  supplyArea: 109.87,
  exclusiveArea: 84.97,
  unitType: "109C",
  direction: "남동향",
  roomCount: 3,
  bathroomCount: 2,
  moveInDate: "즉시입주",
  maintenanceFee: "25만원",
  shortDescription: "판상형 현관창고 중문등상태굿 공원뷰굿",
  features: ["판상형", "현관창고", "공원뷰굿"],
  hasPhoto: true,
  pageUrl: "https://hosooingurae.vercel.app/listings/listing-1",
};

/** 원문에서 못 읽어 0으로 저장된 매물. floor/totalFloors/면적/방/욕실 전부 0. */
const ALL_UNKNOWN: AdCopyListingInput = {
  ...BASE,
  floor: 0,
  totalFloors: 0,
  supplyArea: 0,
  exclusiveArea: 0,
  roomCount: 0,
  bathroomCount: 0,
  unitType: undefined,
};

/** 층수만 못 읽고 나머지는 정상 파싱된 매물(가장 흔한 패턴). */
const FLOOR_UNKNOWN: AdCopyListingInput = {
  ...BASE,
  floor: 0,
  totalFloors: 0,
};

describe("buildAllAdCopyFormats — 0/null 값이 광고문구에 숫자 그대로 노출되지 않는다", () => {
  it("정상 매물은 실제 값을 그대로 보여준다", () => {
    const formats = buildAllAdCopyFormats(BASE);
    expect(formats.sms).toContain("203동 11층/20층");
    expect(formats.general).toContain("공급 109.87㎡ / 전용 84.97㎡");
    expect(formats.general).toContain("방 3개 / 욕실 2개");
  });

  it("층수를 모르면 0층 대신 항목 자체가 빠진다", () => {
    const formats = buildAllAdCopyFormats(FLOOR_UNKNOWN);
    for (const text of Object.values(formats)) {
      expect(text).not.toContain("0층");
    }
    expect(formats.sms).toContain("203동");
    expect(formats.sms).not.toMatch(/203동 \d+층/);
  });

  it("모든 수치를 모르는 매물도 0이 숫자 그대로 노출되지 않는다", () => {
    const formats = buildAllAdCopyFormats(ALL_UNKNOWN);
    for (const text of Object.values(formats)) {
      expect(text).not.toMatch(/\b0층\b/);
      expect(text).not.toMatch(/\b0㎡/);
      expect(text).not.toMatch(/\b0개\b/);
    }
  });

  it("면적을 모두 모르면 면적 줄 자체가 빠지고, 문장이 어색하게 끊기지 않는다", () => {
    const formats = buildAllAdCopyFormats(ALL_UNKNOWN);
    expect(formats.general).not.toContain("공급 ");
    expect(formats.general).not.toContain("전용 ");
    // 줄이 통째로 빠져도 나머지 줄 구조(빈 줄 없이 이어짐)가 깨지지 않는다.
    expect(formats.general.split("\n").some((line) => line.trim() === "")).toBe(
      true,
    );
  });
});

describe("실제 출력 예시", () => {
  it("예시 1 — 정상 매물 (sms)", () => {
    const formats = buildAllAdCopyFormats(BASE);
    console.log("\n[예시 1: 정상 매물, sms]\n" + formats.sms);
    expect(formats.sms).toMatchInlineSnapshot(`
      "[호수공인중개사사무소]
      호수마을e편한세상2단지 매매 4억 1,000만원
      203동 11층/20층
      판상형, 현관창고, 공원뷰굿
      ☎ 031-998-4556
      https://hosooingurae.vercel.app/listings/listing-1"
    `);
  });

  it("예시 2 — 층수만 미확인 (general)", () => {
    const formats = buildAllAdCopyFormats(FLOOR_UNKNOWN);
    console.log("\n[예시 2: 층수만 미확인, general]\n" + formats.general);
    expect(formats.general).toMatchInlineSnapshot(`
      "호수마을e편한세상2단지 매매 4억 1,000만원
      203동
      109C · 공급 109.87㎡ / 전용 84.97㎡
      방향 남동향 · 방 3개 / 욕실 2개 · 입주 즉시입주

      판상형 현관창고 중문등상태굿 공원뷰굿

      호수공인중개사사무소 031-998-4556
      https://hosooingurae.vercel.app/listings/listing-1"
    `);
  });

  it("예시 3 — 전부 미확인 (general)", () => {
    const formats = buildAllAdCopyFormats(ALL_UNKNOWN);
    console.log("\n[예시 3: 전부 미확인, general]\n" + formats.general);
    expect(formats.general).toMatchInlineSnapshot(`
      "호수마을e편한세상2단지 매매 4억 1,000만원
      203동
      방향 남동향 · 입주 즉시입주

      판상형 현관창고 중문등상태굿 공원뷰굿

      호수공인중개사사무소 031-998-4556
      https://hosooingurae.vercel.app/listings/listing-1"
    `);
  });
});
