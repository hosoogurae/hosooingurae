import { describe, expect, it, vi } from "vitest";
import type { Listing } from "../../data/listings";
import { mergeParsedIntoExisting, transformToDraftListing } from "../naverImport";
import type { ParsedNaverListing } from "../naverTextParser";

vi.mock("../complexes", () => ({
  getAllComplexes: vi.fn(async () => []),
}));

const EXISTING: Listing = {
  id: "existing-1",
  complexId: "complex-1",
  propertyType: "아파트",
  status: "published",
  dealStatus: "advertising",
  transactionType: "매매",
  price: 42000,
  priceLabel: "4억 2,000만원",
  building: "302동",
  floor: 6,
  totalFloors: 26,
  supplyArea: 108.6,
  exclusiveArea: 84.64,
  roomCount: 3,
  bathroomCount: 2,
  direction: "남동향",
  moveInDate: "즉시입주 가능",
  maintenanceFee: "27만원",
  hasLoan: true,
  loanAmount: "1억 5,000만원",
  shortDescription: "기존 설명",
  features: ["기존특징1", "기존특징2"],
  naverUrl: "https://new.land.naver.com/complexes/1?articleNo=1111111111",
  articleNumber: "1111111111",
  verifiedDate: "2026-07-01",
  isFeatured: true,
  sourceType: "naver",
  sourceArticleId: "1111111111",
  rawSourceText: "예전 원문",
  lastVerifiedAt: "2026-07-01T00:00:00.000Z",
};

function source(
  overrides: Partial<{
    url: string;
    sourceArticleId: string;
    rawSourceText: string;
  }> = {},
) {
  return {
    rawSourceText: "새 원문",
    ...overrides,
  };
}

describe("mergeParsedIntoExisting — 기존 매물 업데이트 병합 규칙", () => {
  it("새로 파싱된 값이 있으면 덮어쓴다", () => {
    const parsed: ParsedNaverListing = {
      price: 43000,
      priceLabel: "4억 3,000만원",
      features: ["새특징"],
      shortDescription: "새 설명",
    };
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.price).toBe(43000);
    expect(merged.priceLabel).toBe("4억 3,000만원");
    expect(merged.features).toEqual(["새특징"]);
    expect(merged.shortDescription).toBe("새 설명");
  });

  it("새로 파싱된 값이 비어있으면(전부 undefined) 기존 값을 지우지 않는다", () => {
    const parsed: ParsedNaverListing = {};
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.price).toBe(EXISTING.price);
    expect(merged.priceLabel).toBe(EXISTING.priceLabel);
    expect(merged.features).toEqual(EXISTING.features);
    expect(merged.shortDescription).toBe(EXISTING.shortDescription);
    expect(merged.direction).toBe(EXISTING.direction);
    expect(merged.moveInDate).toBe(EXISTING.moveInDate);
    expect(merged.maintenanceFee).toBe(EXISTING.maintenanceFee);
    expect(merged.building).toBe(EXISTING.building);
  });

  it("공개 상태(status)와 거래 진행 상태(dealStatus)는 업데이트 대상이 아니므로 항상 유지한다", () => {
    const parsed: ParsedNaverListing = { price: 50000 };
    const merged = mergeParsedIntoExisting(
      { ...EXISTING, status: "draft", dealStatus: "hold" },
      parsed,
      source(),
    );
    expect(merged.status).toBe("draft");
    expect(merged.dealStatus).toBe("hold");
  });

  it("마지막 확인일: 새로 추출한 날짜가 있으면 그 값을 쓴다", () => {
    const parsed: ParsedNaverListing = {
      verifiedOwnerConfirmationDate: "2026-07-29",
    };
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.lastVerifiedAt).toBe("2026-07-29T00:00:00.000Z");
  });

  it("마지막 확인일: 새로 추출한 날짜가 없으면 기존 값을 유지한다", () => {
    const parsed: ParsedNaverListing = {};
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.lastVerifiedAt).toBe(EXISTING.lastVerifiedAt);
  });

  it("네이버 원문/URL/매물번호는 이번에 가져온 값으로 항상 갱신한다", () => {
    const parsed: ParsedNaverListing = { articleNumber: "2222222222" };
    const merged = mergeParsedIntoExisting(
      EXISTING,
      parsed,
      source({
        url: "https://new.land.naver.com/x?articleNo=2222222222",
        sourceArticleId: "2222222222",
        rawSourceText: "새로 붙여넣은 원문",
      }),
    );
    expect(merged.rawSourceText).toBe("새로 붙여넣은 원문");
    expect(merged.naverUrl).toBe("https://new.land.naver.com/x?articleNo=2222222222");
    expect(merged.articleNumber).toBe("2222222222");
    expect(merged.sourceArticleId).toBe("2222222222");
  });

  it("id/complexId/isFeatured 등 정체성·운영 값은 기존 매물 것을 그대로 유지한다", () => {
    const parsed: ParsedNaverListing = { price: 50000 };
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.id).toBe(EXISTING.id);
    expect(merged.complexId).toBe(EXISTING.complexId);
    expect(merged.isFeatured).toBe(EXISTING.isFeatured);
  });

  it("융자금: 새로 확정된 값(hasLoan 있음)이면 덮어쓴다", () => {
    const parsed: ParsedNaverListing = { hasLoan: false, loanAmount: null };
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.hasLoan).toBe(false);
    expect(merged.loanAmount).toBeNull();
  });

  it("융자금: 라벨을 못 찾아 hasLoan이 undefined면 기존 값을 유지한다", () => {
    const parsed: ParsedNaverListing = {};
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.hasLoan).toBe(EXISTING.hasLoan);
    expect(merged.loanAmount).toBe(EXISTING.loanAmount);
  });

  it("URL: 직접 입력한 URL이 있으면 naver.me 자동 인식 링크보다 우선한다", () => {
    const parsed: ParsedNaverListing = { naverMeLink: "https://naver.me/abcd123" };
    const merged = mergeParsedIntoExisting(
      EXISTING,
      parsed,
      source({ url: "https://new.land.naver.com/x?articleNo=9999" }),
    );
    expect(merged.naverUrl).toBe("https://new.land.naver.com/x?articleNo=9999");
  });

  it("URL: 직접 입력한 URL이 없으면 naver.me 자동 인식 링크를 쓴다", () => {
    const parsed: ParsedNaverListing = { naverMeLink: "https://naver.me/abcd123" };
    const merged = mergeParsedIntoExisting(EXISTING, parsed, source());
    expect(merged.naverUrl).toBe("https://naver.me/abcd123");
  });
});

