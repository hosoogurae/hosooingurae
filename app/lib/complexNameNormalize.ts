/**
 * 단지 이름 중복 판정에 쓰는 공용 정규화 함수입니다. 소문자화 + 공백·특수문자
 * 제거(유니코드 인식이라 한글은 그대로 남고 공백·괄호·하이픈 등만 빠짐) —
 * "메트로타워예미지(주상복합)"와 "메트로타워예미지 주상복합"처럼 표기만
 * 다른 같은 단지를 같은 값으로 취급합니다.
 *
 * supabase/migrations/0020_complexes_name_unique.sql의 generated column
 * (name_normalized)이 이 함수와 동일한 규칙(lower + 영숫자·한글 외 제거)을
 * SQL로 구현하므로, 이 함수를 바꾸면 그 마이그레이션도 함께 맞춰야 합니다.
 */
export function normalizeComplexName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}
