import type { Complex } from "../data/complexes";
import { normalizeComplexName } from "./complexNameNormalize";
import type { ComplexFieldsInput } from "./complexValidation";
import { getFloorPlanCountsByComplex } from "./floorPlans";
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
  /** 매물 등록 화면에서 함께 입력한 매물종류를 그대로 단지의 건축물 용도로도 기록해둡니다. */
  propertyType?: string;
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
  // 찾아 재사용합니다. name_normalized에 대한 DB unique 제약이 아직 없어서
  // (supabase/migrations/0020에서 추가 예정 — 기존 중복 정리가 먼저 끝나야
  // 걸 수 있음) 이 조회만으로는 완전히 동시인 요청까지는 못 막습니다.
  // 그 마이그레이션이 적용되면 이 조회 뒤에 upsert(onConflict)를 붙여
  // 마저 보강합니다.
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

  const id = generateComplexId(input.name);

  const { data, error } = await supabase
    .from("complexes")
    .insert({
      id,
      name: input.name,
      address: input.address ?? "",
      property_type: input.propertyType ?? null,
      nearby_schools: [],
      buses: [],
      features: [],
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[complexes] 새 단지 생성 실패", error);
    return { error: "단지 정보를 저장하지 못했습니다." };
  }

  return { complex: complexRowToComplex(data) };
}

/**
 * ComplexFieldsInput(camelCase, 부분 입력)을 DB patch(snake_case)로 변환합니다.
 * undefined인 키는 건드리지 않고, null인 키는 명시적으로 지웁니다.
 * create/update 양쪽에서 공유합니다.
 */
function toDbPatch(input: ComplexFieldsInput): ComplexUpdate {
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
    return { error: "단지 정보를 수정하지 못했습니다." };
  }
  if (!data) {
    return { error: "단지를 찾을 수 없습니다." };
  }

  return { complex: complexRowToComplex(data) };
}

export type CompletionLevel = "complete" | "partial" | "empty";

export interface ComplexCompletion {
  basic: CompletionLevel;
  ai: CompletionLevel;
  molitConnected: boolean;
  floorPlanCount: number;
}

/** 기본정보로 취급하는 필드. scoring.ts와 무관하게 매물 상세페이지 노출용 정보들. */
const BASIC_INFO_FIELDS = (complex: Complex): unknown[] => [
  complex.address || undefined,
  complex.approvalDate,
  complex.totalHouseholds,
  complex.buildings,
  complex.builder,
  complex.heating,
  complex.hallwayType,
  complex.maxFloor,
  complex.floorAreaRatio,
  complex.buildingCoverageRatio,
  complex.parkingCount,
  complex.parkingPerHousehold,
];

/** app/lib/recommend/scoring.ts가 실제로 점수 계산에 쓰는 필드만. */
const AI_INFO_FIELDS = (complex: Complex): unknown[] => [
  complex.transportation.subway,
  complex.transportation.subwayWalkMinutes,
  complex.nearbySchools.length > 0 ? complex.nearbySchools : undefined,
  complex.totalHouseholds,
  complex.parkingPerHousehold,
];

function levelFromFields(fields: unknown[]): CompletionLevel {
  const filled = fields.filter((value) => value !== undefined && value !== null).length;
  if (filled === 0) return "empty";
  if (filled === fields.length) return "complete";
  return "partial";
}

export function computeComplexCompletion(
  complex: Complex,
  floorPlanCount: number,
): ComplexCompletion {
  return {
    basic: levelFromFields(BASIC_INFO_FIELDS(complex)),
    ai: levelFromFields(AI_INFO_FIELDS(complex)),
    molitConnected: Boolean(complex.molit?.lawdCode && complex.molit?.aptSeq),
    floorPlanCount,
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
