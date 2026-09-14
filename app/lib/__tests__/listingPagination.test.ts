import { describe, expect, it } from "vitest";
import {
  LISTINGS_PAGE_SIZE,
  buildListingsCanonicalPath,
  buildListingsPageHref,
  getPageNumbersToShow,
  isRawPageValueMalformed,
  parseListingPage,
  resolveListingsPageRedirect,
} from "../listingPagination";

describe("parseListingPage — 이상한 값은 에러 없이 1로 보정된다", () => {
  it("파라미터가 없으면 1이다", () => {
    expect(parseListingPage(undefined)).toBe(1);
  });

  it("정상적인 양의 정수는 그대로 쓴다", () => {
    expect(parseListingPage("3")).toBe(3);
  });

  it("배열로 넘어와도 첫 값을 쓴다", () => {
    expect(parseListingPage(["4", "9"])).toBe(4);
  });

  const invalidValues = ["0", "-1", "1.5", "abc", "", "  "];
  for (const value of invalidValues) {
    it(`"${value}"는 1로 보정된다`, () => {
      expect(parseListingPage(value)).toBe(1);
    });
  }

  it("터무니없이 큰 값은 상한(100000)으로 잘린다(offset 폭주 방지)", () => {
    expect(parseListingPage("99999999999999999999")).toBe(100_000);
  });
});

describe("isRawPageValueMalformed — 주소에 적힌 값과 보정된 값이 다른지", () => {
  it("파라미터가 없으면 malformed가 아니다(보정할 주소 자체가 없음)", () => {
    expect(isRawPageValueMalformed(undefined, 1)).toBe(false);
  });

  it("'1'을 명시적으로 쓴 경우는 malformed가 아니다(유효한 값)", () => {
    expect(isRawPageValueMalformed("1", 1)).toBe(false);
  });

  it("'3'처럼 정상 값은 malformed가 아니다", () => {
    expect(isRawPageValueMalformed("3", 3)).toBe(false);
  });

  it("'0'처럼 1로 보정된 값은 malformed다", () => {
    expect(isRawPageValueMalformed("0", 1)).toBe(true);
  });

  it("'abc'처럼 숫자가 아닌 값은 malformed다", () => {
    expect(isRawPageValueMalformed("abc", 1)).toBe(true);
  });

  it("'01'처럼 표기가 다른 값도 malformed로 본다", () => {
    expect(isRawPageValueMalformed("01", 1)).toBe(true);
  });
});

describe("buildListingsPageHref — 필터·정렬은 유지하고 page만 바꾼다", () => {
  it("필터가 없으면 1페이지는 파라미터 없는 깨끗한 주소다", () => {
    expect(buildListingsPageHref({}, 1)).toBe("/listings");
  });

  it("2페이지 이상이면 page가 붙는다", () => {
    expect(buildListingsPageHref({}, 2)).toBe("/listings?page=2");
  });

  it("기존 필터(propertyType·transactionType·priceRange·complexId)와 정렬을 그대로 유지한다", () => {
    const current = {
      propertyType: "apartment",
      transactionType: "sale",
      priceRange: "3-5",
      complexId: "complex-1",
      sort: "price_desc",
      page: "2",
    };
    const href = buildListingsPageHref(current, 3);
    expect(href).toContain("propertyType=apartment");
    expect(href).toContain("transactionType=sale");
    expect(href).toContain("priceRange=3-5");
    expect(href).toContain("complexId=complex-1");
    expect(href).toContain("sort=price_desc");
    expect(href).toContain("page=3");
  });

  it("필터를 안 걸었을 때 1페이지로 옮기면 page 파라미터가 사라진다", () => {
    const current = { propertyType: "apartment", page: "5" };
    expect(buildListingsPageHref(current, 1)).toBe("/listings?propertyType=apartment");
  });
});

describe("buildListingsCanonicalPath — sort는 빼고, 필터+page는 유지한다", () => {
  it("정렬만 다른 주소들은 같은 canonical을 가리킨다", () => {
    const withSort = { propertyType: "apartment", sort: "price_desc", page: "2" };
    const withoutSort = { propertyType: "apartment", page: "2" };
    expect(buildListingsCanonicalPath(withSort, 2)).toBe(
      buildListingsCanonicalPath(withoutSort, 2),
    );
  });

  it("필터는 canonical에도 그대로 남는다(실제로 다른 매물 집합이므로)", () => {
    const canonical = buildListingsCanonicalPath(
      { transactionType: "jeonse", sort: "updated_asc" },
      1,
    );
    expect(canonical).toBe("/listings?transactionType=jeonse");
  });

  it("1페이지는 page 파라미터 없이 깨끗한 주소다", () => {
    expect(buildListingsCanonicalPath({}, 1)).toBe("/listings");
  });
});

