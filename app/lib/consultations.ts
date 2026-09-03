import type {
  Consultation,
  ConsultationDetail,
  ConsultationEndInput,
  ConsultationStartInput,
  ConsultationSummary,
  ConsultationTask,
  ConsultationTaskInput,
  ConsultationTaskUpdateInput,
  ConsultationUpdateInput,
} from "../data/consultations";
import { getSupabaseAdminClient } from "./supabase/client";
import type { ConsultationTaskInsert } from "./supabase/database.types";
import {
  consultationRowToConsultation,
  consultationUpdateToRowPatch,
  extractedFieldRowToField,
  taskRowToTask,
  transcriptRowToEntry,
} from "./supabase/mappers";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

interface CustomerJoin {
  id: string;
  name: string;
  phone: string | null;
}

/** 여러 상담의 고객 이름/연락처를 한 번에 조회해 customer_id별로 묶습니다(N+1 방지). */
async function fetchCustomersByIds(
  supabase: SupabaseClient,
  customerIds: string[],
): Promise<Map<string, CustomerJoin>> {
  const map = new Map<string, CustomerJoin>();
  if (customerIds.length === 0) return map;

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .in("id", customerIds);

  if (error || !data) {
    console.error("[consultations] 고객 정보 조회 실패", error);
    return map;
  }
  for (const row of data) {
    map.set(row.id, row);
  }
  return map;
}

export async function getAllConsultations(options: {
  customerId?: string;
  status?: Consultation["status"];
  tag?: string;
} = {}): Promise<ConsultationSummary[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("consultations")
    .select("*")
    .order("started_at", { ascending: false });

  if (options.customerId) query = query.eq("customer_id", options.customerId);
  if (options.status) query = query.eq("status", options.status);
  // 태그 배열에 해당 값이 포함된 상담만(예: "반려동물 고객만 보기").
  if (options.tag) query = query.contains("tags", [options.tag]);

  const { data, error } = await query;
  if (error || !data) {
    console.error("[consultations] 목록 조회 실패", error);
    return [];
  }

  const customerIds = Array.from(
    new Set(data.map((row) => row.customer_id).filter((id): id is string => Boolean(id))),
  );
  const customersById = await fetchCustomersByIds(supabase, customerIds);

  return data.map((row) => {
    const consultation = consultationRowToConsultation(row);
    const customer = row.customer_id ? customersById.get(row.customer_id) : undefined;
    return {
      ...consultation,
      customerName: customer?.name,
      customerPhone: customer?.phone ?? undefined,
    };
  });
}

export async function getConsultationById(id: string): Promise<ConsultationDetail | undefined> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return undefined;

  const { data: row, error } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[consultations] 상담 조회 실패", error);
    return undefined;
  }
  if (!row) return undefined;

  const [{ data: transcriptRows }, { data: fieldRows }, { data: taskRows }, customersById] =
    await Promise.all([
      supabase
        .from("consultation_transcripts")
        .select("*")
        .eq("consultation_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("consultation_extracted_fields")
        .select("*")
        .eq("consultation_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("consultation_tasks")
        .select("*")
        .eq("consultation_id", id)
        .order("created_at", { ascending: true }),
      row.customer_id
        ? fetchCustomersByIds(supabase, [row.customer_id])
        : Promise.resolve(new Map<string, CustomerJoin>()),
    ]);

  const consultation = consultationRowToConsultation(row);
  const customer = row.customer_id ? customersById.get(row.customer_id) : undefined;

  return {
    ...consultation,
    customerName: customer?.name,
    customerPhone: customer?.phone ?? undefined,
    transcripts: (transcriptRows ?? []).map(transcriptRowToEntry),
    extractedFieldsList: (fieldRows ?? []).map(extractedFieldRowToField),
    tasks: (taskRows ?? []).map(taskRowToTask),
  };
}

/** "상담 시작" — 고객 선택/신규 고객/고객 없이 시작 모두 허용합니다(customerId는 optional). */
export async function startConsultation(
  input: ConsultationStartInput,
  createdBy?: string,
): Promise<{ consultation?: Consultation; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      customer_id: input.customerId ?? null,
      mode: "manual",
      status: "in_progress",
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[consultations] 상담 시작 실패", error);
    return { error: "상담을 시작하지 못했습니다." };
  }
  return { consultation: consultationRowToConsultation(data) };
}

