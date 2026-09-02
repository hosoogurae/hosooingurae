import type { Complex } from "../data/complexes";
import type { PropertyType } from "../data/listings";
import { normalizeComplexName } from "./complexNameNormalize";
import type { ComplexFieldsInput } from "./complexValidation";
import { getFloorPlanCountsByComplex } from "./floorPlans";
import { extractStoragePath } from "./storagePhotos";
import { getSupabaseAdminClient, getSupabaseClient } from "./supabase/client";
import { complexRowToComplex } from "./supabase/mappers";
import type { ComplexInsert, ComplexUpdate } from "./supabase/database.types";

export async function getAllComplexes(): Promise<Complex[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("complexes")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("[complexes] 단지 목록 조회 실패", error);
    return [];
  }

  return data.map(complexRowToComplex);
}

export async function getComplexById(
  complexId: string,
): Promise<Complex | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("complexes")
    .select("*")
    .eq("id", complexId)
    .maybeSingle();

  if (error) {
    console.error("[complexes] 단지 조회 실패", error);
    return undefined;
  }

  return data ? complexRowToComplex(data) : undefined;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateComplexId(name: string): string {
  const base = slugify(name) || "complex";
  return `${base}-${Date.now().toString(36)}`;
}

export interface NewComplexInput {
  name: string;
  /** 모르면 비워둘 수 있습니다. 관리자가 나중에 매물 관리 화면에서 보완합니다. */
  address?: string;
  /** 매물 등록 화면에서 함께 입력한 매물종류를 그대로 단지의 매물종류로도 기록해둡니다. */
  propertyType?: PropertyType;
}

/**
 * "새 단지 추가"로 단지명·주소만 입력됐을 때 최소 정보로 단지를 생성합니다.
 * 사용승인일/세대수/난방 등 나머지 세부 정보는 비워두고, 나중에 보완할 수 있습니다.
 * service role(관리자) 클라이언트가 필요하므로 서버 코드에서만 호출하세요.
 */
export async function createComplex(
  input: NewComplexInput,
): Promise<{ complex?: Complex; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      error:
        "Supabase가 설정되어 있지 않습니다. SUPABASE_SECRET_KEY를 확인해주세요.",
    };
  }

  // 같은 단지를 매물 등록마다 새로 만들지 않도록, insert 전에 이름이
  // (공백·특수문자 차이를 무시하고) 일치하는 기존 단지가 있는지 먼저
  // 찾아 재사용합니다. 대부분의 요청은 여기서 끝나 아래 upsert까지
  // 가지 않습니다.
  const normalized = normalizeComplexName(input.name);
  const { data: rows, error: lookupError } = await supabase
    .from("complexes")
    .select("id, name");

  if (lookupError) {
    console.error("[complexes] 기존 단지 조회 실패", lookupError);
    return { error: "단지 정보를 조회하지 못했습니다." };
  }

  const existingId = rows?.find(
    (row) => normalizeComplexName(row.name) === normalized,
  )?.id;

  if (existingId) {
    const existing = await getComplexById(existingId);
    if (existing) {
      return { complex: existing };
    }
  }

  // 위 조회 이후 다른 요청이 같은 이름으로 먼저 insert를 끝냈을 수 있으므로
  // (조회→생성 사이의 경쟁 조건), 단순 insert 대신 upsert +
  // onConflict: name_normalized를 씁니다. complexes.name_normalized의
  // unique 인덱스(supabase/migrations/0020)가 최종 방어선이라, 충돌이 나면
  // ignoreDuplicates로 기존 행을 그대로 두고 내 새 값으로 덮어쓰지
  // 않습니다. upsert 응답만으로는 "내가 만든 건지 남이 먼저 만든 건지"를
  // 안정적으로 구분할 수 없어(버전에 따라 무시된 충돌 행을 안 돌려줄 수
  // 있음), 바로 뒤에 name_normalized로 다시 조회해 최종 승자 행을
  // 확정합니다.
  const id = generateComplexId(input.name);

  const { error: upsertError } = await supabase.from("complexes").upsert(
    {
      id,
      name: input.name,
      address: input.address ?? "",
      property_type: input.propertyType ?? null,
      nearby_schools: [],
      buses: [],
      features: [],
    },
    { onConflict: "name_normalized", ignoreDuplicates: true },
  );

  if (upsertError) {
    console.error("[complexes] 새 단지 생성 실패", upsertError);
    return { error: "단지 정보를 저장하지 못했습니다." };
  }

  const { data: finalRow, error: finalError } = await supabase
    .from("complexes")
    .select("*")
    .eq("name_normalized", normalized)
    .maybeSingle();

  if (finalError || !finalRow) {
    console.error("[complexes] 생성된 단지 재조회 실패", finalError);
    return { error: "단지 정보를 저장하지 못했습니다." };
  }

  return { complex: complexRowToComplex(finalRow) };
}

