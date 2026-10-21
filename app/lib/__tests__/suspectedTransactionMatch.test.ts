import { describe, expect, it } from "vitest";
import type { Listing } from "../../data/listings";
import type { MolitAptTradeItem } from "../molit";
import { findSuspectedMatchesForComplex, isEligibleForSuspectedMatchCheck,
  SUSPECTED_AREA_TOLERANCE_SQM, SUSPECTED_PRICE_TOLERANCE_RATIO } from "../suspectedTransactionMatch";

function listing(overrides: Partial<Listing> = {}): Listing {
  return { id: "listing-1", complexId: "complex-1", propertyType: "아파트", status: "published",
    dealStatus: "advertising", transactionType: "매매", price: 42000, priceLabel: "4억 2,000만원",
    building: "101동", floor: 10, totalFloors: 20, supplyArea: 109, exclusiveArea: 84.8,
    roomCount: 3, bathroomCount: 2, direction: "남향", moveInDate: "즉시입주", hasLoan: false,
    loanAmount: null, shortDescription: "", features: [], isFeatured: false,
    // 기본 trade()의 dealDate("2026-06-01")보다 앞선 날짜 — (가) 조건을
    // 기본으로 만족시켜, 이 조건과 무관한 기존 테스트들이 계속 통과하게 함.
    lastVerifiedAt: "2026-05-01", ...overrides };
}
function trade(overrides: Partial<MolitAptTradeItem> = {}): MolitAptTradeItem {
  return { aptNm: "테스트단지", aptSeq: "41570-1000", jibun: "1-1", umdNm: "구래동",
    buildYear: 2020,
    aptDong: "101", floor: 10, excluUseAr: 84.8, dealAmount: 43000,
    dealDate: "2026-06-01", cdealType: "", ...overrides };
}

describe("거래 의심 판정", () => {
  it("광고·협의 중인 매매만 검사한다", () => {
    expect(isEligibleForSuspectedMatchCheck(listing())).toBe(true);
    expect(isEligibleForSuspectedMatchCheck(listing({ transactionType: "전세" }))).toBe(false);
    expect(isEligibleForSuspectedMatchCheck(listing({ dealStatus: "completed" }))).toBe(false);
  });
  it("면적 ±0.5㎡, 같은 층, 가격 ±10%이면 감지하고 근거를 제공한다", () => {
    expect(SUSPECTED_AREA_TOLERANCE_SQM).toBe(0.5);
    expect(SUSPECTED_PRICE_TOLERANCE_RATIO).toBe(0.1);
    const [match] = findSuspectedMatchesForComplex([listing()], [trade()]);
    expect(match.reason).toBe("단지·거래유형·면적·층·가격이 유사하여 감지됨");
    expect(match.matchKey).toContain("listing-1|41570-1000");
  });
  it("층이 다르거나 가격 차이가 10%를 넘으면 제외한다", () => {
    expect(findSuspectedMatchesForComplex([listing()], [trade({ floor: 11 })])).toHaveLength(0);
    expect(findSuspectedMatchesForComplex([listing()], [trade({ dealAmount: 47000 })])).toHaveLength(0);
  });
  it("해제 거래를 제외한다", () => {
    expect(findSuspectedMatchesForComplex([listing()], [trade({ cdealType: "O" })])).toHaveLength(0);
  });
  it("동일 조합을 중복 집계하지 않는다", () => {
    const same = trade();
    expect(findSuspectedMatchesForComplex([listing()], [same, { ...same }])).toHaveLength(1);
  });
});

describe("거래 의심 판정 — (가) 거래일이 last_verified_at보다 뒤인 것만", () => {
  // 2026-10-20 조사: 이 조건이 없었을 때 대상 134건 중 95건(71%)이
  // 의심으로 떴고, 그중 67건이 "호수마을e편한세상2단지 85㎡" 한
  // 조합이었는데 그 조합은 12개월 실거래가 43건뿐이었습니다(43건으로
  // 67채가 팔릴 수 없음). 이 조건과 (나)는 그 노이즈를 줄이기 위해
  // 일부러 좁게 잡은 것이라, 아래 테스트가 깨졌다고 조건을 되돌리면 안
  // 됩니다 — suspectedTransactionMatch.ts 상단 주석 참고.
  it("거래일이 확인일보다 앞서면 제외한다(그 집이 아니라 다른 집이 팔린 것)", () => {
    const l = listing({ lastVerifiedAt: "2026-06-15" });
    const t = trade({ dealDate: "2026-06-01" }); // 확인일보다 앞섬
    expect(findSuspectedMatchesForComplex([l], [t])).toHaveLength(0);
  });

  it("거래일이 확인일보다 뒤면 인정한다", () => {
    const l = listing({ lastVerifiedAt: "2026-06-01" });
    const t = trade({ dealDate: "2026-06-15" }); // 확인일보다 뒤
    expect(findSuspectedMatchesForComplex([l], [t])).toHaveLength(1);
  });

  it("경계: 거래일과 확인일이 같은 날이면 제외한다(모호하면 말하지 않음)", () => {
    const l = listing({ lastVerifiedAt: "2026-06-10" });
    const t = trade({ dealDate: "2026-06-10" }); // 같은 날
    expect(findSuspectedMatchesForComplex([l], [t])).toHaveLength(0);
  });

  it("last_verified_at이 없으면(한 번도 확인 안 함) 항상 제외한다", () => {
    const l = listing({ lastVerifiedAt: undefined });
    expect(findSuspectedMatchesForComplex([l], [trade()])).toHaveLength(0);
  });
});

describe("거래 의심 판정 — (나) 같은 단지·면적·층에 매물이 1건뿐일 때만", () => {
  it("호수마을e편한세상2단지처럼 같은 층에 여러 채가 걸리면(구별 불가) 전부 제외한다", () => {
    const a = listing({ id: "a", floor: 10, exclusiveArea: 84.64 });
    const b = listing({ id: "b", floor: 10, exclusiveArea: 84.71 }); // ±0.5㎡ 안 — 같은 평형으로 취급
    expect(findSuspectedMatchesForComplex([a, b], [trade()])).toHaveLength(0);
  });

  it("같은 단지라도 층이 다르면 서로 다른 그룹이라 걸리지 않는다", () => {
    const a = listing({ id: "a", floor: 10 });
    const b = listing({ id: "b", floor: 11 });
    const result = findSuspectedMatchesForComplex([a, b], [trade({ floor: 10 })]);
    expect(result.map((m) => m.listingId)).toEqual(["a"]);
  });

  it("같은 조합이라도 매물이 1건뿐이면 인정한다", () => {
    expect(findSuspectedMatchesForComplex([listing()], [trade()])).toHaveLength(1);
  });

  it("전달받은 listings 배열에 있는 매물은 거래완료 상태여도 그룹 집계에 포함된다", () => {
    // 실제 운영 호출(app/api/admin/listings/suspected-matches/route.ts)은 이 함수에
    // 넘기기 전에 이미 advertising/negotiating만 추려서 넘기지만, 이 함수 자체는
    // 전달받은 listings를 그대로 "같은 유닛이 몇 채냐"의 기준으로 쓴다는 걸
    // 고정해둡니다 — 호출부 필터링에 의존하지 않는 동작입니다.
    const a = listing({ id: "a", floor: 10 });
    const b = listing({ id: "b", floor: 10, dealStatus: "completed" });
    expect(findSuspectedMatchesForComplex([a, b], [trade()])).toHaveLength(0);
  });
});
