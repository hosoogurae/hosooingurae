import type { UnitTypeImage } from "../data/unitTypeImages";
import { resizeListingPhoto } from "./listingPhotoImageProcessing";
import {
  ensurePhotoBucket,
  extractStoragePath,
  slugifyForPath,
  toJpegFileName,
  toPhotoErrorDetail,
  type PhotoErrorDetail,
} from "./storagePhotos";
import { getSupabaseAdminClient, getSupabaseClient } from "./supabase/client";
import type { UnitTypeImageRow } from "./supabase/database.types";

const BUCKET = "complex-photos";
const UNIT_TYPE_PREFIX = "unit-types";

function rowToUnitTypeImage(row: UnitTypeImageRow): UnitTypeImage {
  return {
    id: row.id,
    complexId: row.complex_id,
    unitType: row.unit_type,
    url: row.url,
    sortOrder: row.sort_order,
  };
}

/** 공개 조회: 특정 단지 + 타입의 실내 공통 사진(매물 상세/카드 갤러리에서 사용). */
export async function getUnitTypeImages(
  complexId: string,
  unitType: string,
): Promise<UnitTypeImage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("unit_type_images")
    .select("*")
    .eq("complex_id", complexId)
    .eq("unit_type", unitType)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[unitTypeImages] 타입 공통 사진 조회 실패", error);
    return [];
  }

  return data.map(rowToUnitTypeImage);
}

/**
 * 관리자용: 단지의 모든 타입 공통 사진을 타입 구분 없이 전부 가져옵니다.
 * 목록 페이지의 batch-lookup(단지당 1번 조회)과 관리 화면의 타입 선택
 * 드롭다운 양쪽에서 씁니다.
 */
export async function getUnitTypeImagesByComplex(
  complexId: string,
): Promise<UnitTypeImage[]> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("unit_type_images")
    .select("*")
    .eq("complex_id", complexId)
    .order("unit_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[unitTypeImages] 단지별 타입 공통 사진 목록 조회 실패", error);
    return [];
  }

  return data.map(rowToUnitTypeImage);
}

export interface UploadUnitTypeImageInput {
  complexId: string;
  unitType: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array | Buffer | ArrayBuffer;
}

/**
 * 타입 공통 사진 업로드: 실제 촬영 사진이므로 listingPhotos.ts와 동일하게
 * 리사이즈/압축한 뒤 Storage에 저장하고 unit_type_images에 행을 추가합니다.
 * (평면도 도면과 달리 배너 크롭 처리는 하지 않습니다.)
 */
export async function uploadUnitTypeImage(input: UploadUnitTypeImageInput): Promise<{
  image?: UnitTypeImage;
  error?: string;
  errorDetail?: PhotoErrorDetail;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  await ensurePhotoBucket(supabase, BUCKET);

  const originalBuffer = Buffer.isBuffer(input.bytes)
    ? input.bytes
    : Buffer.from(input.bytes as ArrayBuffer);

  let resizedBuffer: Buffer;
  try {
    resizedBuffer = await resizeListingPhoto(originalBuffer);
  } catch (error) {
    console.error("[unitTypeImages] 이미지 리사이즈 실패", error);
    return {
      error: "이미지를 처리하지 못했습니다(지원하지 않는 형식이거나 손상된 파일).",
    };
  }

  const path = `${slugifyForPath(input.complexId)}/${UNIT_TYPE_PREFIX}/${slugifyForPath(
    input.unitType,
  )}/${Date.now()}-${toJpegFileName(input.fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(resizedBuffer), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("[unitTypeImages] Storage 업로드 실패", uploadError);
    return {
      error: "이미지 업로드에 실패했습니다.",
      errorDetail: toPhotoErrorDetail({ message: uploadError.message }),
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: existingMax } = await supabase
    .from("unit_type_images")
    .select("sort_order")
    .eq("complex_id", input.complexId)
    .eq("unit_type", input.unitType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existingMax?.sort_order ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("unit_type_images")
    .insert({
      complex_id: input.complexId,
      unit_type: input.unitType,
      url: publicUrl,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[unitTypeImages] 행 저장 실패", {
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
    });

    const { error: rollbackError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (rollbackError) {
      console.error(
        "[unitTypeImages] 롤백용 Storage 파일 삭제 실패(고아 파일로 남을 수 있음)",
        rollbackError,
      );
    }

    return {
      error: "정보 저장에 실패해 업로드를 취소했습니다(이미지 파일도 함께 삭제됨).",
      errorDetail: toPhotoErrorDetail(insertError),
    };
  }

  return { image: rowToUnitTypeImage(inserted) };
}

/** 사진 삭제: DB 행과 Storage 파일을 함께 정리합니다(complexId 일치 확인 포함). */
export async function deleteUnitTypeImage(
  complexId: string,
  imageId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("unit_type_images")
    .select("url, complex_id")
    .eq("id", imageId)
    .maybeSingle();

  if (fetchError) {
    console.error("[unitTypeImages] 삭제 대상 조회 실패", fetchError);
    return { success: false, error: "사진 조회 중 오류가 발생했습니다." };
  }
  if (!existing || existing.complex_id !== complexId) {
    return { success: false, error: "사진을 찾을 수 없습니다." };
  }

  const { error: deleteError } = await supabase
    .from("unit_type_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    console.error("[unitTypeImages] 삭제 실패", deleteError);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  const path = extractStoragePath(existing.url, BUCKET);
  if (path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
    if (storageError) {
      console.error("[unitTypeImages] Storage 파일 삭제 실패", storageError);
    }
  }

  return { success: true };
}

/**
 * 사진 순서 변경(대표사진 지정 포함 — "맨 앞으로 이동"으로 처리). 넘어온
 * orderedIds가 실제로 이 (단지, 타입) 조합의 사진 id 전체와 정확히
 * 일치하는지 먼저 검증합니다.
 */
export async function reorderUnitTypeImages(
  complexId: string,
  unitType: string,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from("unit_type_images")
    .select("id")
    .eq("complex_id", complexId)
    .eq("unit_type", unitType);

  if (fetchError || !existingRows) {
    console.error("[unitTypeImages] 순서 변경 대상 조회 실패", fetchError);
    return { success: false, error: "사진 목록을 확인하지 못했습니다." };
  }

  const existingIds = new Set(existingRows.map((row) => row.id));
  const isValidSet =
    orderedIds.length === existingIds.size &&
    orderedIds.every((id) => existingIds.has(id));
  if (!isValidSet) {
    return { success: false, error: "사진 목록이 최신 상태와 일치하지 않습니다." };
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("unit_type_images").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("[unitTypeImages] 순서 저장 실패", failed.error);
    return { success: false, error: "순서 저장에 실패했습니다." };
  }

  return { success: true };
}
