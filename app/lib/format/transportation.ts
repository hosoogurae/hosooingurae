import type { ComplexTransportation } from "../../data/complexes";

const WALK_TEXT = /(?:[·,()]?\s*)?도보(?:거리)?\s*(?:약\s*)?\d+\s*분/gi;

/** 분리 저장된 교통 값을 중복 없이 사용자용 한 줄로 조합합니다. */
export function formatSubwayTransportation(
  transportation: ComplexTransportation,
): string | undefined {
  const subway = transportation.subway
    ?.replace(WALK_TEXT, "")
    .replace(/[·,\s]+$/, "")
    .trim();
  if (!subway) return undefined;

  const distance = transportation.subwayDistance
    ?.replace(WALK_TEXT, "")
    .replace(/^[·,\s]+|[·,\s]+$/g, "")
    .trim();
  const parts = [subway];
  if (distance) parts.push(distance);
  if (transportation.subwayWalkMinutes !== undefined) {
    parts.push(`도보 ${transportation.subwayWalkMinutes}분`);
  }
  return parts.join(" · ");
}
