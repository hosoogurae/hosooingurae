import { describe, expect, it, vi } from "vitest";
import { findNaverDuplicate, type DuplicateCriteria } from "../naverDuplicate";

vi.mock("../complexes", () => ({
  getComplexById: vi.fn(async (id: string) => ({
    id,
    name: `단지-${id}`,
    address: "",
  })),
}));

const BASE_ROW = {
  id: "listing-1",
  complex_id: "complex-1",
  building: "302동",
  transaction_type: "매매" as const,
  price_label: "4억 3,000만원",
  supply_area: 108.6,
  exclusive_area: 84.64,
  floor: 6,
  total_floors: 26,
  status: "published" as const,
  last_verified_at: "2026-07-20T00:00:00.000Z",
  features: ["방4"],
  short_description: "기존 설명",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

/**
 * naverDuplicate.ts가 실제로 호출하는 두 가지 체인 형태만 정확히 흉내 냅니다:
 * 1) .from().select().or().limit().maybeSingle() — 매물번호 정확 일치 조회
 * 2) .from().select().eq().eq().eq().eq() (await로 직접 resolve) — 2순위 후보 조회
 * 두 경로가 상호 배타적이라 같은 chain 객체가 양쪽 결과를 동시에 들고 있어도
 * 실제로 호출되는 메서드(maybeSingle vs await)에 따라 알맞은 값만 쓰입니다.
 */
function fakeSupabase(config: {
  articleMatch?: typeof BASE_ROW | null;
  fallbackRows?: (typeof BASE_ROW)[];
  articleQueryError?: unknown;
  fallbackQueryError?: unknown;
}): Parameters<typeof findNaverDuplicate>[0] {
  function from() {
    const builder: {
      select: () => typeof builder;
      or: () => typeof builder;
      eq: () => typeof builder;
      limit: () => typeof builder;
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => void;
    } = {
      select: () => builder,
      or: () => builder,
      eq: () => builder,
      limit: () => builder,
      maybeSingle: () =>
        Promise.resolve({
          data: config.articleMatch ?? null,
          error: config.articleQueryError ?? null,
        }),
      then: (resolve) =>
        resolve({
          data: config.fallbackRows ?? [],
          error: config.fallbackQueryError ?? null,
        }),
    };
    return builder;
  }
  return { from } as unknown as Parameters<typeof findNaverDuplicate>[0];
}

const baseCriteria: DuplicateCriteria = {
  complexId: "complex-1",
  building: "302동",
  transactionType: "매매",
  supplyArea: 108.6,
  exclusiveArea: 84.64,
  floor: 6,
};

describe("findNaverDuplicate — 1순위: 매물번호(naverArticleNo) 정확 일치", () => {
  it("동일한 매물번호가 있으면 즉시 기존 매물을 반환하고 2순위는 조회하지 않는다", async () => {
    const supabase = fakeSupabase({
      articleMatch: BASE_ROW,
      // 2순위가 실제로 실행되면 이 값이 잘못 쓰이는지 확인하기 위해 다른 매물을 심어둠.
      fallbackRows: [{ ...BASE_ROW, id: "should-not-be-used" }],
    });
    const result = await findNaverDuplicate(supabase, {
      ...baseCriteria,
      sourceArticleId: "2640683107",
    });
    expect(result?.matchType).toBe("article-id");
    expect(result?.listing.id).toBe("listing-1");
  });

  it("URL의 sourceArticleId와 텍스트의 articleNumber를 같은 식별 개념으로 취급한다", async () => {
    const supabase = fakeSupabase({ articleMatch: BASE_ROW });
    const result = await findNaverDuplicate(supabase, {
      ...baseCriteria,
      articleNumber: "2640683107",
    });
    expect(result?.matchType).toBe("article-id");
  });
});

describe("findNaverDuplicate — 2순위: 매물번호 없을 때만 단지/동/거래유형/면적/층 후보", () => {
  it("매물번호가 없을 때 조건이 맞는 후보를 찾아 fallback으로 반환한다", async () => {
    const supabase = fakeSupabase({ fallbackRows: [BASE_ROW] });
    const result = await findNaverDuplicate(supabase, baseCriteria);
    expect(result?.matchType).toBe("fallback");
    expect(result?.listing.id).toBe("listing-1");
  });

  it("면적이 허용 오차(±0.5㎡)를 벗어나면(다른 세대일 가능성) 자동 확정하지 않는다", async () => {
    const supabase = fakeSupabase({
      fallbackRows: [{ ...BASE_ROW, supply_area: 120.5, exclusive_area: 95.2 }],
    });
    const result = await findNaverDuplicate(supabase, baseCriteria);
    expect(result).toBeUndefined();
  });

  it("동/층 정보가 없으면(빈 값) 후보 검색 자체를 시도하지 않는다", async () => {
    const supabase = fakeSupabase({ fallbackRows: [BASE_ROW] });
    const result = await findNaverDuplicate(supabase, {
      ...baseCriteria,
      building: "",
      floor: 0,
    });
    expect(result).toBeUndefined();
  });

  it("가격만 다른 경우(재확인 시 가장 흔한 변경)에도 나머지 조건이 맞으면 후보로 찾는다", async () => {
    const supabase = fakeSupabase({
      fallbackRows: [{ ...BASE_ROW, price_label: "4억 5,000만원" }],
    });
    const result = await findNaverDuplicate(supabase, baseCriteria);
    expect(result?.matchType).toBe("fallback");
    expect(result?.listing.priceLabel).toBe("4억 5,000만원");
  });
});

describe("findNaverDuplicate — 후보가 있어도 새 매물로 등록할 수 있어야 함(호출부 계약)", () => {
  it("fallback 후보는 matchType이 article-id가 아니므로 호출부가 자동 업데이트로 취급하지 않는다", async () => {
    const supabase = fakeSupabase({ fallbackRows: [BASE_ROW] });
    const result = await findNaverDuplicate(supabase, baseCriteria);
    // 이 값 자체가 "자동 확정 금지"의 유일한 신호입니다 — 관리자 화면(NaverDuplicatePanel)이
    // matchType !== "article-id"일 때 "기존 매물 업데이트"를 기본 추천으로 표시하지
    // 않고, "새 매물로 등록"도 항상 선택 가능하게 두는 것으로 이 계약을 지킵니다.
    expect(result?.matchType).not.toBe("article-id");
  });
});