/**
 * ComplexFieldsInput(camelCase, 부분 입력)을 DB patch(snake_case)로 변환합니다.
 * undefined인 키는 건드리지 않고, null인 키는 명시적으로 지웁니다.
 * create/update 양쪽에서 공유합니다.
 */
export function toDbPatch(input: ComplexFieldsInput): ComplexUpdate {
  const patch: ComplexUpdate = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.propertyType !== undefined) patch.property_type = input.propertyType;
  if (input.approvalDate !== undefined) patch.approval_date = input.approvalDate;
  if (input.totalHouseholds !== undefined) patch.total_households = input.totalHouseholds;
  if (input.buildings !== undefined) patch.buildings = input.buildings;
  if (input.parkingCount !== undefined) patch.parking_count = input.parkingCount;
  if (input.parkingPerHousehold !== undefined) {
    patch.parking_per_household = input.parkingPerHousehold;
  }
  if (input.heating !== undefined) patch.heating = input.heating;
  if (input.hallwayType !== undefined) patch.hallway_type = input.hallwayType;
  if (input.builder !== undefined) patch.builder = input.builder;
  if (input.maxFloor !== undefined) patch.max_floor = input.maxFloor;
  if (input.floorAreaRatio !== undefined) patch.floor_area_ratio = input.floorAreaRatio;
  if (input.buildingCoverageRatio !== undefined) {
    patch.building_coverage_ratio = input.buildingCoverageRatio;
  }
  if (input.managementOfficePhone !== undefined) {
    patch.management_office_phone = input.managementOfficePhone;
  }
  if (input.managementFeeWon !== undefined) {
    patch.management_fee_won = input.managementFeeWon;
  }
  if (input.managementFeeRaw !== undefined) {
    patch.management_fee_raw = input.managementFeeRaw;
  }
  if (input.managementFeeAsOf !== undefined) {
    patch.management_fee_as_of = input.managementFeeAsOf;
  }
  if (input.nearbySchools !== undefined) patch.nearby_schools = input.nearbySchools;
  if (input.subway !== undefined) patch.subway = input.subway;
  if (input.subwayDistance !== undefined) patch.subway_distance = input.subwayDistance;
  if (input.subwayWalkMinutes !== undefined) {
    patch.subway_walk_minutes = input.subwayWalkMinutes;
  }
  if (input.buses !== undefined) patch.buses = input.buses;
  if (input.features !== undefined) patch.features = input.features;
  if (input.molitLawdCode !== undefined) patch.molit_lawd_code = input.molitLawdCode;
  if (input.molitAptSeq !== undefined) patch.molit_apt_seq = input.molitAptSeq;
  return patch;
}

/**
 * /admin/complexes 신규 등록 화면 전용. 단지명만 있으면 생성할 수 있고, 나머지는
 * 전부 나중에(수정 화면에서) 채울 수 있습니다 — 4개 영역을 전부 채워야만 저장
 * 가능한 구조로 만들지 않기 위함입니다. 기존 createComplex(매물 등록 화면의
 * "새 단지 추가" 인라인 플로우 전용)는 그대로 두고 이 함수를 별도로 둡니다.
 */
