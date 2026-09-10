import { getSupabaseAdminClient } from "./supabase/client";
import type { ContractPrepItemRow } from "./supabase/database.types";

/**
 * 계약 준비물 안내 문자 화면 전용 — admin_sms_templates(관리자 앱이 쓰는
 * 테이블)와는 완전히 별개의 새 테이블입니다. contract_prep_items도 공개
 * select 정책이 없어 모든 함수가 service_role 클라이언트만 씁니다
 * (admin_sms_templates와 동일한 설계 원칙).
 *
 * role 값 공간은 두 종류를 함께 담습니다:
 * - CONTRACT_PREP_ROLES(매수인/매도인/임차인/임대인) + "공통": 역할별
 *   기본 준비물 체크리스트.
 * - SPECIAL_CONTRACT_TYPES(공동명의/대리계약/법인계약): 기본 역할과
 *   별개로 켤 수 있는 특수계약 옵션의 추가 준비물 목록. 같은 테이블·
 *   같은 컬럼을 재사용해서 새 테이블을 만들지 않았습니다.
 */

export const CONTRACT_PREP_ROLES = [
  "매수인",
  "매도인",
  "임차인",
  "임대인",
] as const;
export type ContractPrepRole = (typeof CONTRACT_PREP_ROLES)[number];

export const SPECIAL_CONTRACT_TYPES = [
  "공동명의",
  "대리계약",
  "법인계약",
] as const;
export type SpecialContractType = (typeof SPECIAL_CONTRACT_TYPES)[number];

export type ContractPrepItemRole =
  | "공통"
  | ContractPrepRole
  | SpecialContractType;

export interface ContractPrepItem {
  id: string;
  role: ContractPrepItemRole;
  label: string;
  sortOrder: number;
  /** 이 항목을 화면에 처음 보여줄 때 기본으로 체크해 둘지. 관리자가 항목별로 정합니다. */
  defaultChecked: boolean;
  createdAt: string;
  updatedAt: string;
}

function rowToItem(row: ContractPrepItemRow): ContractPrepItem {
  return {
    id: row.id,
    role: row.role as ContractPrepItem["role"],
    label: row.label,
    sortOrder: row.sort_order,
    defaultChecked: row.default_checked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllContractPrepItems(): Promise<ContractPrepItem[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("contract_prep_items")
    .select("*")
    .order("role", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[contractPrepItems] 목록 조회 실패", error);
    return [];
  }

  return data.map(rowToItem);
}

export async function createContractPrepItem(input: {
  role: ContractPrepItem["role"];
  label: string;
  sortOrder?: number;
  defaultChecked?: boolean;
}): Promise<{ item?: ContractPrepItem; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("contract_prep_items")
    .insert({
      role: input.role,
      label: input.label,
      sort_order: input.sortOrder ?? 0,
      default_checked: input.defaultChecked ?? true,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[contractPrepItems] 생성 실패", error);
    return { error: "항목 저장에 실패했습니다." };
  }

  return { item: rowToItem(data) };
}

export async function updateContractPrepItem(
  id: string,
  input: {
    role?: ContractPrepItem["role"];
    label?: string;
    sortOrder?: number;
    defaultChecked?: boolean;
  },
): Promise<{ item?: ContractPrepItem; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const patch: {
    role?: string;
    label?: string;
    sort_order?: number;
    default_checked?: boolean;
  } = {};
  if (input.role !== undefined) patch.role = input.role;
  if (input.label !== undefined) patch.label = input.label;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.defaultChecked !== undefined) patch.default_checked = input.defaultChecked;

  const { data, error } = await supabase
    .from("contract_prep_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[contractPrepItems] 수정 실패", error);
    return { error: "항목 수정에 실패했습니다." };
  }
  if (!data) {
    return { error: "항목을 찾을 수 없습니다." };
  }

  return { item: rowToItem(data) };
}

export async function deleteContractPrepItem(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { error } = await supabase.from("contract_prep_items").delete().eq("id", id);

  if (error) {
    console.error("[contractPrepItems] 삭제 실패", error);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  return { success: true };
}
