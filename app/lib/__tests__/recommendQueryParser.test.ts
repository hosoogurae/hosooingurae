import { describe, expect, it } from "vitest";
import { SYNONYM_RULES } from "../recommend/intentNormalizer";
import { PROPERTY_TYPES, ruleBasedQueryParser } from "../recommend/queryParser";

function parse(query: string) {
  return ruleBasedQueryParser.parse(query, { knownComplexNames: [] });
}

describe("가격 범위 파싱 — 'N억~M억' 계열은 min/max 둘 다 constraint", () => {
  const variants = [
    "3억~4억",
    "3억 ~ 4억",
    "3억-4억",
    "3~4억",
    "3억에서 4억",
    "3억부터 4억까지",
    "3억에서 4억 사이",
  ];

  for (const text of variants) {
    it(`"${text}"를 3억~4억 범위(양쪽 constraint)로 인식한다`, () => {
      const { price } = parse(`${text} 아파트`);
      expect(price).toBeDefined();
      expect(price!.min).toBe(30000);
      expect(price!.max).toBe(40000);
      expect(price!.minSource).toBe("constraint");
      expect(price!.maxSource).toBe("constraint");
    });
  }

  it("'3억5000~4억'처럼 앞쪽에 만원 단위가 붙어도 인식한다", () => {
    const { price } = parse("3억5000~4억 아파트");
    expect(price).toBeDefined();
    expect(price!.min).toBe(35000);
    expect(price!.max).toBe(40000);
    expect(price!.minSource).toBe("constraint");
    expect(price!.maxSource).toBe("constraint");
  });
});

describe("가격 경계의 constraint/padding 분류", () => {
  it("'4억 이하' — 상한만 constraint, 하한(0)은 padding", () => {
    const { price } = parse("4억 이하 아파트");
    expect(price).toBeDefined();
    expect(price!.max).toBe(40000);
    expect(price!.maxSource).toBe("constraint");
    expect(price!.minSource).toBe("padding");
  });

  it("'3억 이상' — 하한만 constraint, 상한(패딩된 값)은 padding", () => {
    const { price } = parse("3억 이상 아파트");
    expect(price).toBeDefined();
    expect(price!.min).toBe(30000);
    expect(price!.minSource).toBe("constraint");
    expect(price!.maxSource).toBe("padding");
  });

  it("'3억 초반' — 상한(3.3억)은 constraint, 하한(3.0억)은 padding", () => {
    const { price } = parse("3억 초반 아파트");
    expect(price).toBeDefined();
    expect(price!.max).toBe(33000);
    expect(price!.maxSource).toBe("constraint");
    expect(price!.minSource).toBe("padding");
  });

  it("'3억5000'(정확한 금액) — 상한(+1000만원)은 constraint, 하한은 padding", () => {
    const { price } = parse("3억5000 아파트");
    expect(price).toBeDefined();
    expect(price!.max).toBe(36000);
    expect(price!.maxSource).toBe("constraint");
    expect(price!.minSource).toBe("padding");
  });

  it("'3억'(대략 억단위) — 상한(+9000만원)은 constraint, 하한은 padding", () => {
    const { price } = parse("3억 아파트");
    expect(price).toBeDefined();
    expect(price!.max).toBe(39000);
    expect(price!.maxSource).toBe("constraint");
    expect(price!.minSource).toBe("padding");
  });
});

describe("propertyType 추론 경로 tripwire", () => {
  it("intentNormalizer에 propertyType 계열 동의어 규칙이 없다(생기면 scoring.ts 하드필터 재검토 필요)", () => {
    const propertyTypeCanonicals = new Set<string>(PROPERTY_TYPES);
    const offendingRules = SYNONYM_RULES.filter(
      (rule) => rule.canonical !== undefined && propertyTypeCanonicals.has(rule.canonical),
    );

    expect(
      offendingRules,
      "propertyType에 추론 경로가 생겼으니 scoring.ts의 하드필터를 재검토할 것",
    ).toEqual([]);
  });
});
