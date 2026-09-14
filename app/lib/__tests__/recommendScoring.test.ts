import { describe, expect, it } from "vitest";
import type { Complex } from "../../data/complexes";
import type { Listing } from "../../data/listings";
import type { ListingWithComplex } from "../listings";
import type { ParsedQuery } from "../recommend/queryParser";
import { rankListings } from "../recommend/scoring";

const BASE_COMPLEX: Complex = {
  id: "complex-1",
  name: "테스트단지",
  address: "경기도 김포시 구래동 1-1",
  nearbySchools: [],
  transportation: {},
  features: [],
};

let nextId = 1;

function buildListing(overrides: Partial<ListingWithComplex> = {}): ListingWithComplex {
  const id = overrides.id ?? `listing-${nextId++}`;
  const base: Listing & { complex: Complex } = {
    id,
    complexId: BASE_COMPLEX.id,
    propertyType: "아파트",
    status: "published",
    dealStatus: "advertising",
    transactionType: "매매",
    price: 40000,
    priceLabel: "4억원",
    building: "101동",
    floor: 10,
    totalFloors: 20,
    supplyArea: 109,
    exclusiveArea: 84,
    roomCount: 3,
    bathroomCount: 2,
    direction: "남향",
    moveInDate: "즉시입주",
    hasLoan: false,
    loanAmount: null,
    shortDescription: "테스트 매물",
    features: [],
    isFeatured: false,
    complex: BASE_COMPLEX,
  };
  return { ...base, ...overrides, id };
}

function buildQuery(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {
    raw: "",
    normalizedIntents: [],
    unrecognizedPhrases: [],
    ...overrides,
  };
}

function ids(listings: { listing: ListingWithComplex }[]): string[] {
  return listings.map((r) => r.listing.id);
}

