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
 * 전화상담·문의하기 등 어떤 경로로 연락하든 상담원이 매물을 정확히 특정할 수 있도록
 * 단지명·동·층·거래유형·가격을 담은 문의 문구를 만듭니다. 고객 화면에는 내부
 * listing id(매물번호)를 노출하지 않습니다 — DB 식별은 관리자 화면에서만 씁니다.
 */
export function buildInquiryMessage(params: {
  complexName: string;
  building: string | undefined;
  floor: number;
  transactionType: string;
  priceLabel: string;
}): string {
  const identifierParts = [params.complexName];
  if (params.building && params.building.trim() !== "") {
    identifierParts.push(params.building);
  }
  identifierParts.push(`${params.floor}층`);

  return [
    "[매물 문의]",
    identifierParts.join(" "),
    `${params.transactionType} ${params.priceLabel}`,
  ].join("\n");
}
