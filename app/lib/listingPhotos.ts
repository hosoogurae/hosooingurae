import { resizeListingPhoto } from "./listingPhotoImageProcessing";
import { getSupabaseAdminClient } from "./supabase/client";
import type { ListingImageRow } from "./supabase/database.types";

const BUCKET = "listing-photos";

export interface ListingPhoto {
  id: string;
  listingId: string;
  url: string;
  sortOrder: number;
}

/** Supabase가 돌려준 원본 에러 정보. 관리자 화면에 그대로 보여줘서 원인을 바로 알 수 있게 합니다. */
export interface ListingPhotoErrorDetail {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

function toErrorDetail(error: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
} | null): ListingPhotoErrorDetail | undefined {
  if (!error) return undefined;
  return {
    code: error.code,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function rowToPhoto(row: ListingImageRow): ListingPhoto {
  return {
    id: row.id,
    listingId: row.listing_id,
    url: row.url,
    sortOrder: row.sort_order,
  };
}

/** 버킷이 없으면 만듭니다(최초 1회만 실제로 생성 요청이 나감). 공개 읽기 버킷입니다. */
async function ensureBucket(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
) {
  const { data: existing } = await supabase.storage.getBucket(BUCKET);
  if (existing) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  // 다른 요청이 동시에 먼저 만들었을 수 있으니, "이미 있음" 종류의 에러는 무시합니다.
  if (error && !/already exists/i.test(error.message)) {
    console.error("[listingPhotos] 버킷 생성 실패", error);
  }
}

function slugifyForPath(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file"
  );
}

/** 리사이즈 후 전부 JPEG로 저장하므로, 원본 확장자와 무관하게 항상 .jpg로 남깁니다. */
function toJpegFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./]+$/, "");
  return `${slugifyForPath(base)}.jpg`;
}

/** 관리자 화면(/admin/listings/[id]/edit)에서 특정 매물의 사진 전체를 순서대로 가져옵니다. */
export async function getListingPhotos(listingId: string): Promise<ListingPhoto[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listing_images")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[listingPhotos] 매물 사진 목록 조회 실패", error);
    return [];
  }

  return data.map(rowToPhoto);
}

export interface UploadListingPhotoInput {
  listingId: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array | Buffer | ArrayBuffer;
}

/**
 * 매물 사진 업로드: 웹 표시에 적합하게 리사이즈/압축한 뒤 Storage에 저장하고
 * listing_images에 행을 추가합니다. 평면도 업로드와 동일하게, DB 저장이
 * 실패하면 방금 올린 Storage 파일을 롤백해서 고아 파일이 남지 않게 합니다.
 */
export async function uploadListingPhoto(input: UploadListingPhotoInput): Promise<{
  photo?: ListingPhoto;
  error?: string;
  errorDetail?: ListingPhotoErrorDetail;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: listingExists } = await supabase
    .from("listings")
    .select("id")
    .eq("id", input.listingId)
    .maybeSingle();
  if (!listingExists) {
    return { error: "매물을 찾을 수 없습니다." };
  }

  await ensureBucket(supabase);

  const originalBuffer = Buffer.isBuffer(input.bytes)
    ? input.bytes
    : Buffer.from(input.bytes as ArrayBuffer);

  let resizedBuffer: Buffer;
  try {
    resizedBuffer = await resizeListingPhoto(originalBuffer);
  } catch (error) {
    console.error("[listingPhotos] 이미지 리사이즈 실패", error);
    return {
      error: "이미지를 처리하지 못했습니다(지원하지 않는 형식이거나 손상된 파일).",
    };
  }

  const path = `${slugifyForPath(input.listingId)}/${Date.now()}-${toJpegFileName(
    input.fileName,
  )}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(resizedBuffer), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error("[listingPhotos] Storage 업로드 실패", uploadError);
    return {
      error: "이미지 업로드에 실패했습니다.",
      errorDetail: toErrorDetail({ message: uploadError.message }),
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: existingMax } = await supabase
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", input.listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existingMax?.sort_order ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("listing_images")
    .insert({
      listing_id: input.listingId,
      url: publicUrl,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[listingPhotos] 행 저장 실패", {
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
        "[listingPhotos] 롤백용 Storage 파일 삭제 실패(고아 파일로 남을 수 있음)",
        rollbackError,
      );
    }

    return {
      error: "정보 저장에 실패해 업로드를 취소했습니다(이미지 파일도 함께 삭제됨).",
      errorDetail: toErrorDetail(insertError),
    };
  }

  return { photo: rowToPhoto(inserted) };
}

/** 사진 삭제: DB 행과 Storage 파일을 함께 정리합니다(listingId 일치 확인 포함). */
export async function deleteListingPhoto(
  listingId: string,
  photoId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("listing_images")
    .select("url, listing_id")
    .eq("id", photoId)
    .maybeSingle();

  if (fetchError) {
    console.error("[listingPhotos] 삭제 대상 조회 실패", fetchError);
    return { success: false, error: "사진 조회 중 오류가 발생했습니다." };
  }
  if (!existing || existing.listing_id !== listingId) {
    return { success: false, error: "사진을 찾을 수 없습니다." };
  }

  const { error: deleteError } = await supabase
    .from("listing_images")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    console.error("[listingPhotos] 삭제 실패", deleteError);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  const marker = `/object/public/${BUCKET}/`;
  const markerIndex = existing.url.indexOf(marker);
  if (markerIndex !== -1) {
    const path = existing.url.slice(markerIndex + marker.length);
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (storageError) {
      console.error("[listingPhotos] Storage 파일 삭제 실패", storageError);
    }
  }

  return { success: true };
}

/**
 * 사진 순서 변경(대표사진 지정 포함 — "맨 앞으로 이동"으로 처리). 넘어온
 * orderedIds가 실제로 이 매물의 사진 id 전체와 정확히 일치하는지 먼저
 * 검증해서, 다른 매물의 사진이 섞이거나 일부가 누락된 요청을 막습니다.
 */
export async function reorderListingPhotos(
  listingId: string,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from("listing_images")
    .select("id")
    .eq("listing_id", listingId);

  if (fetchError || !existingRows) {
    console.error("[listingPhotos] 순서 변경 대상 조회 실패", fetchError);
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
      supabase.from("listing_images").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("[listingPhotos] 순서 저장 실패", failed.error);
    return { success: false, error: "순서 저장에 실패했습니다." };
  }

  return { success: true };
}