/**
 * "상담 진행" 중 자동저장. 값이 있는 필드만 반영하고, appendTranscript/
 * extractedFields는 기존 항목을 지우지 않고 추가/upsert만 합니다 — 저장을
 * 여러 번 나눠 호출해도(자동저장) 이전에 기록한 내용이 사라지지 않습니다.
 */
export async function updateConsultation(
  id: string,
  input: ConsultationUpdateInput,
): Promise<{ consultation?: ConsultationDetail; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };

  const rowPatch = consultationUpdateToRowPatch({
    customerId: input.customerId === null ? undefined : input.customerId,
    internalMemo: input.internalMemo,
    smsDraft: input.smsDraft,
    tags: input.tags,
  });
  // customerId를 명시적으로 null로 보낸 경우(고객 연결 해제)도 반영합니다.
  if (input.customerId === null) rowPatch.customer_id = null;

  if (Object.keys(rowPatch).length > 0) {
    const { error } = await supabase.from("consultations").update(rowPatch).eq("id", id);
    if (error) {
      console.error("[consultations] 상담 수정 실패", error);
      return { error: "상담 저장에 실패했습니다." };
    }
  }

  if (input.appendTranscript && input.appendTranscript.length > 0) {
    const { data: lastRow } = await supabase
      .from("consultation_transcripts")
      .select("sort_order")
      .eq("consultation_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextOrder = (lastRow?.sort_order ?? -1) + 1;
    const inserts = input.appendTranscript.map((entry) => ({
      consultation_id: id,
      speaker: entry.speaker,
      text: entry.text,
      sort_order: nextOrder++,
    }));

    const { error } = await supabase.from("consultation_transcripts").insert(inserts);
    if (error) {
      console.error("[consultations] 메모 추가 실패", error);
      return { error: "메모 저장에 실패했습니다." };
    }
  }

  if (input.extractedFields && input.extractedFields.length > 0) {
    const upsertRows = input.extractedFields.map((field) => ({
      consultation_id: id,
      field_key: field.fieldKey,
      field_value: field.fieldValue,
      confidence: field.confidence ?? "confirmed",
    }));
    const { error } = await supabase
      .from("consultation_extracted_fields")
      .upsert(upsertRows, { onConflict: "consultation_id,field_key" });
    if (error) {
      console.error("[consultations] 희망조건 저장 실패", error);
      return { error: "희망조건 저장에 실패했습니다." };
    }
  }

  if (input.removeExtractedFieldKeys && input.removeExtractedFieldKeys.length > 0) {
    const { error } = await supabase
      .from("consultation_extracted_fields")
      .delete()
      .eq("consultation_id", id)
      .in("field_key", input.removeExtractedFieldKeys);
    if (error) {
      console.error("[consultations] 희망조건 삭제 실패", error);
      return { error: "희망조건 삭제에 실패했습니다." };
    }
  }

  const consultation = await getConsultationById(id);
  if (!consultation) return { error: "상담을 찾을 수 없습니다." };
  return { consultation };
}

/**
 * "상담 종료" — 상담시간/요약/고객조건/확인필요정보/후속조치/문자초안/
 * 내부메모/태그를 확정 저장합니다. transcript는 그동안 기록된
 * consultation_transcripts를 순서대로 이어붙인 스냅샷으로 자동 채웁니다.
 * followUpTasks는 consultations.follow_up_tasks(스냅샷)에 남기는 동시에,
 * 실제로 체크할 수 있는 consultation_tasks 행도 함께 만듭니다.
 */
