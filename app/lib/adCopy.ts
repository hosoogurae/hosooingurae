import { COMPANY_NAME, PHONE_NUMBER } from "../data/contact";
import {
  formatAreaForSentence,
  formatFloorForSentence,
  formatRoomsForSentence,
} from "./format/listingFields";
import { BUILDING_UNKNOWN_LABEL } from "./listingInquiry";
import { buildBlogAdCopy as buildRichBlogAdCopy } from "./blogAdCopy";

/**
 * 광고문구 생성 — listingInquiry.ts와 같은 원칙: 확인된 필드만 조합하고,
 * DB에 없는 장점/사실을 임의로 만들지 않습니다. 값이 없으면 라벨로 표기하거나
 * 그 줄 자체를 생략합니다.
 */
export interface AdCopyListingInput {
  id: string;
  complexName: string;
  /** 제목에 동네(예: "구래동")를 자연스럽게 넣을 수 있으면 넣기 위한 단지 주소. */
  complexAddress: string | undefined;
  transactionType: string;
  priceLabel: string;
  building: string | undefined;
  floor: number;
  totalFloors: number;
  supplyArea: number;
  exclusiveArea: number;
  unitType: string | undefined;
  direction: string;
  roomCount: number;
  bathroomCount: number;
  moveInDate: string;
  maintenanceFee: string | undefined;
  shortDescription: string;
  features: string[];
  /** 대표 이미지가 실제로 있는지. 없으면 "사진 준비 중"으로만 안내하고 꾸미지 않습니다. */
  hasPhoto: boolean;
  /** 매물 상세페이지 절대 URL. 없으면 링크 줄을 생략합니다. */
  pageUrl?: string;
}

export interface AdCopyFormats {
  sms: string;
  blog: string;
  sns: string;
  general: string;
}

/**
 * "203동 11층/20층"처럼 동/층을 함께 보여줍니다. 층을 확인할 수 없으면
 * (0/null) "0층"을 광고에 내보내는 대신 층 부분만 생략하고 동만
 * 남깁니다 — 광고에 사실과 다른 층수를 적으면 표시·광고 규정 문제가
 * 됩니다. 동은 이 함수의 대상이 아니라(항상 값이 있거나 라벨로 대체됨)
 * 그대로 둡니다.
 */
function formatBuildingFloorLine(input: AdCopyListingInput): string {
  const building =
    input.building && input.building.trim() !== ""
      ? input.building
      : BUILDING_UNKNOWN_LABEL;
  const floorText = formatFloorForSentence(input.floor);
  if (!floorText) return building;
  const totalFloorsText = formatFloorForSentence(input.totalFloors);
  const floorPart = totalFloorsText ? `${floorText}/${totalFloorsText}` : floorText;
  return `${building} ${floorPart}`;
}

/**
 * "공급 109㎡ / 전용 84㎡"처럼 면적을 보여줍니다. 공급/전용 중 확인되지
 * 않은 쪽은 그 항목만 생략하고, 둘 다 없으면 unitType만(있으면) 남기거나
 * 빈 문자열을 반환해 호출부에서 그 줄 자체를 생략하게 합니다.
 */
function formatAreaLine(input: AdCopyListingInput): string {
  const areaInner = [
    formatAreaForSentence(input.supplyArea, "공급 "),
    formatAreaForSentence(input.exclusiveArea, "전용 "),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" / ");

  if (!input.unitType) return areaInner;
  return areaInner ? `${input.unitType} · ${areaInner}` : input.unitType;
}

export function buildSmsAdCopy(input: AdCopyListingInput): string {
  const lines: string[] = [
    `[${COMPANY_NAME}]`,
    `${input.complexName} ${input.transactionType} ${input.priceLabel}`,
    formatBuildingFloorLine(input),
  ];

  if (input.features.length > 0) {
    lines.push(input.features.slice(0, 3).join(", "));
  } else if (input.shortDescription.trim() !== "") {
    lines.push(input.shortDescription.trim());
  }

  lines.push(`☎ ${PHONE_NUMBER}`);
  if (input.pageUrl) lines.push(input.pageUrl);

  return lines.join("\n");
}

/**
 * 블로그용만 별도의 장문 생성 방식(app/lib/blogAdCopy.ts)을 씁니다 — 나머지
 * 3종(문자/SNS/일반)은 정보를 줄바꿈해 나열하는 정도로도 충분하지만,
 * 블로그는 "부동산 블로거가 직접 쓴 느낌"의 자연스러운 장문이 목표라
 * 별도 파일에서 문체/구조를 훨씬 세밀하게 다룹니다.
 */
export function buildBlogAdCopy(input: AdCopyListingInput): string {
  return buildRichBlogAdCopy(input);
}

export function buildSnsAdCopy(input: AdCopyListingInput): string {
  const lines: string[] = [
    `${input.complexName} ${input.transactionType} ${input.priceLabel}`,
  ];

  if (input.features.length > 0) {
    lines.push(input.features.slice(0, 2).join(" · "));
  }

  lines.push(`문의 ${PHONE_NUMBER}`);
  if (input.pageUrl) lines.push(input.pageUrl);

  const hashtags = [
    `#${input.complexName.replace(/\s+/g, "")}`,
    `#${input.transactionType}`,
    input.unitType ? `#${input.unitType}` : undefined,
  ].filter((tag): tag is string => Boolean(tag));
  if (hashtags.length > 0) lines.push(hashtags.join(" "));

  return lines.join("\n");
}

/**
 * "방 3개 / 욕실 2개"처럼 보여줍니다. 방/욕실 중 확인되지 않은 쪽은 그
 * 항목만 생략하고, 둘 다 없으면 빈 문자열을 반환해 호출부에서 그 조각
 * 자체를 생략하게 합니다.
 */
function formatRoomBathPart(input: AdCopyListingInput): string {
  return [
    formatRoomsForSentence(input.roomCount, "방 "),
    formatRoomsForSentence(input.bathroomCount, "욕실 "),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" / ");
}

export function buildGeneralAdCopy(input: AdCopyListingInput): string {
  const areaLine = formatAreaLine(input);
  const infoLine = [`방향 ${input.direction}`, formatRoomBathPart(input), `입주 ${input.moveInDate}`]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  const lines: string[] = [
    `${input.complexName} ${input.transactionType} ${input.priceLabel}`,
    formatBuildingFloorLine(input),
    ...(areaLine ? [areaLine] : []),
    infoLine,
  ];

  if (input.shortDescription.trim() !== "") {
    lines.push("", input.shortDescription.trim());
  }

  lines.push("", `${COMPANY_NAME} ${PHONE_NUMBER}`);
  if (input.pageUrl) lines.push(input.pageUrl);

  return lines.join("\n");
}

export function buildAllAdCopyFormats(input: AdCopyListingInput): AdCopyFormats {
  return {
    sms: buildSmsAdCopy(input),
    blog: buildBlogAdCopy(input),
    sns: buildSnsAdCopy(input),
    general: buildGeneralAdCopy(input),
  };
}