describe("transformToDraftListing — 신규 등록 기본값", () => {
  it("공개 상태(status) 기본값은 published다", async () => {
    const draft = await transformToDraftListing(
      {},
      { rawSourceText: "원문" },
    );
    expect(draft.status).toBe("published");
  });

  it("집주인확인매물 날짜를 못 찾으면 lastVerifiedAt은 비워둔다(오늘 날짜로 대체 금지)", async () => {
    const draft = await transformToDraftListing(
      {},
      { rawSourceText: "원문" },
    );
    expect(draft.lastVerifiedAt).toBeUndefined();
  });

  it("집주인확인매물 날짜를 찾으면 lastVerifiedAt에 반영한다", async () => {
    const draft = await transformToDraftListing(
      { verifiedOwnerConfirmationDate: "2026-07-29" },
      { rawSourceText: "원문" },
    );
    expect(draft.lastVerifiedAt).toBe("2026-07-29T00:00:00.000Z");
  });

  it("텍스트에서 추출한 매물번호를 articleNumber에 반영한다", async () => {
    const draft = await transformToDraftListing(
      { articleNumber: "2640683107" },
      { rawSourceText: "원문" },
    );
    expect(draft.articleNumber).toBe("2640683107");
  });

  it("융자금: 파서가 못 찾으면(hasLoan undefined) 기본값 false/null로 채운다", async () => {
    const draft = await transformToDraftListing({}, { rawSourceText: "원문" });
    expect(draft.hasLoan).toBe(false);
    expect(draft.loanAmount).toBeNull();
  });

  it("융자금: 파서가 찾은 값을 그대로 반영한다", async () => {
    const draft = await transformToDraftListing(
      { hasLoan: true, loanAmount: "1억 5,000만원" },
      { rawSourceText: "원문" },
    );
    expect(draft.hasLoan).toBe(true);
    expect(draft.loanAmount).toBe("1억 5,000만원");
  });

  it("URL: 직접 입력한 URL이 없으면 텍스트에서 찾은 naver.me 링크를 쓴다", async () => {
    const draft = await transformToDraftListing(
      { naverMeLink: "https://naver.me/abcd123" },
      { rawSourceText: "원문" },
    );
    expect(draft.naverUrl).toBe("https://naver.me/abcd123");
  });

  it("URL: 직접 입력한 URL이 있으면 naver.me 자동 인식 링크보다 우선한다", async () => {
    const draft = await transformToDraftListing(
      { naverMeLink: "https://naver.me/abcd123" },
      { url: "https://new.land.naver.com/x?articleNo=1234", rawSourceText: "원문" },
    );
    expect(draft.naverUrl).toBe("https://new.land.naver.com/x?articleNo=1234");
  });
});
