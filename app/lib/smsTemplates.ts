import { getSupabaseAdminClient } from "./supabase/client";
import type { AdminSmsTemplateRow } from "./supabase/database.types";

/**
 * 관리자 앱의 "내 문자양식" — admin_sms_templates는 공개 select 정책이
 * 없어서(관리자 전용 데이터) 모든 함수가 service_role 클라이언트만
 * 씁니다. listing_submissions와 동일한 설계 원칙입니다.
 */

export interface AdminSmsTemplate {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

function rowToTemplate(row: AdminSmsTemplateRow): AdminSmsTemplate {
  return {
    id: row.id,
    name: row.name,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllSmsTemplates(): Promise<AdminSmsTemplate[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("admin_sms_templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[smsTemplates] 목록 조회 실패", error);
    return [];
  }

  return data.map(rowToTemplate);
}

export async function createSmsTemplate(input: {
  name: string;
  body: string;
}): Promise<{ template?: AdminSmsTemplate; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("admin_sms_templates")
    .insert({ name: input.name, body: input.body })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[smsTemplates] 생성 실패", error);
    return { error: "양식 저장에 실패했습니다." };
  }

  return { template: rowToTemplate(data) };
}

export async function updateSmsTemplate(
  id: string,
  input: { name?: string; body?: string },
): Promise<{ template?: AdminSmsTemplate; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const patch: { name?: string; body?: string } = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.body !== undefined) patch.body = input.body;

  const { data, error } = await supabase
    .from("admin_sms_templates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[smsTemplates] 수정 실패", error);
    return { error: "양식 수정에 실패했습니다." };
  }
  if (!data) {
    return { error: "양식을 찾을 수 없습니다." };
  }

  return { template: rowToTemplate(data) };
}

export async function deleteSmsTemplate(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { error } = await supabase.from("admin_sms_templates").delete().eq("id", id);

  if (error) {
    console.error("[smsTemplates] 삭제 실패", error);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  return { success: true };
}
