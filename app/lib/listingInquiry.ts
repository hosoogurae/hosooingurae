/** 동 정보가 없을 때 임의로 채우지 않고 이 문구를 그대로 노출합니다. */
export const BUILDING_UNKNOWN_LABEL = "동 정보 미등록";

/** 단지명 + 동을 하나의 대표 식별 정보로 합칩니다(문의 시 동 누락으로 인한 혼선 방지). */
export function formatComplexAndBuilding(
  complexName: string,
  building: string | undefined,
): string {
  return `${complexName} ${building && building.trim() !== "" ? building : BUILDING_UNKNOWN_LABEL}`;
}

/**
 * 전화상담·문자문의 등 어떤 경로로 연락하든 상담원이 매물을 정확히 특정할 수
 * 있도록 단지명·동·층·거래유형·가격과 상세페이지 링크를 담은 문의 문구를
 * 만듭니다. 고객 화면/문자에는 내부 listing id(매물번호)를 노출하지
 * 않습니다 — DB 식별은 관리자 화면에서만 씁니다.
 */
export function buildInquiryMessage(params: {
  complexName: string;
  building: string | undefined;
  floor: number;
  transactionType: string;
  priceLabel: string;
  /** 현재 상세페이지의 절대 URL. 없으면 링크 영역을 생략합니다. */
  pageUrl?: string;
}): string {
  const buildingFloorParts: string[] = [];
  if (params.building && params.building.trim() !== "") {
    buildingFloorParts.push(params.building);
  }
  if (params.floor !== undefined && params.floor !== null) {
    buildingFloorParts.push(`${params.floor}층`);
  }

  const lines = [
    "[매물 문의]",
    "",
    params.complexName,
    ...(buildingFloorParts.length > 0 ? [buildingFloorParts.join(" / ")] : []),
    "",
    `${params.transactionType} ${params.priceLabel}`,
    "",
    "안녕하세요.",
    "이 매물 상담을 받고 싶습니다.",
  ];

  if (params.pageUrl) {
    lines.push("", "상세보기", params.pageUrl);
  }

  return lines.join("\n");
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** 데스크톱/모바일 구분 없이 브라우저 환경에서만 호출합니다(서버에서는 항상 false). */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * sms: 링크를 만듭니다. iOS는 본문 파라미터에 `&`를, Android(및 그 외)는
 * `?`를 써야 문자 앱이 본문을 정상적으로 미리 채웁니다.
 */
export function buildSmsHref(phoneNumber: string, body: string): string {
  const separator = typeof navigator !== "undefined" && isIOS() ? "&" : "?";
  return `sms:${phoneNumber}${separator}body=${encodeURIComponent(body)}`;
}
