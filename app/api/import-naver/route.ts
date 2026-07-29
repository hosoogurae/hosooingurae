import { NextRequest, NextResponse } from "next/server";
import {
  findMatchingUnitTypes,
  resolveUnitTypeCandidates,
} from "../../lib/floorPlans";
import { getListingById } from "../../lib/listings";
import { findNaverDuplicate } from "../../lib/naverDuplicate";
import {
  extractArticleNumber,
  getComplexOptions,
  getSuggestedComplexName,
  mergeParsedIntoExisting,
  transformToDraftListing,
} from "../../lib/naverImport";
import {
  getUncertainFieldLabels,
  parseNaverListingText,
} from "../../lib/naverTextParser";
import { getSupabaseClient } from "../../lib/supabase/client";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { url, pastedText } =
    (body as { url?: unknown; pastedText?: unknown } | null) ?? {};

  if (typeof pastedText !== "string" || pastedText.trim().length === 0) {
    return NextResponse.json(
      {
        error:
          "네이버 부동산 매물 상세 화면에서 복사한 텍스트를 붙여넣어주세요.",
      },
      { status: 400 },
    );
  }

  const trimmedUrl = typeof url === "string" ? url.trim() : "";
  // 서버는 이 URL로 어떤 요청도 보내지 않습니다. articleNo만 문자열에서 추출합니다.
  const sourceArticleId = trimmedUrl
    ? extractArticleNumber(trimmedUrl)
    : undefined;

  const parsed = parseNaverListingText(pastedText);
  const uncertainFields = getUncertainFieldLabels(parsed);

  const importSource = {
    url: trimmedUrl || undefined,
    sourceArticleId,
    rawSourceText: pastedText,
  };

  const [draft, complexOptions] = await Promise.all([
    transformToDraftListing(parsed, importSource),
    getComplexOptions(),
  ]);

  // 매칭되는 기존 단지가 없을 때만 "새 단지 등록" 폼에 채울 기본값을 함께 내려줍니다.
  const suggestedComplexName = draft.complexId
    ? undefined
    : getSuggestedComplexName(pastedText);

  // 이미 등록된 것으로 보이는 매물이 있는지 확인합니다. 예전처럼 409로
  // 막지 않고, draft와 함께 duplicate 정보를 내려줘서 관리자가 "기존 매물
  // 업데이트" / "새 매물로 등록" / "취소" 중 하나를 직접 고를 수 있게 합니다.
  let duplicate;
  let mergedPreview;
  const supabase = getSupabaseClient();
  if (supabase) {
    duplicate = await findNaverDuplicate(supabase, {
      sourceArticleId,
      articleNumber: parsed.articleNumber,
      complexId: draft.complexId,
      building: draft.building,
      transactionType: draft.transactionType,
      supplyArea: draft.supplyArea,
      exclusiveArea: draft.exclusiveArea,
      floor: draft.floor,
    });

    if (duplicate) {
      const existingListing = await getListingById(duplicate.listing.id, {
        includeDrafts: true,
      });
      if (existingListing) {
        mergedPreview = mergeParsedIntoExisting(existingListing, parsed, importSource);
      }
    }
  }

  // 원문에서 파싱된 공급/전용면적과, 그 단지에 이미 등록된 평면도의 공급/전용
  // 면적을 ±0.05㎡ 오차로 비교합니다. 면적만으로 안 좁혀지면(예: 110D/110D-1처럼
  // 면적이 같은 타입) 동 번호 기반 예외 규칙으로 한 번 더 좁혀봅니다. 그래도
  // 후보가 정확히 1개일 때만 자동으로 채우고, 없거나 여러 개면 추측하지 않고
  // 빈 값으로 둔 채 후보 목록만 알려줍니다.
  let unitTypeCandidates: string[] = [];
  if (draft.complexId && draft.supplyArea > 0 && draft.exclusiveArea > 0) {
    const areaCandidates = await findMatchingUnitTypes(
      draft.complexId,
      draft.supplyArea,
      draft.exclusiveArea,
    );
    unitTypeCandidates = resolveUnitTypeCandidates(
      areaCandidates,
      draft.building || undefined,
    );
    if (unitTypeCandidates.length === 1) {
      draft.unitType = unitTypeCandidates[0];
    }
  }

  return NextResponse.json({
    draft,
    complexOptions,
    uncertainFields,
    suggestedComplexName,
    unitTypeCandidates,
    duplicate,
    mergedPreview,
  });
}
