import { NextRequest, NextResponse } from "next/server";
import { createComplex } from "../../lib/complexes";
import { getAllListings, toPublicListing } from "../../lib/listings";
import { parseListingPayload } from "../../lib/listingValidation";
import { generateListingId } from "../../lib/naverImport";
import { getSupabaseAdminClient } from "../../lib/supabase/client";
import {
  listingToImageInserts,
  listingToInsert,
} from "../../lib/supabase/mappers";

const NOT_CONFIGURED_ERROR =
  "Supabase가 설정되어 있지 않습니다. .env.local의 NEXT_PUBLIC_SUPABASE_URL / " +
  "SUPABASE_SECRET_KEY를 확인해주세요.";

/**
 * 누구나 호출할 수 있는 공개 조회 API입니다. 공개(published) 매물만, 그것도
 * 공개용으로 정리된 필드만 내려줍니다(rawSourceText 등 제외). 임시저장 매물이나
 * 관리자 전용 정보가 필요하면 app/api/admin/listings를 쓰세요.
 */
export async function GET() {
  const listings = await getAllListings();
  return NextResponse.json({ listings: listings.map(toPublicListing) });
}

interface NewComplexPayload {
  name?: unknown;
  address?: unknown;
}

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

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ errors: [NOT_CONFIGURED_ERROR] }, { status: 500 });
  }

  const data = { ...(body as Record<string, unknown>) };

  // 1) 단지 확정: 기존 단지를 골랐으면 존재 여부만 확인하고,
  //    새 단지 정보(newComplex)가 왔으면 지금 만들어서 그 id를 씁니다.
  const newComplex = data.newComplex as NewComplexPayload | undefined;

  if (newComplex && typeof newComplex === "object") {
    const name = typeof newComplex.name === "string" ? newComplex.name.trim() : "";
    const address =
      typeof newComplex.address === "string" ? newComplex.address.trim() : "";

    if (!name || !address) {
      return NextResponse.json(
        { errors: ["새 단지의 단지명과 주소를 모두 입력해주세요."] },
        { status: 400 },
      );
    }

    const propertyType =
      typeof data.propertyType === "string" ? data.propertyType : undefined;

    const { complex, error } = await createComplex({
      name,
      address,
      propertyType,
    });

    if (!complex) {
      return NextResponse.json(
        { errors: [error ?? "단지 생성에 실패했습니다."] },
        { status: 500 },
      );
    }

    data.complexId = complex.id;
  } else if (typeof data.complexId === "string" && data.complexId.trim() !== "") {
    const { data: existingComplex, error: complexError } = await supabase
      .from("complexes")
      .select("id")
      .eq("id", data.complexId)
      .maybeSingle();

    if (complexError) {
      console.error("[api/listings] 단지 조회 실패", complexError);
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
  } else {
    return NextResponse.json(
      { errors: ["단지를 선택하거나 새 단지 정보를 입력해주세요."] },
      { status: 400 },
    );
  }

  // 2) 매물 ID가 없으면(부모님이 쓰는 등록 화면은 ID를 아예 안 물어봄) 자동 생성.
  if (typeof data.id !== "string" || data.id.trim() === "") {
    data.id = generateListingId(
      typeof data.priceLabel === "string" ? data.priceLabel : "listing",
    );
  }

  // 3) 공개 상태가 없으면 "바로 공개"를 기본값으로 둡니다(임시저장은 명시적으로 선택).
  if (typeof data.status !== "string" || data.status.trim() === "") {
    data.status = "published";
  }

  const { listing, errors } = parseListingPayload(data);

  if (!listing) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const { data: existingListing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listing.id)
    .maybeSingle();

  if (listingError) {
    console.error("[api/listings] 매물 중복 확인 실패", listingError);
    return NextResponse.json(
      { errors: ["매물 ID를 확인하는 중 오류가 발생했습니다."] },
      { status: 500 },
    );
  }
  if (existingListing) {
    return NextResponse.json(
      { errors: ["이미 존재하는 매물 ID입니다. 다시 시도해주세요."] },
      { status: 400 },
    );
  }

  // 네이버 매물번호(source_article_id) 기준 중복 등록 방지. 값이 있을 때만 검사하며,
  // 여러 매물이 이 값 없이(null) 존재하는 것은 정상입니다.
  if (listing.sourceArticleId) {
    const { data: existingBySource, error: sourceCheckError } = await supabase
      .from("listings")
      .select("id, price_label")
      .eq("source_article_id", listing.sourceArticleId)
      .maybeSingle();

    if (sourceCheckError) {
      console.error("[api/listings] 네이버 매물 중복 확인 실패", sourceCheckError);
      return NextResponse.json(
        { errors: ["중복 등록 여부를 확인하는 중 오류가 발생했습니다."] },
        { status: 500 },
      );
    }
    if (existingBySource) {
      return NextResponse.json(
        {
          errors: [`이미 등록된 매물입니다: ${existingBySource.price_label}`],
          duplicate: {
            listingId: existingBySource.id,
            priceLabel: existingBySource.price_label,
            editUrl: `/admin/listings/${existingBySource.id}/edit`,
          },
        },
        { status: 409 },
      );
    }
  }

  const { error: insertError } = await supabase
    .from("listings")
    .insert(listingToInsert(listing));

  if (insertError) {
    console.error("[api/listings] 매물 저장 실패", insertError);
    return NextResponse.json(
      { errors: ["매물 저장에 실패했습니다."] },
      { status: 500 },
    );
  }

  const imageRows = listingToImageInserts(listing);
  if (imageRows.length > 0) {
    const { error: imageError } = await supabase
      .from("listing_images")
      .insert(imageRows);

    if (imageError) {
      console.error("[api/listings] 매물 이미지 저장 실패", imageError);
      // 매물 자체는 이미 저장되었으므로 등록을 실패로 처리하지 않고 경고만 남깁니다.
    }
  }

  return NextResponse.json({ listing }, { status: 201 });
}
