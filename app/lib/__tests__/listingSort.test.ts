import { describe, expect, it } from "vitest";
import {
  DEFAULT_LISTING_SORT,
  getListingSortColumn,
  isListingSortKey,
  parseListingSortKey,
} from "../listingSort";

describe("parseListingSortKey", () => {
  it("유효한 값은 그대로 통과시킨다", () => {
    expect(parseListingSortKey("price_desc")).toBe("price_desc");
    expect(parseListingSortKey("updated_asc")).toBe("updated_asc");
  });

  it("값이 없거나(null/undefined) 알 수 없는 값이면 기본값(최신 업데이트순)으로 대체한다", () => {
    expect(parseListingSortKey(undefined)).toBe(DEFAULT_LISTING_SORT);
    expect(parseListingSortKey(null)).toBe(DEFAULT_LISTING_SORT);
    expect(parseListingSortKey("")).toBe(DEFAULT_LISTING_SORT);
    expect(parseListingSortKey("잘못된값")).toBe(DEFAULT_LISTING_SORT);
  });
});

describe("isListingSortKey", () => {
  it("6개 정렬 옵션만 유효하다고 판단한다", () => {
    expect(isListingSortKey("updated_desc")).toBe(true);
    expect(isListingSortKey("updated_asc")).toBe(true);
    expect(isListingSortKey("price_desc")).toBe(true);
    expect(isListingSortKey("price_asc")).toBe(true);
    expect(isListingSortKey("created_desc")).toBe(true);
    expect(isListingSortKey("verified_asc")).toBe(true);
    expect(isListingSortKey("created_asc")).toBe(false);
    expect(isListingSortKey(123)).toBe(false);
  });
});

describe("getListingSortColumn — DB 쿼리에 쓸 컬럼/방향 매핑", () => {
  it("최신 업데이트순은 updated_at 내림차순이다", () => {
    expect(getListingSortColumn("updated_desc")).toEqual({
      column: "updated_at",
      ascending: false,
    });
  });

  it("오래된 순은 updated_at 오름차순이다", () => {
    expect(getListingSortColumn("updated_asc")).toEqual({
      column: "updated_at",
      ascending: true,
    });
  });

  it("가격 높은/낮은 순은 price 컬럼을 쓴다(이미 숫자 컬럼이라 사전순 정렬 문제 없음)", () => {
    expect(getListingSortColumn("price_desc")).toEqual({
      column: "price",
      ascending: false,
    });
    expect(getListingSortColumn("price_asc")).toEqual({
      column: "price",
      ascending: true,
    });
  });

  it("등록일 최신순은 created_at 내림차순이다", () => {
    expect(getListingSortColumn("created_desc")).toEqual({
      column: "created_at",
      ascending: false,
    });
  });

  it("마지막 확인일 오래된 순은 last_verified_at 오름차순이며, 한 번도 확인 안 한(null) 매물을 맨 앞으로 둔다", () => {
    expect(getListingSortColumn("verified_asc")).toEqual({
      column: "last_verified_at",
      ascending: true,
      nullsFirst: true,
    });
  });
});
