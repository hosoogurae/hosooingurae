import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * suggestExclusiveAreaFromListings는 "제안"이라 틀리면 안 됩니다 — 값이
 * 하나로 안 모이면 아무것도 돌려주지 않아야 하고(추측 금지), 매물이
 * 없어도 조용히 null이어야 합니다.
 */

let mockListingRows: { exclusive_area: number | null }[] = [];

function makeQuery(rows: { exclusive_area: number | null }[]) {
  const query = {
    eq: () => query,
    not: () => query,
    gte: () => query,
    lte: () => Promise.resolve({ data: rows, error: null }),
  };
  return query;
}

vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => makeQuery(mockListingRows),
    }),
  }),
  getSupabaseAdminClient: () => ({}),
}));

describe("suggestExclusiveAreaFromListings", () => {
  beforeEach(() => {
    mockListingRows = [];
  });

  it("매물이 없으면 null(제안 없음)", async () => {
    mockListingRows = [];
    const { suggestExclusiveAreaFromListings } = await import("../floorPlans");

    expect(await suggestExclusiveAreaFromListings("complex-1", 108.6)).toBeNull();
  });

  it("전용면적이 전부 같으면 그 값과 건수를 제안한다", async () => {
    mockListingRows = [
      { exclusive_area: 84.64 },
      { exclusive_area: 84.64 },
      { exclusive_area: 84.64 },
    ];
    const { suggestExclusiveAreaFromListings } = await import("../floorPlans");

    expect(await suggestExclusiveAreaFromListings("complex-1", 108.6)).toEqual({
      exclusiveArea: 84.64,
      count: 3,
    });
  });

  it("전용면적이 서로 다르게 갈리면(애매함) 제안하지 않는다", async () => {
    mockListingRows = [{ exclusive_area: 84.64 }, { exclusive_area: 84.9 }];
    const { suggestExclusiveAreaFromListings } = await import("../floorPlans");

    expect(await suggestExclusiveAreaFromListings("complex-1", 108.6)).toBeNull();
  });
});
