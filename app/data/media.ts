// public/에 실제 사진 파일을 넣고 아래 경로를 채우면 화면에 나타납니다.
// 값이 undefined면 그 사진 영역을 통째로 숨겨야 합니다(빈 회색 박스는
// 미완성처럼 보이므로) — 사용하는 쪽에서 `OFFICE_PHOTO &&` 식으로
// 조건부 렌더링하세요.

/** ABOUT 섹션(크게) + Footer 네이버지도 버튼 옆(작게) — 사무실 외관 사진. */
export const OFFICE_PHOTO: string | undefined = "/office.jpg";
/** ABOUT 섹션 — 사무실 내부 사진. 아직 파일 없음. */
export const OFFICE_INTERIOR_PHOTO: string | undefined = undefined;
/** ABOUT 섹션 — 대표(개업공인중개사) 사진. 아직 파일 없음. */
export const CEO_PHOTO: string | undefined = undefined;