export async function createComplexFull(
  input: ComplexFieldsInput & { name: string },
): Promise<{ complex?: Complex; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      error:
        "Supabase가 설정되어 있지 않습니다. SUPABASE_SECRET_KEY를 확인해주세요.",
    };
  }

  const id = generateComplexId(input.name);
  const patch = toDbPatch(input);

  const row: ComplexInsert = {
    id,
    name: input.name,
    address: "",
    // property_type은 DB에서 not null이라(0002 마이그레이션도 이 컬럼은 완화하지
    // 않았습니다), 값이 없으면 기존 createComplex/새 단지 추가 플로우와 동일하게
    // "아파트"를 기본값으로 둡니다.
    property_type: "아파트",
    nearby_schools: [],
    buses: [],
    features: [],
    ...patch,
  };

  const { data, error } = await supabase
    .from("complexes")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    // 23505 = Postgres unique_violation. complexes_name_normalized_key
    // (supabase/migrations/0020)에 걸려 실패한 경우, 이 화면은 의도적으로
    // "새로" 등록하는 화면이라 createComplex처럼 조용히 기존 단지를
    // 대신 돌려주지 않고, 관리자가 뭐가 문제인지 바로 알 수 있게 알려줍니다.
    if (error?.code === "23505") {
      return { error: "이미 같은 이름의 단지가 있습니다." };
    }
    console.error("[complexes] 새 단지 생성 실패(전체 필드)", error);
    return { error: "단지 정보를 저장하지 못했습니다." };
  }

  return { complex: complexRowToComplex(data) };
}

/**
 * /admin/complexes 수정 화면에서 단지의 어느 필드든(기본정보/AI 검색용
 * 정보/MOLIT 연동) 부분 수정할 때 씁니다. 전달된 필드만 갱신하고 나머지는
 * 그대로 둡니다.
 */
export async function updateComplex(
  id: string,
  patch: ComplexFieldsInput,
): Promise<{ complex?: Complex; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const dbPatch = toDbPatch(patch);

  const { data, error } = await supabase
    .from("complexes")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[complexes] 단지 정보 수정 실패", error);
    return {
      error: `단지 정보를 수정하지 못했습니다. (${error.message})`,
    };
  }
  if (!data) {
    return { error: "단지를 찾을 수 없습니다." };
  }

  return { complex: complexRowToComplex(data) };
}

export interface ComplexDeletionInfo {
  /** 이 단지를 참조하는 매물 수(listings.complex_id는 ON DELETE RESTRICT라
   * 1건이라도 있으면 삭제가 DB에서 막힙니다). */
  listingCount: number;
  /** complex_images/floor_plan_images/unit_type_images 합계(ON DELETE
   * CASCADE라 삭제를 막지는 않지만, 함께 지워진다는 걸 미리 알려주는 용도). */
  imageCount: number;
}

/** /admin/complexes/[id]/edit의 "위험 구역" 삭제 확인 UI 전용. */
export async function getComplexDeletionInfo(
  complexId: string,
): Promise<ComplexDeletionInfo> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { listingCount: 0, imageCount: 0 };
  }

  const [listings, complexImages, floorPlanImages, unitTypeImages] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("complex_id", complexId),
    supabase
      .from("complex_images")
      .select("id", { count: "exact", head: true })
      .eq("complex_id", complexId),
    supabase
      .from("floor_plan_images")
      .select("id", { count: "exact", head: true })
      .eq("complex_id", complexId),
    supabase
      .from("unit_type_images")
      .select("id", { count: "exact", head: true })
      .eq("complex_id", complexId),
  ]);

  return {
    listingCount: listings.count ?? 0,
    imageCount:
      (complexImages.count ?? 0) +
      (floorPlanImages.count ?? 0) +
      (unitTypeImages.count ?? 0),
  };
}

/** 단지 삭제 시 CASCADE로 함께 지워지는 이미지 행의 Storage 버킷·경로. */
const CASCADED_IMAGE_TABLES = [
  { table: "complex_images", bucket: "complex-photos" },
  { table: "unit_type_images", bucket: "complex-photos" },
  { table: "floor_plan_images", bucket: "floor-plans" },
] as const;

/**
 * /admin/complexes/[id]/edit의 "위험 구역"에서만 호출합니다. 진짜 방어선은
 * listings.complex_id의 ON DELETE RESTRICT(DB)이고, 이 함수는 그 결과를
 * 사람이 이해할 수 있는 메시지로 바꿔주는 역할만 합니다 — 매물이 있으면 화면이
 * 버튼을 미리 비활성화하지만, 확인과 삭제 사이 동시 요청으로 매물이 새로
 * 생겨도 최종적으로는 DB가 막고 여기서 그 에러(23503)를 잡아 번역합니다.
 */
