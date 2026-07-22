import type { FloorPlanImage } from "../data/floorPlans";
import { cropFloorPlanPreview } from "./floorPlanImageProcessing";
import { getSupabaseAdminClient, getSupabaseClient } from "./supabase/client";
import type { FloorPlanImageRow } from "./supabase/database.types";

const BUCKET = "floor-plans";

/** Supabase가 돌려준 원본 에러 정보. 관리자 화면에 그대로 보여줘서 원인을 바로 알 수 있게 합니다. */
export interface FloorPlanErrorDetail {
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
} | null): FloorPlanErrorDetail | undefined {
  if (!error) return undefined;
  return {
    code: error.code,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function rowToFloorPlanImage(row: FloorPlanImageRow): FloorPlanImage {
  return {
    id: row.id,
    complexId: row.complex_id,
    unitType: row.unit_type,
    supplyArea: row.supply_area ?? undefined,
    exclusiveArea: row.exclusive_area ?? undefined,
    url: row.url,
    previewUrl: row.preview_url ?? undefined,
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
  supplyArea?: number;
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
export async function uploadFloorPlanImage(input: UploadFloorPlanInput): Promise<{
  image?: FloorPlanImage;
  error?: string;
  errorDetail?: FloorPlanErrorDetail;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  await ensureBucket(supabase);

  const path = `${slugifyForPath(input.complexId)}/${slugifyForPath(
    input.unitType,
  )}/${Date.now()}-${slugifyForPath(input.fileName)}`;

  // 원본은 손대지 않고 그대로 업로드합니다(확대 보기에서 면적표 등 원문 전체를 보여줘야 함).
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[floorPlans] Storage 업로드 실패", uploadError);
    return {
      error: "이미지 업로드에 실패했습니다.",
      errorDetail: toErrorDetail({ message: uploadError.message }),
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // 카드/썸네일에서 상단 정보 배너를 잘라낸 미리보기를 별도로 만들어 올립니다.
  // 실패해도 업로드 자체는 막지 않고(원본은 이미 저장됨), 표시할 때 원본으로 대체됩니다.
  let previewUrl: string | null = null;
  try {
    const originalBuffer = Buffer.isBuffer(input.bytes)
      ? input.bytes
      : Buffer.from(input.bytes as ArrayBuffer);
    const previewBuffer = await cropFloorPlanPreview(originalBuffer);
    const previewPath = path.replace(/(\.[^./]+)$/, "-preview$1");

    // Node Buffer를 그대로 넘기면 일부 런타임(Vercel 서버리스 등)의 fetch
    // 구현이 이를 문자열처럼 다뤄 바이너리가 깨지는 사례가 있어, 순수
    // Uint8Array로 변환해 넘깁니다.
    const { error: previewUploadError } = await supabase.storage
      .from(BUCKET)
      .upload(previewPath, new Uint8Array(previewBuffer), {
        contentType: input.contentType,
        upsert: false,
      });

    if (previewUploadError) throw previewUploadError;

    previewUrl = supabase.storage.from(BUCKET).getPublicUrl(previewPath).data
      .publicUrl;
  } catch (error) {
    console.error("[floorPlans] 미리보기 이미지 생성 실패, 원본으로 대체", error);
  }

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
      supply_area: input.supplyArea ?? null,
      exclusive_area: input.exclusiveArea ?? null,
      url: publicUrl,
      preview_url: previewUrl,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[floorPlans] 행 저장 실패", {
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
    });

    // DB 저장이 실패했으니 방금 올린 Storage 파일을 롤백해서 고아 파일이
    // 남지 않게 합니다.
    const { error: rollbackError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (rollbackError) {
      console.error(
        "[floorPlans] 롤백용 Storage 파일 삭제 실패(고아 파일로 남을 수 있음)",
        rollbackError,
      );
    }

    return {
      error: "정보 저장에 실패해 업로드를 취소했습니다(이미지 파일도 함께 삭제됨).",
      errorDetail: toErrorDetail(insertError),
    };
  }

  return { image: rowToFloorPlanImage(inserted) };
}

export interface FloorPlanImageUpdate {
  unitType?: string;
  /** null을 넘기면 값을 지웁니다(빈 값으로). undefined면 건드리지 않습니다. */
  supplyArea?: number | null;
  exclusiveArea?: number | null;
}

/** 타입명 오타 수정, 또는 기존에 올려둔 평면도에 면적만 나중에 채워 넣을 때 사용. */
export async function updateFloorPlanImage(
  id: string,
  updates: FloorPlanImageUpdate,
): Promise<{
  image?: FloorPlanImage;
  error?: string;
  errorDetail?: FloorPlanErrorDetail;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const patch: {
    unit_type?: string;
    supply_area?: number | null;
    exclusive_area?: number | null;
  } = {};
  if (updates.unitType !== undefined) patch.unit_type = updates.unitType;
  if (updates.supplyArea !== undefined) patch.supply_area = updates.supplyArea;
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
    console.error("[floorPlans] 평면도 수정 실패", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { error: "수정에 실패했습니다.", errorDetail: toErrorDetail(error) };
  }
  if (!data) {
    return { error: "평면도를 찾을 수 없습니다." };
  }

  return { image: rowToFloorPlanImage(data) };
}

/** 자동 매칭에 쓰는 면적 허용 오차(㎡). 공급/전용 둘 다 이 오차 안에 있어야 후보로 봅니다. */
export const AREA_MATCH_TOLERANCE = 0.05;

/**
 * 매물 원문에서 파싱된 공급면적·전용면적과, 그 단지에 이미 등록된 평면도의
 * 공급면적·전용면적을 비교해 후보 타입명을 찾습니다. 둘 중 하나라도 없는(null)
 * 평면도는 비교 대상에서 제외합니다 — 값이 없는 걸 억지로 맞다고 추측하지 않습니다.
 */
export async function findMatchingUnitTypes(
  complexId: string,
  supplyArea: number,
  exclusiveArea: number,
): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("floor_plan_images")
    .select("unit_type")
    .eq("complex_id", complexId)
    .not("supply_area", "is", null)
    .not("exclusive_area", "is", null)
    .gte("supply_area", supplyArea - AREA_MATCH_TOLERANCE)
    .lte("supply_area", supplyArea + AREA_MATCH_TOLERANCE)
    .gte("exclusive_area", exclusiveArea - AREA_MATCH_TOLERANCE)
    .lte("exclusive_area", exclusiveArea + AREA_MATCH_TOLERANCE);

  if (error || !data) {
    console.error("[floorPlans] 면적 매칭 조회 실패", error);
    return [];
  }

  return Array.from(new Set(data.map((row) => row.unit_type))).sort((a, b) =>
    a.localeCompare(b),
  );
}

interface UnitTypeBuildingOverride {
  /** 면적만으로는 구분 안 되는 후보 타입 집합(순서 무관, 정확히 일치해야 적용). */
  candidates: string[];
  /** 이 동 목록에 해당하면 preferred를, 아니면 fallback을 선택합니다. */
  buildings: string[];
  preferred: string;
  fallback: string;
}

/**
 * 면적이 같아 구분되지 않는 타입들의 동 기반 예외 규칙.
 * (2026-07-22 기준 호수마을e편한세상2단지 실제 데이터: 110D/110D-1은 공급
 * 110.88 / 전용 84.65로 동일하지만, 110D-1은 205동·207동에만 존재합니다.)
 * 앞으로 같은 종류의 예외가 더 생기면 이 목록에 추가하면 됩니다.
 */
const UNIT_TYPE_BUILDING_OVERRIDES: UnitTypeBuildingOverride[] = [
  {
    candidates: ["110D", "110D-1"],
    buildings: ["205동", "207동"],
    preferred: "110D-1",
    fallback: "110D",
  },
];

/**
 * 면적 매칭 후보가 위 예외 규칙에 해당하면 동 번호로 하나로 좁힙니다.
 * 규칙에 해당하지 않거나 동 정보가 없으면 후보를 그대로 돌려줍니다(추측하지 않음).
 */
export function resolveUnitTypeCandidates(
  candidates: string[],
  building: string | undefined,
): string[] {
  for (const rule of UNIT_TYPE_BUILDING_OVERRIDES) {
    const isExactMatch =
      candidates.length === rule.candidates.length &&
      rule.candidates.every((candidate) => candidates.includes(candidate));
    if (!isExactMatch) continue;
    if (!building) return candidates;
    return [rule.buildings.includes(building) ? rule.preferred : rule.fallback];
  }
  return candidates;
}

export interface ReprocessResult {
  id: string;
  unitType: string;
  success: boolean;
  error?: string;
  previewBytes?: number;
}

/**
 * 이미 업로드된 평면도 원본은 그대로 두고, 카드/썸네일용 미리보기 이미지만
 * 새로 만들어(cropFloorPlanPreview) 업로드하고 preview_url을 채웁니다.
 * floor_plan_images.url(원본)이나 매물/평면도 연결 관계는 전혀 바뀌지
 * 않습니다. 관리자 화면 버튼이나 일회성 스크립트에서 호출하는 용도입니다.
 */
export async function reprocessAllFloorPlanImages(): Promise<{
  results: ReprocessResult[];
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { results: [] };

  const { data: rows, error } = await supabase
    .from("floor_plan_images")
    .select("*");

  if (error || !rows) {
    console.error("[floorPlans] 재처리 대상 조회 실패", error);
    return { results: [] };
  }

  const marker = `/object/public/${BUCKET}/`;
  const results: ReprocessResult[] = [];

  for (const row of rows) {
    const markerIndex = row.url.indexOf(marker);
    if (markerIndex === -1) {
      results.push({
        id: row.id,
        unitType: row.unit_type,
        success: false,
        error: "Storage 경로를 URL에서 찾지 못했습니다.",
      });
      continue;
    }
    const originalPath = row.url.slice(markerIndex + marker.length);
    const previewPath = originalPath.replace(/(\.[^./]+)$/, "-preview$1");

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(originalPath);
      if (downloadError || !fileData) {
        throw downloadError ?? new Error("다운로드 결과가 비어있습니다.");
      }

      const originalBuffer = Buffer.from(await fileData.arrayBuffer());
      const previewBuffer = await cropFloorPlanPreview(originalBuffer);

      const { error: previewUploadError } = await supabase.storage
        .from(BUCKET)
        .upload(previewPath, new Uint8Array(previewBuffer), {
          contentType: fileData.type || "image/jpeg",
          upsert: true,
        });
      if (previewUploadError) throw previewUploadError;

      const previewUrl = supabase.storage.from(BUCKET).getPublicUrl(
        previewPath,
      ).data.publicUrl;

      const { error: updateError } = await supabase
        .from("floor_plan_images")
        .update({ preview_url: previewUrl })
        .eq("id", row.id);
      if (updateError) throw updateError;

      results.push({
        id: row.id,
        unitType: row.unit_type,
        success: true,
        previewBytes: previewBuffer.length,
      });
    } catch (err) {
      results.push({
        id: row.id,
        unitType: row.unit_type,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { results };
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
