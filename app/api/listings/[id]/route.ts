import { NextRequest, NextResponse } from "next/server";
import { parseListingPayload } from "../../../lib/listingValidation";
import { getListingById, toPublicListing } from "../../../lib/listings";
import { getSupabaseAdminClient } from "../../../lib/supabase/client";
import {
  listingToImageInserts,
  listingToInsert,
} from "../../../lib/supabase/mappers";

const NOT_CONFIGURED_ERROR =
  "Supabase가 설정되어 있지 않습니다. .env.local의 NEXT_PUBLIC_SUPABASE_URL / " +
  "SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 공개 조회 API — 공개(published) 매물만, 공개용으로 정리된 필드만 내려줍니다.
 * 임시저장 매물이나 rawSourceText가 필요하면 app/api/admin/listings/[id]를 쓰세요.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ listing: toPublicListing(listing) });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: ["요청 본문이 올바르지 않습니다."] },
      { status: 400 },
    );
  }

  // 매물 ID는 URL 경로 값을 기준으로 삼고, 본문에 다른 id가 와도 무시합니다.
  const { listing, errors } = parseListingPayload({
    ...(body as Record<string, unknown>),
    id,
  });

  if (!listing) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ errors: [NOT_CONFIGURED_ERROR] }, { status: 500 });
  }

  const { data: existingComplex, error: complexError } = await supabase
    .from("complexes")
    .select("id")
    .eq("id", listing.complexId)
    .maybeSingle();

  if (complexError) {
    console.error("[api/listings/:id] 단지 조회 실패", complexError);
    return NextResponse.json(
      { errors: ["단지 정보를 확인하는 중 오류가 발생했습니다."] },
      { status: 500 },
    );
  }
  if (!existingComplex) {
    return NextResponse.json(
      { errors: ["존재하지 않는 단지입니다."] },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update(listingToInsert(listing))
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[api/listings/:id] 매물 수정 실패", updateError);
    return NextResponse.json(
      { errors: ["매물 수정에 실패했습니다."] },
      { status: 500 },
    );
  }
  if (!updated) {
    return NextResponse.json({ errors: ["매물을 찾을 수 없습니다."] }, { status: 404 });
  }

  // 이미지 목록은 통째로 교체합니다(삭제 후 재삽입).
  const { error: deleteImagesError } = await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", id);

  if (deleteImagesError) {
    console.error("[api/listings/:id] 기존 이미지 삭제 실패", deleteImagesError);
  } else {
    const imageRows = listingToImageInserts(listing);
    if (imageRows.length > 0) {
      const { error: insertImagesError } = await supabase
        .from("listing_images")
        .insert(imageRows);
      if (insertImagesError) {
        console.error("[api/listings/:id] 이미지 재삽입 실패", insertImagesError);
      }
    }
  }

  return NextResponse.json({ listing });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ errors: [NOT_CONFIGURED_ERROR] }, { status: 500 });
  }

  // listing_images는 외래키 on delete cascade로 함께 삭제됩니다.
  const { data: deleted, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[api/listings/:id] 매물 삭제 실패", error);
    return NextResponse.json(
      { errors: ["매물 삭제에 실패했습니다."] },
      { status: 500 },
    );
  }
  if (!deleted) {
    return NextResponse.json({ errors: ["매물을 찾을 수 없습니다."] }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
