/**
 * /admin/complexes 등록·수정 화면에서 쓰는 단지 필드 파싱 로직.
 * 모든 필드가 선택값입니다 — 단지명 하나만으로도 생성할 수 있어야
 * (기본정보만 채우고 나머지는 나중에 보완) 하기 때문입니다.
 */
import { PROPERTY_TYPES, type PropertyType } from "../data/listings";

export interface ComplexFieldsInput {
  name?: string;
  address?: string;
  propertyType?: PropertyType | null;
  approvalDate?: string | null;
  totalHouseholds?: number | null;
  buildings?: number | null;
  parkingCount?: number | null;
  parkingPerHousehold?: number | null;
  heating?: string | null;
  hallwayType?: string | null;
  builder?: string | null;
  maxFloor?: number | null;
  floorAreaRatio?: number | null;
  buildingCoverageRatio?: number | null;
  managementOfficePhone?: string | null;
  managementFeeWon?: number | null;
  managementFeeRaw?: string | null;
  managementFeeAsOf?: string | null;
  nearbySchools?: string[];
  subway?: string | null;
  subwayDistance?: string | null;
  subwayWalkMinutes?: number | null;
  buses?: string[];
  features?: string[];
  molitLawdCode?: string | null;
  molitAptSeq?: string | null;
}

const STRING_OR_NULL_FIELDS = [
  ["address", "주소"],
  ["approvalDate", "사용승인일"],
  ["heating", "난방"],
  ["hallwayType", "복도식 구조"],
  ["builder", "시공사"],
  ["managementOfficePhone", "관리사무소 전화번호"],
  ["managementFeeRaw", "관리비 원문"],
  ["managementFeeAsOf", "관리비 기준연월"],
  ["subway", "지하철역"],
  ["subwayDistance", "지하철 거리"],
  ["molitLawdCode", "MOLIT 지역코드(lawdCode)"],
  ["molitAptSeq", "MOLIT 단지코드(aptSeq)"],
] as const;

const NUMBER_OR_NULL_FIELDS = [
  ["totalHouseholds", "세대수"],
  ["buildings", "동수"],
  ["parkingCount", "총 주차대수"],
  ["parkingPerHousehold", "세대당 주차대수"],
  ["maxFloor", "최고층"],
  ["floorAreaRatio", "용적률"],
  ["buildingCoverageRatio", "건폐율"],
  ["subwayWalkMinutes", "지하철 도보시간"],
  ["managementFeeWon", "관리비"],
] as const;

const STRING_ARRAY_FIELDS = [
  ["nearbySchools", "인근 학교"],
  ["buses", "버스"],
  ["features", "특징"],
] as const;

/**
 * body를 ComplexFieldsInput으로 검증합니다. requireName이면 name이 비어있지 않은
 * 문자열이어야 합니다(신규 생성 시). 그 외 모든 필드는 undefined(그대로 둠) 또는
 * null(값 지움)을 허용합니다 — 부분 입력을 항상 허용하기 위함입니다.
 */
export function parseComplexFieldsInput(
  body: unknown,
  { requireName = false }: { requireName?: boolean } = {},
): { input?: ComplexFieldsInput; errors?: string[] } {
  if (typeof body !== "object" || body === null) {
    return { errors: ["요청 본문이 올바르지 않습니다."] };
  }
  const data = body as Record<string, unknown>;
  const errors: string[] = [];
  const input: ComplexFieldsInput = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim() === "") {
      errors.push("단지명을 입력해주세요.");
    } else {
      input.name = data.name.trim();
    }
  } else if (requireName) {
    errors.push("단지명을 입력해주세요.");
  }

  if (data.propertyType !== undefined) {
    if (data.propertyType === null || data.propertyType === "") {
      input.propertyType = null;
    } else if (
      typeof data.propertyType === "string" &&
      (PROPERTY_TYPES as readonly string[]).includes(data.propertyType)
    ) {
      input.propertyType = data.propertyType as PropertyType;
    } else {
      errors.push(`매물종류는 ${PROPERTY_TYPES.join("/")} 중 하나여야 합니다.`);
    }
  }

  for (const [key, label] of STRING_OR_NULL_FIELDS) {
    const value = data[key];
    if (value === undefined) continue;
    if (value === null) {
      (input as Record<string, unknown>)[key] = null;
      continue;
    }
    if (typeof value !== "string") {
      errors.push(`${label} 값이 올바르지 않습니다.`);
      continue;
    }
    const trimmed = value.trim();
    (input as Record<string, unknown>)[key] = trimmed === "" ? null : trimmed;
  }

  for (const [key, label] of NUMBER_OR_NULL_FIELDS) {
    const value = data[key];
    if (value === undefined) continue;
    if (value === null) {
      (input as Record<string, unknown>)[key] = null;
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${label}은 숫자로 입력해주세요.`);
      continue;
    }
    (input as Record<string, unknown>)[key] = value;
  }

  for (const [key, label] of STRING_ARRAY_FIELDS) {
    const value = data[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
      errors.push(`${label}은 문자열 목록으로 입력해주세요.`);
      continue;
    }
    (input as Record<string, unknown>)[key] = value
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  if (errors.length > 0) {
    return { errors };
  }
  return { input };
}
