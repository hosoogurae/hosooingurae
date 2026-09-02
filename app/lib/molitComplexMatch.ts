import type { MolitComplexSearchResult } from "./molit";

const LAWD_CODES: ReadonlyArray<[RegExp, string]> = [
  [/경기도\s*김포시/, "41570"],
];

/** 주소에서 확실히 매칭되는 시군구의 국토부 LAWD_CD만 반환합니다. */
export function findLawdCodeFromAddress(address: string): string | undefined {
  return LAWD_CODES.find(([pattern]) => pattern.test(address))?.[1];
}

/** 공백·기호와 '아파트' 표기만 무시합니다. 차수 숫자는 그대로 보존합니다. */
export function normalizeMolitComplexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/아파트/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function findUniqueMolitComplexMatch(
  name: string,
  complexes: MolitComplexSearchResult[],
): MolitComplexSearchResult | undefined {
  const normalized = normalizeMolitComplexName(name);
  if (!normalized) return undefined;
  const matches = complexes.filter(
    (complex) => normalizeMolitComplexName(complex.aptNm) === normalized,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
