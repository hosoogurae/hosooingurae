import {
  type ComplexImage,
  type ComplexImageCategory,
} from "../data/complexImages";
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
import type { ComplexImageRow } from "./supabase/database.types";

const BUCKET = "complex-photos";
const COMMON_PREFIX = "common";

function rowToComplexImage(row: ComplexImageRow): ComplexImage {
  return {
    id: row.id,
    complexId: row.complex_id,
    category: row.category as ComplexImageCategory,
    url: row.url,
    sortOrder: row.sort_order,
  };
}

/** 공개 조회: 특정 단지의 공통 사진 전체(매물 상세/카드 갤러리에서 사용). */
export async function getComplexImages(complexId: string): Promise<ComplexImage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("complex_images")
    .select("*")
    .eq("complex_id", complexId)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[complexImages] 단지 공통 사진 조회 실패", error);
    return [];
  }

  return data.map(rowToComplexImage);
}

/**
 * 공개 조회: 여러 단지의 "대표 이미지"(단지별 공통 사진 중 sort_order가
 * 가장 작은 것)를 한 번에 조회합니다. 매물 목록처럼 여러 단지가 섞인
 * 화면에서 단지 수만큼 쿼리를 보내지 않기 위한 배치 조회입니다
 * (app/lib/floorPlans.ts의 단지별 평면도 배치 조회와 같은 패턴).
 */
export async function getComplexRepresentativeImages(
  complexIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(complexIds)];
  const supabase = getSupabaseClient();
  if (!supabase || uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("complex_images")
    .select("complex_id, url, sort_order")
    .in("complex_id", uniqueIds)
    .order("complex_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[complexImages] 단지 대표 이미지 일괄 조회 실패", error);
    return new Map();
  }

  const result = new Map<string, string>();
  for (const row of data) {
    if (!result.has(row.complex_id)) {
      result.set(row.complex_id, row.url);
    }
  }
  return result;
}

export interface UploadComplexImageInput {
  complexId: string;
  category: ComplexImageCategory;
  fileName: string;
  contentType: string;
  bytes: Uint8Array | Buffer | ArrayBuffer;
}

/**
 * 단지 공통 사진 업로드: listingPhotos.ts와 동일하게 웹 표시에 적합한
 * 크기로 리사이즈/압축한 뒤 Storage에 저장하고 complex_images에 행을
 * 추가합니다. DB 저장이 실패하면 방금 올린 Storage 파일을 롤백합니다.
 */
export async function uploadComplexImage(input: UploadComplexImageInput): Promise<{
  image?: ComplexImage;
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
    console.error("[complexImages] 이미지 리사이즈 실패", error);
    return {
      error: "이미지를 처리하지 못했습니다(지원하지 않는 형식이거나 손상된 파일).",
    };
  }

  const path = `${slugifyForPath(input.complexId)}/${COMMON_PREFIX}/${slugifyForPath(
    input.category,
  )}/${Date.now()}-${toJpegFileName(input.fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(resizedBuffer), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("[complexImages] Storage 업로드 실패", uploadError);
    return {
      error: "이미지 업로드에 실패했습니다.",
      errorDetail: toPhotoErrorDetail({ message: uploadError.message }),
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: existingMax } = await supabase
    .from("complex_images")
    .select("sort_order")
    .eq("complex_id", input.complexId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existingMax?.sort_order ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("complex_images")
    .insert({
      complex_id: input.complexId,
      category: input.category,
      url: publicUrl,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[complexImages] 행 저장 실패", {
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
        "[complexImages] 롤백용 Storage 파일 삭제 실패(고아 파일로 남을 수 있음)",
        rollbackError,
      );
    }

    return {
      error: "정보 저장에 실패해 업로드를 취소했습니다(이미지 파일도 함께 삭제됨).",
      errorDetail: toPhotoErrorDetail(insertError),
    };
  }

  return { image: rowToComplexImage(inserted) };
}

/** 분류(카테고리)만 바꿉니다. */
export async function updateComplexImageCategory(
  id: string,
  category: ComplexImageCategory,
): Promise<{ image?: ComplexImage; error?: string; errorDetail?: PhotoErrorDetail }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("complex_images")
    .update({ category })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[complexImages] 분류 수정 실패", error);
    return { error: "수정에 실패했습니다.", errorDetail: toPhotoErrorDetail(error) };
  }
  if (!data) {
    return { error: "사진을 찾을 수 없습니다." };
  }

  return { image: rowToComplexImage(data) };
}

/** 사진 삭제: DB 행과 Storage 파일을 함께 정리합니다(complexId 일치 확인 포함). */
export async function deleteComplexImage(
  complexId: string,
  imageId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("complex_images")
    .select("url, complex_id")
    .eq("id", imageId)
    .maybeSingle();

  if (fetchError) {
    console.error("[complexImages] 삭제 대상 조회 실패", fetchError);
    return { success: false, error: "사진 조회 중 오류가 발생했습니다." };
  }
  if (!existing || existing.complex_id !== complexId) {
    return { success: false, error: "사진을 찾을 수 없습니다." };
  }

  const { error: deleteError } = await supabase
    .from("complex_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    console.error("[complexImages] 삭제 실패", deleteError);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  const path = extractStoragePath(existing.url, BUCKET);
  if (path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
    if (storageError) {
      console.error("[complexImages] Storage 파일 삭제 실패", storageError);
    }
  }

  return { success: true };
}

/**
 * 사진 순서 변경(대표사진 지정 포함 — "맨 앞으로 이동"으로 처리). 넘어온
 * orderedIds가 실제로 이 단지의 공통 사진 id 전체와 정확히 일치하는지 먼저
 * 검증합니다.
 */
export async function reorderComplexImages(
  complexId: string,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from("complex_images")
    .select("id")
    .eq("complex_id", complexId);

  if (fetchError || !existingRows) {
    console.error("[complexImages] 순서 변경 대상 조회 실패", fetchError);
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
      supabase.from("complex_images").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("[complexImages] 순서 저장 실패", failed.error);
    return { success: false, error: "순서 저장에 실패했습니다." };
  }

  return { success: true };
}