describe("getPageNumbersToShow — 페이지가 많아져도 표시 개수가 접힌다", () => {
  it("전체 5페이지면 다 보여준다(접을 필요 없음)", () => {
    expect(getPageNumbersToShow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("전체 20페이지 중 10페이지면 양쪽에 생략(…)이 생긴다", () => {
    const result = getPageNumbersToShow(10, 20);
    expect(result).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });

  it("맨 앞 페이지 근처면 앞쪽엔 생략이 없다", () => {
    const result = getPageNumbersToShow(1, 20);
    expect(result).toEqual([1, 2, "ellipsis", 20]);
  });

  it("맨 뒤 페이지 근처면 뒤쪽엔 생략이 없다", () => {
    const result = getPageNumbersToShow(20, 20);
    expect(result).toEqual([1, "ellipsis", 19, 20]);
  });

  it("페이지가 아무리 많아도 표시 개수는 최대 7개(숫자 5 + 생략 2)를 넘지 않는다", () => {
    const result = getPageNumbersToShow(500, 1000);
    expect(result.length).toBeLessThanOrEqual(7);
  });

  it("전체 0페이지(빈 목록)면 아무것도 안 보여준다", () => {
    expect(getPageNumbersToShow(1, 0)).toEqual([]);
  });
});

describe("resolveListingsPageRedirect — 0건 결과에서도 반복 리다이렉트에 빠지지 않는다", () => {
  it("필터 결과가 0건이고 1페이지를 요청했으면 리다이렉트하지 않는다(결과 없음 화면에서 멈춤)", () => {
    const decision = resolveListingsPageRedirect(1, undefined, 0, 24);
    expect(decision.totalPages).toBe(1);
    expect(decision.effectivePage).toBe(1);
    expect(decision.shouldRedirect).toBe(false);
  });

  it("필터 결과가 0건인데 3페이지를 요청했으면 1페이지로 딱 한 번만 리다이렉트한다", () => {
    const decision = resolveListingsPageRedirect(3, "3", 0, 24);
    expect(decision.totalPages).toBe(1);
    expect(decision.effectivePage).toBe(1);
    expect(decision.shouldRedirect).toBe(true);

    // 리다이렉트된 다음 요청(?page 파라미터가 사라진 "/listings")을 다시
    // 판단해보면, 더 이상 리다이렉트가 걸리지 않아야 한다(무한 루프 방지).
    const nextRequestPage = parseListingPage(undefined); // buildListingsPageHref(1)은 page 파라미터를 뺌
    const secondDecision = resolveListingsPageRedirect(nextRequestPage, undefined, 0, 24);
    expect(secondDecision.shouldRedirect).toBe(false);
  });

  it("결과가 0건인데 이상한 값(page=abc)이 와도 1로 보정되고 딱 한 번만 리다이렉트한다", () => {
    const requestedPage = parseListingPage("abc");
    const decision = resolveListingsPageRedirect(requestedPage, "abc", 0, 24);
    expect(decision.effectivePage).toBe(1);
    expect(decision.shouldRedirect).toBe(true);
  });

  it("결과가 있고 요청 페이지가 범위 안이면 리다이렉트하지 않는다", () => {
    const decision = resolveListingsPageRedirect(2, "2", 117, 24); // 117건 → 5페이지
    expect(decision.totalPages).toBe(5);
    expect(decision.effectivePage).toBe(2);
    expect(decision.shouldRedirect).toBe(false);
  });

  it("결과가 있고 요청 페이지가 마지막 페이지를 넘으면 마지막 페이지로 리다이렉트한다", () => {
    const decision = resolveListingsPageRedirect(99, "99", 117, 24); // 117건 → 5페이지
    expect(decision.totalPages).toBe(5);
    expect(decision.effectivePage).toBe(5);
    expect(decision.shouldRedirect).toBe(true);
  });

  it("결과가 정확히 페이지 크기의 배수여도 마지막 페이지 판정이 맞다", () => {
    const decision = resolveListingsPageRedirect(2, "2", 48, 24); // 48건 → 정확히 2페이지
    expect(decision.totalPages).toBe(2);
    expect(decision.effectivePage).toBe(2);
    expect(decision.shouldRedirect).toBe(false);
  });
});

describe("LISTINGS_PAGE_SIZE", () => {
  it("한 페이지 24건으로 고정되어 있다", () => {
    expect(LISTINGS_PAGE_SIZE).toBe(24);
  });
});
