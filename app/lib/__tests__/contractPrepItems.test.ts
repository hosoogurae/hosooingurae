import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * contract_prep_items에 건 (role, label) unique 제약(23505) 위반을
 * createContractPrepItem/updateContractPrepItem이 "같은 이름의 준비물이
 * 이미 있습니다"로 번역하는지 확인합니다 — complexDelete.test.ts의
 * 23503(FK 위반) 번역과 같은 방식입니다. 원문 Postgres 에러 텍스트를
 * 그대로 노출하지 않아야 합니다.
 */

let mockInsertError: { code: string; message: string } | null = null;
let mockUpdateError: { code: string; message: string } | null = null;

const MOCK_ROW = {
  id: "item-1",
  role: "공동명의",
  label: "공동명의자 전원의 신분증",
  sort_order: 0,
  default_checked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeMockSupabaseClient() {
  return {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve(
              mockInsertError
                ? { data: null, error: mockInsertError }
                : { data: MOCK_ROW, error: null },
            ),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () =>
              Promise.resolve(
                mockUpdateError
                  ? { data: null, error: mockUpdateError }
                  : { data: MOCK_ROW, error: null },
              ),
          }),
        }),
      }),
    }),
  };
}

vi.mock("../supabase/client", () => ({
  getSupabaseAdminClient: () => makeMockSupabaseClient(),
}));

describe("contractPrepItems — 23505(unique 제약 위반) 번역", () => {
  beforeEach(() => {
    mockInsertError = null;
    mockUpdateError = null;
  });

  it("생성 시 23505가 나면 '같은 이름의 준비물이 이미 있습니다'로 번역한다", async () => {
    mockInsertError = {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "contract_prep_items_role_label_key"',
    };

    const { createContractPrepItem } = await import("../contractPrepItems");
    const result = await createContractPrepItem({
      role: "공동명의",
      label: "공동명의자 전원의 신분증",
    });

    expect(result.item).toBeUndefined();
    expect(result.error).toBe("같은 이름의 준비물이 이미 있습니다.");
    expect(result.error).not.toContain("23505");
    expect(result.error).not.toContain("constraint");
  });

  it("생성 시 23505가 아닌 다른 오류는 기존 일반 메시지를 반환한다", async () => {
    mockInsertError = { code: "XX000", message: "일부러 낸 알 수 없는 오류" };

    const { createContractPrepItem } = await import("../contractPrepItems");
    const result = await createContractPrepItem({ role: "공동명의", label: "새 항목" });

    expect(result.error).toBe("항목 저장에 실패했습니다.");
    expect(result.error).not.toContain("일부러 낸 알 수 없는 오류");
  });

  it("수정 시 23505가 나면 '같은 이름의 준비물이 이미 있습니다'로 번역한다", async () => {
    mockUpdateError = {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "contract_prep_items_role_label_key"',
    };

    const { updateContractPrepItem } = await import("../contractPrepItems");
    const result = await updateContractPrepItem("item-1", { label: "대리인 도장" });

    expect(result.item).toBeUndefined();
    expect(result.error).toBe("같은 이름의 준비물이 이미 있습니다.");
  });

  it("수정 시 23505가 아닌 다른 오류는 기존 일반 메시지를 반환한다", async () => {
    mockUpdateError = { code: "XX000", message: "일부러 낸 알 수 없는 오류" };

    const { updateContractPrepItem } = await import("../contractPrepItems");
    const result = await updateContractPrepItem("item-1", { label: "대리인 도장" });

    expect(result.error).toBe("항목 수정에 실패했습니다.");
    expect(result.error).not.toContain("일부러 낸 알 수 없는 오류");
  });
});
