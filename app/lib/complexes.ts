import type { Complex } from "../data/complexes";
import { getSupabaseAdminClient, getSupabaseClient } from "./supabase/client";
import { complexRowToComplex } from "./supabase/mappers";

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