describe("rankListings — 예산 하드필터 + 근접초과(nearMiss)", () => {
  it("'매매 4억 이하'에서 4억2천 매물은 results에 없고 nearMisses에 있다(허용오차 경계 이내)", () => {
    const withinBudget = buildListing({ id: "within", price: 39000 });
    const over = buildListing({ id: "over-4200", price: 42000 }); // 초과 2000만원 = 4억*5% (경계)

    const query = buildQuery({
      transactionType: "매매",
      price: { min: 0, max: 40000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([withinBudget, over], query);

    expect(ids(result.results)).toContain("within");
    expect(ids(result.results)).not.toContain("over-4200");
    expect(ids(result.nearMisses)).toContain("over-4200");
    expect(result.nearMisses[0].violation.direction).toBe("over");
  });

  it("results가 있을 때는 허용오차를 넘는 매물이 nearMisses에도 없다(완전 제외)", () => {
    // results가 0건이면 허용오차 없이 초과 매물을 전부 nearMisses로 채우는
    // 폴백이 작동하므로, 이 테스트는 그 폴백이 아니라 "정상적으로 예산 안의
    // 매물이 있는" 경로에서 허용오차가 실제로 걸러내는지를 확인해야 한다.
    const withinBudget = buildListing({ id: "within-budget", price: 38000 });
    const farOver = buildListing({ id: "over-4500", price: 45000 }); // 초과 5000만원 > 2000만원 허용오차

    const query = buildQuery({
      transactionType: "매매",
      price: { min: 0, max: 40000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([withinBudget, farOver], query);

    expect(result.results.length).toBeGreaterThan(0);
    expect(ids(result.results)).not.toContain("over-4500");
    expect(ids(result.nearMisses)).not.toContain("over-4500");
  });

  it("nearMisses는 results와 겹치지 않는다", () => {
    const within1 = buildListing({ id: "within-1", price: 38000 });
    const within2 = buildListing({ id: "within-2", price: 39500 });
    const nearMiss = buildListing({ id: "near-miss", price: 41500 });

    const query = buildQuery({
      transactionType: "매매",
      price: { min: 0, max: 40000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([within1, within2, nearMiss], query);

    const resultIds = new Set(ids(result.results));
    const nearMissIds = new Set(ids(result.nearMisses));
    for (const id of nearMissIds) {
      expect(resultIds.has(id)).toBe(false);
    }
  });

  it("results가 0건이고 거래유형이 맞는 매물이 있으면(허용오차 밖이어도) nearMisses가 비어 있지 않다", () => {
    // 전세 매물 3건이 전부 3억 하드 상한(허용오차 1500만원)을 크게 넘는
    // 실제 사고 사례(3.2억/3.5억/3.5억)를 재현한다 — 빈 화면을 보여주느니
    // 초과 사실을 밝히고 가장 가까운 매물을 보여줘야 한다.
    const jeonse1 = buildListing({ id: "jeonse-32", transactionType: "전세", price: 32000 });
    const jeonse2 = buildListing({ id: "jeonse-35a", transactionType: "전세", price: 35000 });
    const jeonse3 = buildListing({ id: "jeonse-35b", transactionType: "전세", price: 35000 });

    const query = buildQuery({
      transactionType: "전세",
      price: { min: 0, max: 30000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([jeonse1, jeonse2, jeonse3], query);

    expect(result.results.length).toBe(0);
    expect(result.nearMisses.length).toBeGreaterThan(0);
    // 가장 예산에 가까운(3.2억) 매물이 1순위로 온다.
    expect(result.nearMisses[0].listing.id).toBe("jeonse-32");
  });

  it("results가 0건일 때 nearMisses의 각 항목에 violation.detail이 채워져 있다", () => {
    const jeonse = buildListing({ id: "jeonse-32", transactionType: "전세", price: 32000 });

    const query = buildQuery({
      transactionType: "전세",
      price: { min: 0, max: 30000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([jeonse], query);

    expect(result.results.length).toBe(0);
    expect(result.nearMisses.length).toBeGreaterThan(0);
    for (const nearMiss of result.nearMisses) {
      expect(nearMiss.violation.detail).toBeTruthy();
      expect(nearMiss.violation.amountManwon).toBeGreaterThan(0);
    }
  });

  it("results가 0건이어도 거래유형이 다른 매물은 nearMisses 폴백에도 들어가지 않는다", () => {
    const wrongType = buildListing({ id: "wrong-type", transactionType: "매매", price: 30000 });

    const query = buildQuery({
      transactionType: "전세",
      price: { min: 0, max: 30000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([wrongType], query);

    expect(result.results.length).toBe(0);
    expect(ids(result.nearMisses)).not.toContain("wrong-type");
  });

  it("'3억 초반'(하한 padding·상한 3.3억 constraint)으로 검색 시 3.5억 매물이 results에 없다", () => {
    const tooExpensive = buildListing({ id: "listing-35", price: 35000 });

    const query = buildQuery({
      transactionType: "매매",
      price: {
        min: 30000,
        max: 33000,
        openEnded: false,
        minSource: "padding",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([tooExpensive], query);

    expect(ids(result.results)).not.toContain("listing-35");
  });

  it("'3억 이상'(하한 constraint·상한 padding)으로 검색 시 6.5억 매물이 결과에서 제외되지 않는다", () => {
    const expensive = buildListing({ id: "listing-65", price: 65000 });

    const query = buildQuery({
      transactionType: "매매",
      price: {
        min: 30000,
        max: 60000, // 패딩된 상한(amount*2) — 하드필터 대상 아님
        openEnded: true,
        minSource: "constraint",
        maxSource: "padding",
        interpretation: "",
      },
    });

    const result = rankListings([expensive], query);

    expect(ids(result.results)).toContain("listing-65");
  });

  it("'3억5000'(콕 집은 금액, 상하한 모두 constraint)으로 검색 시 하한도 실제로 걸린다", () => {
    // queryParser.ts의 exact 분기(minSource: constraint로 변경됨)를 그대로
    // 재현한다 — 손님이 특정 금액을 찍어 말했으면 그 근처(±1000만원)만
    // 나와야 하고, 한참 싼 매물이 섞여 나오면 안 된다.
    const withinRange = buildListing({ id: "within-34500", price: 34500 });
    const farUnder = buildListing({ id: "under-30000", price: 30000 }); // 4000만원 부족 > 1700만원 허용오차

    const query = buildQuery({
      transactionType: "매매",
      price: {
        min: 34000,
        max: 36000,
        openEnded: false,
        minSource: "constraint",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([withinRange, farUnder], query);

    expect(ids(result.results)).toContain("within-34500");
    expect(ids(result.results)).not.toContain("under-30000");
    expect(ids(result.nearMisses)).not.toContain("under-30000");
  });
});

describe("rankListings — resultsAreFull은 고정 상수가 아니라 실제 limit에 연동된다", () => {
  it("results가 limit만큼 꽉 차면 resultsAreFull이 true다", () => {
    const listings = [
      buildListing({ id: "l1", price: 38000 }),
      buildListing({ id: "l2", price: 38500 }),
    ];
    const query = buildQuery({
      transactionType: "매매",
      price: { min: 0, max: 40000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings(listings, query, 2, 3);

    expect(result.results.length).toBe(2);
    expect(result.resultsAreFull).toBe(true);
  });

  it("같은 매물 수라도 limit이 더 크면 resultsAreFull이 false다", () => {
    const listings = [
      buildListing({ id: "l1", price: 38000 }),
      buildListing({ id: "l2", price: 38500 }),
    ];
    const query = buildQuery({
      transactionType: "매매",
      price: { min: 0, max: 40000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings(listings, query, 10, 3);

    expect(result.results.length).toBe(2);
    expect(result.resultsAreFull).toBe(false);
  });

  it("거래유형 미지정 시(그룹 모드)에도 그룹 합계 기준으로 resultsAreFull을 계산한다", () => {
    const listings = [
      buildListing({ id: "l1", transactionType: "매매", price: 38000 }),
      buildListing({ id: "l2", transactionType: "전세", price: 20000 }),
    ];
    const query = buildQuery({ roomCount: 3 }); // transactionType 미지정 → 그룹 모드

    const result = rankListings(listings, query, 2, 3);

    expect(result.results).toEqual([]);
    expect(result.resultGroups.reduce((sum, g) => sum + g.results.length, 0)).toBe(2);
    expect(result.resultsAreFull).toBe(true);
  });
});

describe("rankListings — 거래유형/매물종류 하드필터", () => {
  it("거래유형 불일치 매물은 results와 nearMisses 어디에도 없다", () => {
    const wrongType = buildListing({ id: "wrong-type", transactionType: "전세", price: 30000 });

    const query = buildQuery({
      transactionType: "매매",
      price: { min: 0, max: 40000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([wrongType], query);

    expect(ids(result.results)).not.toContain("wrong-type");
    expect(ids(result.nearMisses)).not.toContain("wrong-type");
  });

  it("매물종류 불일치 매물도 완전히 제외된다", () => {
    const shop = buildListing({ id: "shop-1", propertyType: "상가" });

    const query = buildQuery({ propertyType: "아파트" });

    const result = rankListings([shop], query);

    expect(ids(result.results)).not.toContain("shop-1");
    expect(ids(result.nearMisses)).not.toContain("shop-1");
  });
});

describe("rankListings — unknown 조건은 분모에서 빠진다", () => {
  it("역/학교 정보가 없는 단지는 해당 조건이 satisfiedCount/totalCount에서 빠지고 unknownCount에 잡힌다", () => {
    const noDataComplex: Complex = { ...BASE_COMPLEX, nearbySchools: [], transportation: {} };
    const listing = buildListing({ id: "no-data", complex: noDataComplex });

    const query = buildQuery({
      transactionType: "매매",
      wantsStationProximity: true,
      schoolLevel: "초등학교",
    });

    const result = rankListings([listing], query);
    const ranked = result.results.find((r) => r.listing.id === "no-data");

    expect(ranked).toBeDefined();
    expect(ranked!.unknownCount).toBe(2);
    expect(ranked!.totalCount).toBe(0);
    expect(ranked!.satisfiedCount).toBe(0);
    expect(ranked!.criteria.every((c) => c.unknown)).toBe(true);
  });

  it("월세 매물은 가격 조건이 unknown으로 집계되고 분모에서 빠진다", () => {
    const monthlyRent = buildListing({
      id: "monthly-rent",
      transactionType: "월세",
      price: 3000, // 보증금(만원) — query.price와 스케일이 다를 수 있음
    });

    const query = buildQuery({
      transactionType: "월세",
      price: { min: 0, max: 5000, openEnded: false, minSource: "padding", maxSource: "constraint", interpretation: "" },
    });

    const result = rankListings([monthlyRent], query);
    const ranked = result.results.find((r) => r.listing.id === "monthly-rent");

    expect(ranked).toBeDefined();
    const priceCriterion = ranked!.criteria.find((c) => c.key === "price");
    expect(priceCriterion?.unknown).toBe(true);
    expect(ranked!.unknownCount).toBeGreaterThanOrEqual(1);
    expect(ranked!.totalCount).toBe(0);
  });
});

describe("rankListings — 거래유형 미지정 시 유형별 묶음(resultGroups)", () => {
  it("'구래역 가까운 4억대 아파트' 재현 — 매매/전세가 한 목록에 섞이지 않는다(회귀)", () => {
    // 실제 사고 사례: transactionType 미지정 + "4억대"(하한 padding, 40000~49000)로
    // 검색했을 때 3.3억 전세가 4.2억 매매와 한 목록에 섞여 나왔다. 이제는
    // 유형별로 나뉘어야 하고, 각 묶음 안에는 그 유형만 있어야 한다.
    const maemae = buildListing({ id: "maemae-42000", transactionType: "매매", price: 42000 });
    const jeonse = buildListing({ id: "jeonse-33000", transactionType: "전세", price: 33000 });

    const query = buildQuery({
      price: {
        min: 40000,
        max: 49000,
        openEnded: false,
        minSource: "padding",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([maemae, jeonse], query);

    expect(result.results).toEqual([]); // 그룹 모드에선 항상 빈 배열
    expect(result.resultGroups.map((g) => g.transactionType).sort()).toEqual(["매매", "전세"]);

    const maemaeGroup = result.resultGroups.find((g) => g.transactionType === "매매");
    const jeonseGroup = result.resultGroups.find((g) => g.transactionType === "전세");
    expect(maemaeGroup?.results.every((r) => r.listing.transactionType === "매매")).toBe(true);
    expect(jeonseGroup?.results.every((r) => r.listing.transactionType === "전세")).toBe(true);
  });

  it("'4억대 매매'(거래유형 명시) — 그룹화되지 않고 매매만 나온다(회귀)", () => {
    const maemae = buildListing({ id: "maemae-42000", transactionType: "매매", price: 42000 });
    const jeonse = buildListing({ id: "jeonse-33000", transactionType: "전세", price: 33000 });

    const query = buildQuery({
      transactionType: "매매",
      price: {
        min: 40000,
        max: 49000,
        openEnded: false,
        minSource: "padding",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([maemae, jeonse], query);

    expect(result.resultGroups).toEqual([]);
    expect(ids(result.results)).toEqual(["maemae-42000"]);
  });

  it("배분받은 몫보다 후보가 적은 그룹의 남는 자리를 다른 그룹에 돌려줘 총 5건을 채운다", () => {
    const maemaeListings = [1, 2, 3, 4].map((n) =>
      buildListing({ id: `maemae-${n}`, transactionType: "매매", price: 38000 + n * 100 }),
    );
    const jeonseListings = [buildListing({ id: "jeonse-1", transactionType: "전세", price: 25000 })];

    const query = buildQuery({ roomCount: 3 }); // transactionType 미지정 → 그룹 모드, 후보 전원 통과

    const result = rankListings([...maemaeListings, ...jeonseListings], query, 5, 3);

    const maemaeGroup = result.resultGroups.find((g) => g.transactionType === "매매");
    const jeonseGroup = result.resultGroups.find((g) => g.transactionType === "전세");
    // 원래 배분은 3/2이지만 전세 후보가 1건뿐이라 남는 1자리를 매매로 돌려 4/1(총 5).
    expect(maemaeGroup?.results.length).toBe(4);
    expect(jeonseGroup?.results.length).toBe(1);
  });

  it("그래도 못 채우면(전체 후보가 limit보다 적으면) 적게 나온다", () => {
    const maemae = buildListing({ id: "maemae-1", transactionType: "매매", price: 38000 });
    const jeonse = buildListing({ id: "jeonse-1", transactionType: "전세", price: 25000 });

    const query = buildQuery({ roomCount: 3 });

    const result = rankListings([maemae, jeonse], query, 5, 3);

    const total = result.resultGroups.reduce((sum, g) => sum + g.results.length, 0);
    expect(total).toBe(2);
  });
});

describe("rankListings — 가격이 순위에 반영된다(evaluatePriceFit)", () => {
  it("요청 범위 안 매물이 범위보다 한참 아래인 매물보다 순위가 높다", () => {
    // '4억대'(40000~49000, 하한 padding)로 검색했을 때 3.3억(범위보다 한참
    // 아래)이 4.2억(범위 안)보다 위에 뜨던 원래 버그의 재현.
    const inRange = buildListing({ id: "in-range-42000", price: 42000 });
    const wayBelow = buildListing({ id: "way-below-33000", price: 33000 });

    const query = buildQuery({
      transactionType: "매매",
      price: {
        min: 40000,
        max: 49000,
        openEnded: false,
        minSource: "padding",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([wayBelow, inRange], query);

    expect(result.results[0]?.listing.id).toBe("in-range-42000");
    const inRangeCriterion = result.results
      .find((r) => r.listing.id === "in-range-42000")
      ?.criteria.find((c) => c.key === "price");
    const wayBelowCriterion = result.results
      .find((r) => r.listing.id === "way-below-33000")
      ?.criteria.find((c) => c.key === "price");
    expect(inRangeCriterion?.satisfied).toBe(true);
    expect(wayBelowCriterion?.satisfied).toBe(false);
  });

  it("범위 바로 아래(살짝 아래)는 만족으로 잡힐 만큼 점수가 높다", () => {
    const justBelow = buildListing({ id: "just-below-39000", price: 39000 }); // 1000만원 부족(폭 9000의 11%)

    const query = buildQuery({
      transactionType: "매매",
      price: {
        min: 40000,
        max: 49000,
        openEnded: false,
        minSource: "padding",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([justBelow], query);
    const priceCriterion = result.results[0]?.criteria.find((c) => c.key === "price");

    expect(priceCriterion?.satisfied).toBe(true);
  });

  it("월세는 가격 조건이 있어도 price 기준이 unknown 처리된다(스케일이 달라 비교 불가)", () => {
    const monthlyRent = buildListing({
      id: "monthly-rent",
      transactionType: "월세",
      price: 3000,
    });

    const query = buildQuery({
      transactionType: "월세",
      price: {
        min: 40000,
        max: 49000,
        openEnded: false,
        minSource: "padding",
        maxSource: "constraint",
        interpretation: "",
      },
    });

    const result = rankListings([monthlyRent], query);
    const priceCriterion = result.results[0]?.criteria.find((c) => c.key === "price");

    expect(priceCriterion?.unknown).toBe(true);
  });
});
