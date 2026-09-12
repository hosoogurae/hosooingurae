/**
 * 매물 비교표(/compare)에서 관련된 두 항목(동/층, 공급/전용면적 등)을
 * 한 줄로 묶을 때 씁니다. 값이 있는 항목만 " / "로 이어붙이고, 하나만
 * 있으면 그 값 하나만 보여줍니다(슬래시를 남기거나 빈칸을 두지 않음 —
 * 없는 값을 지어내지 않습니다). 묶은 항목이 전부 없을 때만, 각 항목이
 * 원래 단독 행이었을 때 쓰던 미등록 문구를 그대로 이어붙입니다.
 */
export interface CompareRowField {
  /** 값이 있으면 그 문자열. 없으면 null(이 항목은 생략). */
  value: string | null;
  /** 묶인 항목이 전부 없을 때만 쓰는, 이 항목 단독일 때의 기존 미등록 표시. */
  fallback: string;
}

export function combineCompareRowValues(fields: CompareRowField[]): string {
  const values = fields
    .map((field) => field.value)
    .filter((value): value is string => value !== null);

  if (values.length > 0) return values.join(" / ");
  return fields.map((field) => field.fallback).join(" / ");
}
