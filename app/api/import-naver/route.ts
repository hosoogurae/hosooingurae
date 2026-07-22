import { NextRequest, NextResponse } from "next/server";
import {
  findMatchingUnitTypes,
  resolveUnitTypeCandidates,
} from "../../lib/floorPlans";
import {
  extractArticleNumber,
  getComplexOptions,
  getSuggestedComplexName,
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

  // source_article_id가 이미 등록돼 있으면 중복이므로 미리보기 단계로 가지 않고 바로 안내합니다.
  if (sourceArticleId) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: existing, error } = await supabase
        .from("listings")
        .select("id, price_label")
        .eq("source_article_id", sourceArticleId)
        .maybeSingle();

      if (error) {
        console.error("[api/import-naver] 중복 확인 실패", error);
      } else if (existing) {
        return NextResponse.json(
          {
            error: "이미 등록된 매물입니다.",
            duplicate: {
              listingId: existing.id,
              priceLabel: existing.price_label,
              editUrl: `/admin/listings/${existing.id}/edit`,
            },
          },
          { status: 409 },
        );
      }
    }
  }

  const parsed = parseNaverListingText(pastedText);
  const uncertainFields = getUncertainFieldLabels(parsed);

  const [draft, complexOptions] = await Promise.all([
    transformToDraftListing(parsed, {
      url: trimmedUrl || undefined,
      sourceArticleId,
      rawSourceText: pastedText,
    }),
    getComplexOptions(),
  ]);

  // 매칭되는 기존 단지가 없을 때만 "새 단지 등록" 폼에 채울 기본값을 함께 내려줍니다.
  const suggestedComplexName = draft.complexId
    ? undefined
    : getSuggestedComplexName(pastedText);

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
  });
}
