import { NextRequest, NextResponse } from "next/server";
import { resolveListingUnitType } from "../../../../lib/floorPlans";
import { getSupabaseAdminClient } from "../../../../lib/supabase/client";

const NOT_CONFIGURED_ERROR =
  "Supabase가 설정되어 있지 않습니다. .env.local의 NEXT_PUBLIC_SUPABASE_URL / " +
  "SUPABASE_SECRET_KEY를 확인해주세요.";

interface BulkFloorPlanItem {
  listingId: string;
  unitType: string;
}

export interface BulkFloorPlanResult {
  listingId: string;
  success: boolean;
  /** 되돌리기에 씁니다 — 적용 전 값 그대로(빈 값이면 undefined였다는 뜻). */
  previousUnitType?: string;
  newUnitType?: string;
  error?: string;
}

/**
 * /admin/listing-inspection/floor-plan-cleanup 전용 일괄 적용 API입니다.
 * 화면에서 어떤 후보를 골랐든, 여기서 resolveListingUnitType으로 다시
 * 검증합니다(그 단지에 실제로 없는 타입명이 저장되지 않도록 — API를
 * 직접 호출해도 마찬가지입니다). 한 항목이 실패해도 나머지는 계속
 * 처리하고, 결과를 항목별로 돌려줍니다.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { errors: ["연결할 매물을 하나 이상 선택해주세요."] },
      { status: 400 },
    );
  }

  const parsedItems: BulkFloorPlanItem[] = [];
  for (const item of items) {
    const listingId = (item as { listingId?: unknown })?.listingId;
    const unitType = (item as { unitType?: unknown })?.unitType;
    if (typeof listingId !== "string" || typeof unitType !== "string") {
      return NextResponse.json(
        { errors: ["요청 항목의 형식이 올바르지 않습니다."] },
        { status: 400 },
      );
    }
    parsedItems.push({ listingId, unitType });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ errors: [NOT_CONFIGURED_ERROR] }, { status: 500 });
  }

  const listingIds = parsedItems.map((item) => item.listingId);
  const { data: existingRows, error: fetchError } = await supabase
    .from("listings")
    .select("id, complex_id, unit_type")
    .in("id", listingIds);

  if (fetchError) {
    console.error("[bulk-floor-plan] 대상 매물 조회 실패", fetchError);
    return NextResponse.json(
      { errors: ["대상 매물을 조회하지 못했습니다."] },
      { status: 500 },
    );
  }

  const existingById = new Map((existingRows ?? []).map((row) => [row.id, row]));
  const results: BulkFloorPlanResult[] = [];

  for (const item of parsedItems) {
    const existing = existingById.get(item.listingId);
    if (!existing) {
      results.push({
        listingId: item.listingId,
        success: false,
        error: "매물을 찾을 수 없습니다.",
      });
      continue;
    }
    if (!existing.complex_id) {
      results.push({
        listingId: item.listingId,
        success: false,
        error: "이 매물은 단지에 연결되어 있지 않습니다.",
      });
      continue;
    }

    const resolved = await resolveListingUnitType(existing.complex_id, item.unitType);
    if (resolved.error) {
      results.push({ listingId: item.listingId, success: false, error: resolved.error });
      continue;
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update({ unit_type: resolved.unitType ?? null })
      .eq("id", item.listingId);

    if (updateError) {
      console.error("[bulk-floor-plan] 매물 갱신 실패", updateError);
      results.push({
        listingId: item.listingId,
        success: false,
        error: "저장에 실패했습니다.",
      });
      continue;
    }

    results.push({
      listingId: item.listingId,
      success: true,
      previousUnitType: existing.unit_type ?? undefined,
      newUnitType: resolved.unitType,
    });
  }

  return NextResponse.json({ results });
}
