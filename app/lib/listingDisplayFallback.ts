/**
 * floor/totalFloors/exclusiveArea/roomCount/bathroomCount는 DB 컬럼이
 * NOT NULL이라 네이버 원문에서 값을 못 읽으면 0으로 저장됩니다. 저장값은
 * 그대로 두고, 화면에 보여줄 문구만 "0"이 아니라 "확인 안 됨"으로 읽히게
 * 바꿉니다. 0㎡·0층 같은 값은 실제로 존재할 수 없으므로, 0이면 항상
 * 미확인으로 간주합니다. (관리비·주차대수처럼 0이 실제 값일 수 있는
 * 필드는 대상이 아닙니다.)
 */

export function formatFloorInfo(floor: number, totalFloors: number): string {
  if (floor === 0) return "층 정보 문의";
  if (totalFloors === 0) return `${floor}층`;
  return `${floor}층 / ${totalFloors}층`;
}

/** prefix는 값이 있을 때만 붙습니다 (예: "전용 84.97㎡" / 0이면 "면적 문의"). */
export function formatExclusiveArea(exclusiveArea: number, prefix = ""): string {
  return exclusiveArea === 0 ? "면적 문의" : `${prefix}${exclusiveArea}㎡`;
}

export function formatRoomCount(roomCount: number): string {
  return roomCount === 0 ? "문의" : `${roomCount}개`;
}

export function formatBathroomCount(bathroomCount: number): string {
  return bathroomCount === 0 ? "문의" : `${bathroomCount}개`;
}
