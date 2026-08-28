// 실제 사진 파일은 나중에 넣습니다. 값이 없으면 해당 사진 영역을 통째로
// 숨겨야 합니다(빈 회색 박스는 미완성처럼 보이므로) — 사용하는 쪽에서
// `OFFICE_INTERIOR_PHOTO &&` 식으로 조건부 렌더링하세요.
// NEXT_PUBLIC_ 환경변수는 빌드 시 그대로 인라인되므로 클라이언트 컴포넌트
// 최상단에서 읽어도 안전합니다(ContactActions.tsx의 KAKAO_CHANNEL_URL과
// 동일한 패턴).

/** ABOUT 섹션 — 사무실 내부 사진. */
export const OFFICE_INTERIOR_PHOTO = process.env.NEXT_PUBLIC_OFFICE_INTERIOR_PHOTO?.trim() || undefined;
/** ABOUT 섹션 — 대표(개업공인중개사) 사진. */
export const CEO_PHOTO = process.env.NEXT_PUBLIC_CEO_PHOTO?.trim() || undefined;
/** Footer — 간판 사진("이 간판을 찾으세요" 캡션과 함께 표시). */
export const SIGNAGE_PHOTO = process.env.NEXT_PUBLIC_SIGNAGE_PHOTO?.trim() || undefined;
