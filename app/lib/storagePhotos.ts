import type { getSupabaseAdminClient } from "./supabase/client";

/**
 * listingPhotos.ts / floorPlans.ts에 각자 복붙돼 있던 Storage 공용 로직을
 * 뽑아낸 헬퍼입니다. 기존 두 모듈은 이미 잘 동작하므로 건드리지 않고,
 * 새로 추가하는 complexImages.ts / unitTypeImages.ts만 이 헬퍼를 씁니다.
 */

export interface PhotoErrorDetail {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export function toPhotoErrorDetail(
  error: {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  } | null,
): PhotoErrorDetail | undefined {
  if (!error) return undefined;
  return {
    code: error.code,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

/** 버킷이 없으면 만듭니다(최초 1회만 실제로 생성 요청이 나감). 공개 읽기 버킷입니다. */
export async function ensurePhotoBucket(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  bucket: string,
): Promise<void> {
  const { data: existing } = await supabase.storage.getBucket(bucket);
  if (existing) return;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  // 다른 요청이 동시에 먼저 만들었을 수 있으니, "이미 있음" 종류의 에러는 무시합니다.
  if (error && !/already exists/i.test(error.message)) {
    console.error(`[storagePhotos] 버킷 생성 실패 (${bucket})`, error);
  }
}

export function slugifyForPath(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file"
  );
}

/** 리사이즈 후 전부 JPEG로 저장하므로, 원본 확장자와 무관하게 항상 .jpg로 남깁니다. */
export function toJpegFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./]+$/, "");
  return `${slugifyForPath(base)}.jpg`;
}

/** 저장된 공개 URL에서 버킷 내부 경로만 역추출합니다(삭제 시 사용). 마커를 못 찾으면 null. */
export function extractStoragePath(
  publicUrl: string,
  bucket: string,
): string | null {
  const marker = `/object/public/${bucket}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  return publicUrl.slice(markerIndex + marker.length);
}
