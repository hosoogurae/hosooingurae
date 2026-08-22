/**
 * 층수·면적·방/욕실 수·관리비·주차대수처럼 "값이 없을 수 있는" 매물/단지
 * 필드를 화면·문자열로 내보낼 때 쓰는 공용 포맷터입니다. 같은 판단이
 * 화면마다 따로 구현되면 새 화면을 추가할 때마다 같은 버그(0을 실제
 * 확인된 값처럼 보여주는 것)가 반복되므로, 이 필드들을 노출하는 코드는
 * 반드시 이 모듈을 거쳐야 합니다.
 *
 * floor/totalFloors/exclusiveArea/supplyArea/roomCount/bathroomCount는
 * DB 컬럼이 NOT NULL이라 "확인 안 됨"을 0으로 저장합니다 — 그래서 0을
 * null/undefined와 동일하게 "확인 안 됨"으로 취급합니다. 반면 관리비·
 * 주차대수는 0 자체가 실제 값일 수 있어(관리비 없는 단지, 주차 불가
 * 매물) null/undefined와 0을 구분해서 다른 문구를 보여줍니다.
 */

const UNKNOWN_FLOOR = "층 정보 문의";
const UNKNOWN_AREA = "면적 문의";
const UNKNOWN_COUNT = "문의";

/**
 * NOT NULL 컬럼 전용 판정: 0은 "확인 안 됨" 신호이므로 null/undefined와
 * 같게 본다. 이 모듈의 포맷터 대신 원시 값으로 직접 조건 분기해야 하는
 * 곳(예: 광고문구의 문장 구조 자체가 값 유무에 따라 달라지는 경우)에서
 * 쓰도록 공개돼 있다 — 이 판정 자체를 각 파일에서 다시 구현하지 않는다.
 */
export function isUnknownListingNumber(value: number | null | undefined): boolean {
  return value === null || value === undefined || value === 0;
}

const isUnset = isUnknownListingNumber;

export function formatFloor(value: number | null | undefined): string {
  return isUnset(value) ? UNKNOWN_FLOOR : `${value}층`;
}

/**
 * "3층 / 20층"처럼 현재층·전체층을 함께 보여줍니다. 현재층을 모르면
 * 전체층이 있어도 의미가 없어 그대로 "층 정보 문의"를 반환하고,
 * 전체층만 모르면 현재층만 보여줍니다.
 */
export function formatFloorRange(
  floor: number | null | undefined,
  totalFloors: number | null | undefined,
): string {
  if (isUnset(floor)) return UNKNOWN_FLOOR;
  if (isUnset(totalFloors)) return `${floor}층`;
  return `${floor}층 / ${totalFloors}층`;
}

/** prefix는 값이 있을 때만 붙습니다. 예: formatArea(84.97, "전용 ") → "전용 84.97㎡". */
export function formatArea(value: number | null | undefined, prefix = ""): string {
  return isUnset(value) ? UNKNOWN_AREA : `${prefix}${value}㎡`;
}

/** 방 수·욕실 수 공용. 예: formatRooms(3) → "3개". */
export function formatRooms(value: number | null | undefined): string {
  return isUnset(value) ? UNKNOWN_COUNT : `${value}개`;
}

/**
 * 관리비는 0(관리비 없음)과 모름을 구분합니다.
 * 주의: 현재 Listing.maintenanceFee는 파서가 "25만원"처럼 자유 텍스트로
 * 저장하는 string 필드라 이 함수의 대상이 아닙니다 — 관리비가 원 단위
 * 숫자로 저장되는 곳에서만 사용하세요.
 */
export function formatMaintenanceFee(value: number | null | undefined): string {
  if (value === null || value === undefined) return UNKNOWN_COUNT;
  if (value === 0) return "관리비 없음";
  return `${value.toLocaleString()}원`;
}

/** 주차대수도 0(주차 불가)과 모름을 구분합니다. */
export function formatParking(value: number | null | undefined): string {
  if (value === null || value === undefined) return UNKNOWN_COUNT;
  if (value === 0) return "주차 불가";
  return `${value.toLocaleString()}대`;
}

/**
 * 문의 문구(SMS·전화 상담 메시지)처럼 문장 안에 자연스럽게 이어 쓸 때는
 * "층 정보 문의" 같은 안내문 대신 그 항목 자체를 생략하는 게 자연스럽
 * 습니다. 값을 확인할 수 없으면 null을 반환하니, 호출부에서 조건부로
 * 이어 붙이세요.
 */
export function formatFloorForSentence(value: number | null | undefined): string | null {
  return isUnset(value) ? null : `${value}층`;
}

/** 면적의 문장용 버전. prefix는 값이 있을 때만 붙습니다. 모르면 null. */
export function formatAreaForSentence(
  value: number | null | undefined,
  prefix = "",
): string | null {
  return isUnset(value) ? null : `${prefix}${value}㎡`;
}

/** 방/욕실 수의 문장용 버전. prefix는 값이 있을 때만 붙습니다. 모르면 null. */
export function formatRoomsForSentence(
  value: number | null | undefined,
  prefix = "",
): string | null {
  return isUnset(value) ? null : `${prefix}${value}개`;
}