export async function deleteComplex(
  complexId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  // CASCADE로 함께 지워질 이미지 행은 삭제되고 나면 URL을 더는 알 수 없으므로,
  // 단지를 지우기 전에 Storage 경로를 미리 모아둡니다.
  const pathsByBucket = new Map<string, string[]>();
  for (const { table, bucket } of CASCADED_IMAGE_TABLES) {
    const { data } = await supabase.from(table).select("url").eq("complex_id", complexId);
    const paths = (data ?? [])
      .map((row) => extractStoragePath(row.url, bucket))
      .filter((path): path is string => path !== null);
    if (paths.length === 0) continue;
    pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), ...paths]);
  }

  const { error } = await supabase.from("complexes").delete().eq("id", complexId);

  if (error) {
    // 23503 = Postgres foreign_key_violation. listings.complex_id의 ON DELETE
    // RESTRICT에 걸린 경우이며, 원문 Postgres 에러를 그대로 노출하지 않습니다.
    if (error.code === "23503") {
      return { error: "이 단지에 연결된 매물이 있어 삭제할 수 없습니다." };
    }
    console.error("[complexes] 단지 삭제 실패", error);
    return { error: "단지를 삭제하지 못했습니다." };
  }

  // 단지 삭제(및 이미지 행 CASCADE)는 이미 끝났으므로, Storage 정리가
  // 실패해도 삭제 자체를 실패로 취급하지 않고 경고만 남깁니다(고아 파일로
  // 남을 수 있음 — deleteComplexImage/deleteFloorPlanImage와 같은 방침).
  for (const [bucket, paths] of pathsByBucket) {
    const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
    if (storageError) {
      console.error(`[complexes] 단지 삭제 후 Storage 정리 실패 (${bucket})`, storageError);
    }
  }

  return { success: true };
}

export type CompletionLevel = "complete" | "partial" | "empty";

export interface ComplexCompletion {
  basic: CompletionLevel;
  ai: CompletionLevel;
  molitConnected: boolean;
  floorPlanCount: number;
  basicMissing: string[];
  aiMissing: string[];
  molitMissing: string[];
}

function missingBasicFields(complex: Complex): string[] {
  return [
    [complex.name, "단지명"],
    [complex.address, "주소"],
    [complex.propertyType, "매물종류"],
    [complex.approvalDate, "사용승인일"],
    [complex.totalHouseholds, "세대수"],
  ].filter(([value]) => value === undefined || value === null || value === "")
    .map(([, label]) => label as string);
}

export function computeComplexCompletion(
  complex: Complex,
  floorPlanCount: number,
): ComplexCompletion {
  const basicMissing = missingBasicFields(complex);
  const hasTransportOrSchool = Boolean(complex.transportation.subway) ||
    complex.nearbySchools.length > 0;
  const molitMissing = [
    ...(!complex.molit?.lawdCode ? ["lawdCode"] : []),
    ...(!complex.molit?.aptSeq ? ["aptSeq"] : []),
  ];
  return {
    basic: basicMissing.length === 0 ? "complete" : "partial",
    ai: hasTransportOrSchool ? "complete" : "partial",
    molitConnected: molitMissing.length === 0,
    floorPlanCount,
    basicMissing,
    aiMissing: hasTransportOrSchool ? [] : ["지하철 또는 학교 정보"],
    molitMissing,
  };
}

/** /admin/complexes 목록 화면 전용: 단지 목록 + 영역별 완성도를 함께 내려줍니다. */
export async function getComplexesWithCompletion(): Promise<
  (Complex & { completion: ComplexCompletion })[]
> {
  const [complexes, floorPlanCounts] = await Promise.all([
    getAllComplexes(),
    getFloorPlanCountsByComplex(),
  ]);

  return complexes.map((complex) => ({
    ...complex,
    completion: computeComplexCompletion(complex, floorPlanCounts[complex.id] ?? 0),
  }));
}
