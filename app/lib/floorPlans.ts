import type { FloorPlanImage } from "../data/floorPlans";
import { getSupabaseAdminClient, getSupabaseClient } from "./supabase/client";
import type { FloorPlanImageRow } from "./supabase/database.types";

const BUCKET = "floor-plans";

function rowToFloorPlanImage(row: FloorPlanImageRow): FloorPlanImage {
  return {
    id: row.id,
    complexId: row.complex_id,
    unitType: row.unit_type,
    exclusiveArea: row.exclusive_area ?? undefined,
    url: row.url,
    sortOrder: row.sort_order,
  };
}

/** 공개 조회: 특정 단지 + 타입의 평면도(매물 상세페이지에서 사용). */
export async function getFloorPlanImages(
  complexId: string,
  unitType: string,
): Promise<FloorPlanImage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("floor_plan_images")
    .select("*")
    .eq("complex_id", complexId)
    .eq("unit_type", unitType)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[floorPlans] 평면도 조회 실패", error);
    return [];
  }

  return data.map(rowToFloorPlanImage);
}

/** 관리자용: 단지의 모든 평면도를 타입 구분 없이 전부 가져옵니다(관리 화면 목록용). */
export async function getFloorPlanImagesByComplex(
  complexId: string,
): Promise<FloorPlanImage[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("floor_plan_images")
    .select("*")
    .eq("complex_id", complexId)
    .order("unit_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[floorPlans] 관리자 평면도 목록 조회 실패", error);
    return [];
  }

  return data.map(rowToFloorPlanImage);
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
    console.error("[floorPlans] 버킷 생성 실패", error);
  }
}

function slugifyForPath(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
}

export interface UploadFloorPlanInput {
  complexId: string;
  unitType: string;
  /** ㎡ 단위. 없으면 자동 매칭 대상에서 빠질 뿐 업로드 자체는 그대로 됩니다. */
  exclusiveArea?: number;
  fileName: string;
  contentType: string;
  bytes: Uint8Array | Buffer | ArrayBuffer;
}

/**
 * 평면도 이미지를 Storage에 업로드하고 floor_plan_images에 행을 추가합니다.
 * 관리자가 직접 올리는 파일이므로 출처 확인 없이 그대로 저장합니다(네이버
 * 자동 수집 기능과는 무관 — 그건 보류 상태).
 */
export async function uploadFloorPlanImage(
  input: UploadFloorPlanInput,
): Promise<{ image?: FloorPlanImage; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  await ensureBucket(supabase);

  const path = `${slugifyForPath(input.complexId)}/${slugifyForPath(
    input.unitType,
  )}/${Date.now()}-${slugifyForPath(input.fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[floorPlans] Storage 업로드 실패", uploadError);
    return { error: "이미지 업로드에 실패했습니다." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: existingMax } = await supabase
    .from("floor_plan_images")
    .select("sort_order")
    .eq("complex_id", input.complexId)
    .eq("unit_type", input.unitType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existingMax?.sort_order ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("floor_plan_images")
    .insert({
      complex_id: input.complexId,
      unit_type: input.unitType,
      exclusive_area: input.exclusiveArea ?? null,
      url: publicUrl,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[floorPlans] 행 저장 실패", insertError);
    // 스토리지에는 이미 올라갔지만 정리하지 않고 에러만 알립니다(수동 정리 필요).
    return { error: "이미지는 업로드됐지만 정보 저장에 실패했습니다." };
  }

  return { image: rowToFloorPlanImage(inserted) };
}

export interface FloorPlanImageUpdate {
  unitType?: string;
  /** null을 넘기면 값을 지웁니다(빈 값으로). undefined면 건드리지 않습니다. */
  exclusiveArea?: number | null;
}

/** 타입명 오타 수정, 또는 기존에 올려둔 평면도에 전용면적만 나중에 채워 넣을 때 사용. */
export async function updateFloorPlanImage(
  id: string,
  updates: FloorPlanImageUpdate,
): Promise<{ image?: FloorPlanImage; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const patch: { unit_type?: string; exclusive_area?: number | null } = {};
  if (updates.unitType !== undefined) patch.unit_type = updates.unitType;
  if (updates.exclusiveArea !== undefined) {
    patch.exclusive_area = updates.exclusiveArea;
  }

  const { data, error } = await supabase
    .from("floor_plan_images")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[floorPlans] 평면도 수정 실패", error);
    return { error: "수정에 실패했습니다." };
  }
  if (!data) {
    return { error: "평면도를 찾을 수 없습니다." };
  }

  return { image: rowToFloorPlanImage(data) };
}

/** 자동 매칭에 쓰는 전용면적 허용 오차(㎡). */
export const EXCLUSIVE_AREA_MATCH_TOLERANCE = 0.05;

/**
 * 매물 원문에서 파싱된 전용면적과, 그 단지에 이미 등록된 평면도의 전용면적을
 * 비교해 후보 타입명을 찾습니다. 전용면적이 없는(null) 평면도는 비교 대상에서
 * 제외합니다 — 값이 없는 걸 억지로 맞다고 추측하지 않습니다.
 */
export async function findMatchingUnitTypes(
  complexId: string,
  exclusiveArea: number,
): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("floor_plan_images")
    .select("unit_type")
    .eq("complex_id", complexId)
    .not("exclusive_area", "is", null)
    .gte("exclusive_area", exclusiveArea - EXCLUSIVE_AREA_MATCH_TOLERANCE)
    .lte("exclusive_area", exclusiveArea + EXCLUSIVE_AREA_MATCH_TOLERANCE);

  if (error || !data) {
    console.error("[floorPlans] 전용면적 매칭 조회 실패", error);
    return [];
  }

  return Array.from(new Set(data.map((row) => row.unit_type))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function deleteFloorPlanImage(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("floor_plan_images")
    .select("url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[floorPlans] 삭제 대상 조회 실패", fetchError);
    return { success: false, error: "평면도 조회 중 오류가 발생했습니다." };
  }
  if (!existing) {
    return { success: false, error: "평면도를 찾을 수 없습니다." };
  }

  const { error: deleteError } = await supabase
    .from("floor_plan_images")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[floorPlans] 삭제 실패", deleteError);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  // Storage 파일도 함께 정리합니다(실패해도 DB 삭제 자체는 이미 끝났으므로 경고만 남김).
  const marker = `/object/public/${BUCKET}/`;
  const markerIndex = existing.url.indexOf(marker);
  if (markerIndex !== -1) {
    const path = existing.url.slice(markerIndex + marker.length);
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (storageError) {
      console.error("[floorPlans] Storage 파일 삭제 실패", storageError);
    }
  }

  return { success: true };
}
