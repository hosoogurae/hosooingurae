import type { Customer, CustomerInput, CustomerWithStats } from "../data/customers";
import { normalizePhone } from "./phoneNormalize";
import { getSupabaseAdminClient } from "./supabase/client";
import type { CustomerInsert } from "./supabase/database.types";
import { customerInputToInsert, customerRowToCustomer } from "./supabase/mappers";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

/**
 * 연락처(phone_normalized) 기준으로 기존 고객을 찾습니다. 이름은 절대
 * 비교 기준에 넣지 않습니다(요청사항: "이름만으로는 중복 처리하지
 * 않습니다"). 연락처가 없으면(빈 값) 애초에 중복이라는 개념이 성립하지
 * 않으므로 항상 undefined를 반환합니다 — 전화번호 없는 고객을 여러 명
 * 등록해도 서로 중복으로 취급되지 않습니다.
 */
export async function findCustomerByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<Customer | undefined> {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone_normalized", normalized)
    .maybeSingle();

  if (error) {
    console.error("[customers] 연락처 중복 확인 실패", error);
    return undefined;
  }
  return data ? customerRowToCustomer(data) : undefined;
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[customers] 고객 조회 실패", error);
    return undefined;
  }
  return data ? customerRowToCustomer(data) : undefined;
}

/** 여러 고객의 최근 상담일/상담 건수를 한 번에 조회해 customer_id별로 묶습니다(N+1 방지). */
async function fetchConsultationStatsByCustomerId(
  supabase: SupabaseClient,
  customerIds: string[],
): Promise<Map<string, { lastConsultationAt?: string; consultationCount: number }>> {
  const stats = new Map<string, { lastConsultationAt?: string; consultationCount: number }>();
  if (customerIds.length === 0) return stats;

  const { data, error } = await supabase
    .from("consultations")
    .select("customer_id, started_at")
    .in("customer_id", customerIds)
    .order("started_at", { ascending: false });

  if (error || !data) {
    console.error("[customers] 상담 통계 조회 실패", error);
    return stats;
  }

  for (const row of data) {
    if (!row.customer_id) continue;
    const existing = stats.get(row.customer_id);
    if (existing) {
      existing.consultationCount += 1;
    } else {
      // started_at desc로 이미 정렬돼 있으므로 처음 만나는 값이 최신입니다.
      stats.set(row.customer_id, { lastConsultationAt: row.started_at, consultationCount: 1 });
    }
  }
  return stats;
}

/**
 * 고객 목록을 조회합니다. search가 있으면 이름 또는 연락처(정규화 기준)에
 * 부분 일치하는 고객만 반환합니다. 검색어에서 숫자가 하나도 안 나오면
 * (예: 이름만 입력) 연락처 조건은 아예 빼서 불필요한 매칭을 피합니다.
 */
export async function getAllCustomers(options: {
  search?: string;
} = {}): Promise<CustomerWithStats[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  let query = supabase.from("customers").select("*").order("created_at", { ascending: false });

  const search = options.search?.trim();
  if (search) {
    const normalizedPhone = normalizePhone(search);
    const orParts = [`name.ilike.%${search}%`];
    if (normalizedPhone) orParts.push(`phone_normalized.ilike.%${normalizedPhone}%`);
    query = query.or(orParts.join(","));
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[customers] 목록 조회 실패", error);
    return [];
  }

  const statsByCustomerId = await fetchConsultationStatsByCustomerId(
    supabase,
    data.map((row) => row.id),
  );

  return data.map((row) => {
    const customer = customerRowToCustomer(row);
    const stats = statsByCustomerId.get(row.id);
    return {
      ...customer,
      lastConsultationAt: stats?.lastConsultationAt,
      consultationCount: stats?.consultationCount ?? 0,
    };
  });
}

export interface CreateCustomerResult {
  customer?: Customer;
  /** 같은 연락처의 기존 고객이 있어서 새로 만들지 않고 그 고객을 대신 반환한 경우. */
  duplicate?: Customer;
  error?: string;
}

/**
 * 신규 고객을 생성합니다. 전화번호 없이도 등록할 수 있습니다(요청사항).
 * 연락처를 입력했고 그 연락처의 기존 고객이 이미 있으면 새로 만들지
 * 않고 duplicate로 기존 고객을 돌려줍니다 — 화면에서 "이미 등록된
 * 고객입니다" 안내 후 기존 고객과 연결할지 사용자가 선택하게 하기
 * 위함입니다. 연락처가 없으면 중복 검사 자체를 하지 않고, 이름만으로는
 * 절대 자동 병합하지 않습니다.
 */
export async function createCustomer(input: CustomerInput): Promise<CreateCustomerResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };

  if (!input.name.trim()) return { error: "이름을 입력해주세요." };

  const hasPhoneInput = Boolean(input.phone && input.phone.trim());
  const normalizedPhone = hasPhoneInput ? normalizePhone(input.phone!) : "";
  if (hasPhoneInput && !normalizedPhone) {
    return { error: "연락처 형식을 확인해주세요." };
  }

  if (normalizedPhone) {
    const existing = await findCustomerByPhone(supabase, normalizedPhone);
    if (existing) return { duplicate: existing };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert(customerInputToInsert(input))
    .select("*")
    .single();

  if (error) {
    // 중복 검사 이후 동시 요청 등으로 유니크 제약을 어긴 경우(경쟁 상태)를 대비합니다.
    if (error.code === "23505" && normalizedPhone) {
      const raceExisting = await findCustomerByPhone(supabase, normalizedPhone);
      if (raceExisting) return { duplicate: raceExisting };
    }
    console.error("[customers] 고객 생성 실패", error);
    return { error: "고객 등록에 실패했습니다." };
  }

  return { customer: customerRowToCustomer(data) };
}

export interface UpdateCustomerInput {
  name?: string;
  /** 빈 문자열을 보내면 연락처를 지웁니다(전화번호 없는 고객으로 전환). */
  phone?: string;
  memo?: string;
  desiredTransactionType?: "매매" | "전세" | "월세";
  desiredArea?: string;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<{ customer?: Customer; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Supabase가 설정되어 있지 않습니다." };

  const patch: Partial<CustomerInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) {
    const trimmed = input.phone.trim();
    const normalized = trimmed ? normalizePhone(trimmed) : "";
    if (trimmed && !normalized) return { error: "연락처 형식을 확인해주세요." };
    patch.phone = trimmed || null;
    patch.phone_normalized = normalized || null;
  }
  if (input.memo !== undefined) patch.memo = input.memo || null;
  if (input.desiredTransactionType !== undefined) {
    patch.desired_transaction_type = input.desiredTransactionType;
  }
  if (input.desiredArea !== undefined) patch.desired_area = input.desiredArea || null;

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { error: "다른 고객이 이미 사용 중인 연락처입니다." };
    }
    console.error("[customers] 고객 수정 실패", error);
    return { error: "고객 정보 수정에 실패했습니다." };
  }
  if (!data) return { error: "고객을 찾을 수 없습니다." };

  return { customer: customerRowToCustomer(data) };
}
