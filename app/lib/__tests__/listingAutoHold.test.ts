import { describe, expect, it } from "vitest";
import type { DealStatus } from "../../data/listings";
import type { ListingWithComplex } from "../listings";
import {
  AUTO_HOLD_STALE_DAYS,
  findAutoHoldCandidates,
  isEligibleForAutoHold,
} from "../listingAutoHold";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-02T00:00:00.000Z").getTime();

function isoDaysBefore(days: number): string {
  return new Date(NOW - days * MS_PER_DAY).toISOString();
}

let nextId = 1;

function makeListing(overrides: {
  dealStatus?: DealStatus;
  lastVerifiedAt?: string;
  complexName?: string;
}): ListingWithComplex {
  const id = `listing-${nextId++}`;
  return {
    id,
    complexId: "complex-1",
    complex: {
      id: "complex-1",
      name: overrides.complexName ?? "호수마을e편한세상2단지",
      address: "",
      propertyType: "아파트",
      nearbySchools: [],
      transportation: {},
      features: [],
    },
    propertyType: "아파트",
    status: "published",
    dealStatus: overrides.dealStatus ?? "advertising",
    transactionType: "매매",
    price: 40000,
    priceLabel: "4억원",
    building: "302동",
    floor: 6,
    totalFloors: 26,
    supplyArea: 108.6,
    exclusiveArea: 84.64,
    roomCount: 3,
    bathroomCount: 2,
    direction: "남향",
    moveInDate: "즉시입주",
    hasLoan: false,
    loanAmount: null,
    shortDescription: "",
    features: [],
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastVerifiedAt: overrides.lastVerifiedAt,
  };
}

describe("isEligibleForAutoHold — 날짜 경계", () => {
  // "90일 초과"는 경과일이 90보다 커야(> 90) 대상입니다. 정확히 90일째는
  // 아직 포함하지 않고, 91일째부터 포함합니다 — 이 세 테스트가 그 경계를
  // 고정합니다. now를 고정값으로 넘겨서 실행 시점과 무관하게 항상 같은
  // 결과가 나오게 합니다.
  it("값이 없으면(null/undefined) 항상 제외한다", () => {
    expect(isEligibleForAutoHold(undefined, NOW)).toBe(false);
  });

  it(`${AUTO_HOLD_STALE_DAYS - 1}일(89일) 경과는 아직 대상이 아니다`, () => {
    expect(isEligibleForAutoHold(isoDaysBefore(AUTO_HOLD_STALE_DAYS - 1), NOW)).toBe(false);
  });

  it(`${AUTO_HOLD_STALE_DAYS}일(90일, 경계값) 경과도 아직 대상이 아니다`, () => {
    expect(isEligibleForAutoHold(isoDaysBefore(AUTO_HOLD_STALE_DAYS), NOW)).toBe(false);
  });

  it(`${AUTO_HOLD_STALE_DAYS + 1}일(91일) 경과부터 대상이다`, () => {
    expect(isEligibleForAutoHold(isoDaysBefore(AUTO_HOLD_STALE_DAYS + 1), NOW)).toBe(true);
  });
});

describe("findAutoHoldCandidates — advertising만, negotiating/completed/hold는 절대 건드리지 않음", () => {
  const staleDate = isoDaysBefore(AUTO_HOLD_STALE_DAYS + 1);

  it("advertising이고 91일 경과한 매물만 대상으로 뽑는다", () => {
    const target = makeListing({ dealStatus: "advertising", lastVerifiedAt: staleDate });
    const fresh = makeListing({ dealStatus: "advertising", lastVerifiedAt: isoDaysBefore(10) });
    const candidates = findAutoHoldCandidates([target, fresh], NOW);
    expect(candidates.map((c) => c.id)).toEqual([target.id]);
    expect(candidates[0].daysSinceVerified).toBe(AUTO_HOLD_STALE_DAYS + 1);
    expect(candidates[0].complexName).toBe("호수마을e편한세상2단지");
  });

  it.each(["negotiating", "completed", "hold"] as DealStatus[])(
    "%s 상태는 91일이 지났어도 대상에서 제외한다",
    (dealStatus) => {
      const listing = makeListing({ dealStatus, lastVerifiedAt: staleDate });
      expect(findAutoHoldCandidates([listing], NOW)).toHaveLength(0);
    },
  );

  it("last_verified_at이 없는 매물은 아무리 오래됐어도 대상에서 제외한다", () => {
    const listing = makeListing({ dealStatus: "advertising", lastVerifiedAt: undefined });
    expect(findAutoHoldCandidates([listing], NOW)).toHaveLength(0);
  });
});
