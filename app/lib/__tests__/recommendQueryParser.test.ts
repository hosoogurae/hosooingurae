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

  it("'3억5000'(정확한 금액) — 상하한 모두 constraint(±1000만원, 콕 집은 금액이라 양쪽 다 거름)", () => {
    const { price } = parse("3억5000 아파트");
    expect(price).toBeDefined();
    expect(price!.min).toBe(34000);
    expect(price!.max).toBe(36000);
    expect(price!.minSource).toBe("constraint");
    expect(price!.maxSource).toBe("constraint");
    // 문구는 그대로 유지(손님이 이미 이해하기 쉬운 표현이라 손대지 않음).
    expect(price!.interpretation).toContain("근처로 검색했습니다");
  });

  it("'3억'(대략 억단위) — 상한(+9000만원)은 constraint, 하한은 padding", () => {
    const { price } = parse("3억 아파트");
    expect(price).toBeDefined();
    expect(price!.max).toBe(39000);
    expect(price!.maxSource).toBe("constraint");
    expect(price!.minSource).toBe("padding");
  });
});

describe("가격 해석 문구 — 실제 하드필터 동작과 일치해야 한다", () => {
  it("'4억대'(band, 하한 padding) — 문구가 상한만 말하고 하한을 걸렀다고 주장하지 않는다", () => {
    const { price } = parse("4억대 아파트");
    expect(price).toBeDefined();
    expect(price!.minSource).toBe("padding");
    expect(price!.interpretation).toBe(
      "\"4억대\" → 4억 9,000만원 이하로 찾았습니다. (조금 더 저렴한 매물도 함께 보여드립니다)",
    );
    expect(price!.interpretation).not.toMatch(/~/);
  });

  it("'3억'(bare, 하한 padding) — 문구가 상한만 말하고 하한을 걸렀다고 주장하지 않는다", () => {
    const { price } = parse("3억 아파트");
    expect(price).toBeDefined();
    expect(price!.minSource).toBe("padding");
    expect(price!.interpretation).toBe(
      "\"3억\" → 3억 9,000만원 이하로 찾았습니다. (조금 더 저렴한 매물도 함께 보여드립니다)",
    );
    expect(price!.interpretation).not.toMatch(/~/);
  });

  it("'4억~5억'(range, 양쪽 constraint) — 문구가 그대로 유지된다(회귀)", () => {
    const { price } = parse("4억~5억 아파트");
    expect(price).toBeDefined();
    expect(price!.minSource).toBe("constraint");
    expect(price!.interpretation).toContain("~");
    expect(price!.interpretation).toContain("검색했습니다");
  });

  it("'4억 이상'(threshold, 하한만 constraint) — 문구가 그대로 유지된다(회귀)", () => {
    const { price } = parse("4억 이상 아파트");
    expect(price).toBeDefined();
    expect(price!.minSource).toBe("constraint");
    expect(price!.interpretation).toContain("이상으로 검색했습니다");
  });

  it("'4억 이하'(threshold, 상한만 constraint) — 문구가 그대로 유지된다(회귀)", () => {
    const { price } = parse("4억 이하 아파트");
    expect(price).toBeDefined();
    expect(price!.maxSource).toBe("constraint");
    expect(price!.interpretation).toContain("이하로 검색했습니다");
  });

  it("'4억 이상 5억 이하'(연결어 없는 복합 표현) — 앞쪽 '이상'만 인식되고 하한은 실제로 걸린다(현재 파서 한계, 이번 범위 밖)", () => {
    const { price } = parse("4억 이상 5억 이하 아파트");
    expect(price).toBeDefined();
    // 뒤쪽 "5억 이하"는 연결어(~/부터/에서)가 없어 하나의 범위로 합쳐지지
    // 않고, 앞쪽 "4억 이상"만 인식됩니다. 하한(4억)은 constraint라 실제로
    // 걸러진다는 점만 확인합니다 — 두 절을 하나로 합치는 것은 표현 해석
    // 범위를 넓히는 작업이라 이번 수정 범위 밖입니다.
    expect(price!.min).toBe(40000);
    expect(price!.minSource).toBe("constraint");
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