export async function endConsultation(
  id: string,
  input: ConsultationEndInput,
): Promise<{ consultation?: Consultation; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };

  const { data: existingRow, error: fetchError } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[consultations] 종료 대상 조회 실패", fetchError);
    return { error: "상담 정보를 확인하는 중 오류가 발생했습니다." };
  }
  if (!existingRow) return { error: "상담을 찾을 수 없습니다." };

  const { data: transcriptRows } = await supabase
    .from("consultation_transcripts")
    .select("text, corrected_text")
    .eq("consultation_id", id)
    .order("sort_order", { ascending: true });

  const transcript = (transcriptRows ?? []).map((row) => row.text).join("\n");
  const correctedTranscript =
    input.correctedTranscript ??
    (transcriptRows ?? []).map((row) => row.corrected_text ?? row.text).join("\n");

  const startedAtMs = new Date(existingRow.started_at).getTime();
  const endedAt = new Date();
  const durationSeconds =
    input.durationSeconds ?? Math.max(0, Math.round((endedAt.getTime() - startedAtMs) / 1000));

  const { data: updated, error: updateError } = await supabase
    .from("consultations")
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
      status: "ended",
      transcript,
      corrected_transcript: correctedTranscript,
      summary: input.summary ?? null,
      extracted_conditions: input.extractedConditions ?? existingRow.extracted_conditions,
      uncertain_fields: input.uncertainFields ?? existingRow.uncertain_fields,
      follow_up_tasks: input.followUpTasks?.map((task) => task.description) ?? existingRow.follow_up_tasks,
      sms_draft: input.smsDraft ?? existingRow.sms_draft,
      internal_memo: input.internalMemo ?? existingRow.internal_memo,
      tags: input.tags ?? existingRow.tags,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[consultations] 상담 종료 실패", updateError);
    return { error: "상담 종료 저장에 실패했습니다." };
  }

  if (input.followUpTasks && input.followUpTasks.length > 0) {
    const { error: taskError } = await supabase.from("consultation_tasks").insert(
      input.followUpTasks.map((task) => ({
        consultation_id: id,
        customer_id: updated.customer_id,
        description: task.description,
        due_date: task.dueDate ?? null,
      })),
    );
    if (taskError) {
      console.error("[consultations] 후속조치 생성 실패", taskError);
      // 상담 종료 자체는 이미 저장됐으므로 실패로 처리하지 않고 경고만 남깁니다.
    }
  }

  return { consultation: consultationRowToConsultation(updated) };
}

export async function getAllConsultationTasks(options: {
  status?: ConsultationTask["status"];
  customerId?: string;
  consultationId?: string;
} = {}): Promise<ConsultationTask[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("consultation_tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);
  if (options.customerId) query = query.eq("customer_id", options.customerId);
  if (options.consultationId) query = query.eq("consultation_id", options.consultationId);

  const { data, error } = await query;
  if (error || !data) {
    console.error("[consultation-tasks] 목록 조회 실패", error);
    return [];
  }
  return data.map(taskRowToTask);
}

export async function createConsultationTask(
  input: ConsultationTaskInput,
): Promise<{ task?: ConsultationTask; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };
  if (!input.description.trim()) return { error: "내용을 입력해주세요." };

  const { data, error } = await supabase
    .from("consultation_tasks")
    .insert({
      consultation_id: input.consultationId ?? null,
      customer_id: input.customerId ?? null,
      task_type: input.taskType ?? "general",
      description: input.description,
      due_date: input.dueDate ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[consultation-tasks] 생성 실패", error);
    return { error: "후속조치 생성에 실패했습니다." };
  }
  return { task: taskRowToTask(data) };
}

export async function updateConsultationTask(
  id: string,
  input: ConsultationTaskUpdateInput,
): Promise<{ task?: ConsultationTask; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };

  const patch: Partial<ConsultationTaskInsert> = {};
  if (input.description !== undefined) patch.description = input.description;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from("consultation_tasks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[consultation-tasks] 수정 실패", error);
    return { error: "후속조치 수정에 실패했습니다." };
  }
  if (!data) return { error: "후속조치를 찾을 수 없습니다." };
  return { task: taskRowToTask(data) };
}
