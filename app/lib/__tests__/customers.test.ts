import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCustomer, findCustomerByPhone } from "../customers";
import { normalizePhone } from "../phoneNormalize";
import { customerInputToInsert } from "../supabase/mappers";

describe("normalizePhone", () => {
  it("하이픈/공백을 제거하고 숫자만 남긴다", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("010 1234 5678")).toBe("01012345678");
  });

  it("숫자가 없으면 빈 문자열이다", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("abc")).toBe("");
  });
});

describe("customerInputToInsert — phone/phone_normalized 파생 규칙", () => {
  it("전화번호가 있으면 원본은 phone에, 정규화 값은 phone_normalized에 저장한다", () => {
    const insert = customerInputToInsert({ name: "김철수", phone: "010-1234-5678" });
    expect(insert.phone).toBe("010-1234-5678");
    expect(insert.phone_normalized).toBe("01012345678");
  });

  it("전화번호가 없으면(undefined) phone과 phone_normalized 모두 null이다", () => {
    const insert = customerInputToInsert({ name: "김철수" });
    expect(insert.phone).toBeNull();
    expect(insert.phone_normalized).toBeNull();
  });

  it("전화번호가 빈 문자열이어도 둘 다 null이다", () => {
    const insert = customerInputToInsert({ name: "김철수", phone: "   " });
    expect(insert.phone).toBeNull();
    expect(insert.phone_normalized).toBeNull();
  });
});

const EXISTING_ROW = {
  id: "customer-1",
  name: "기존고객",
  phone: "010-9999-8888",
  phone_normalized: "01099998888",
  memo: null,
  desired_transaction_type: null,
  desired_area: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/**
 * getSupabaseAdminClient()가 반환하는 클라이언트를 흉내 냅니다.
 * createCustomer/findCustomerByPhone은 .select().eq().maybeSingle()
 * (중복 확인) 또는 .insert().select().single()(생성)만 씁니다.
 */
let mockExistingRow: Record<string, unknown> | null = null;
let mockInsertResultRow: Record<string, unknown> | null = null;
let mockInsertError: { code: string } | null = null;

vi.mock("../supabase/client", () => ({
  getSupabaseAdminClient: () => ({
    from() {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: () => Promise.resolve({ data: mockExistingRow, error: null }),
        insert: () => builder,
        single: () =>
          Promise.resolve({
            data: mockInsertError ? null : mockInsertResultRow,
            error: mockInsertError,
          }),
      };
      return builder;
    },
  }),
}));

describe("createCustomer — 연락처 중복 확인(이름만으로는 절대 병합하지 않음)", () => {
  beforeEach(() => {
    mockExistingRow = null;
    mockInsertResultRow = null;
    mockInsertError = null;
  });

  it("같은 연락처의 기존 고객이 있으면 새로 만들지 않고 duplicate로 반환한다", async () => {
    mockExistingRow = EXISTING_ROW;
    const result = await createCustomer({ name: "다른이름", phone: "010-9999-8888" });
    expect(result.duplicate?.id).toBe("customer-1");
    expect(result.customer).toBeUndefined();
  });

  it("전화번호가 없으면 중복 검사를 하지 않고 그대로 새로 만든다", async () => {
    mockInsertResultRow = { ...EXISTING_ROW, id: "new-id", phone: null, phone_normalized: null };
    const result = await createCustomer({ name: "전화번호없는고객" });
    expect(result.duplicate).toBeUndefined();
    expect(result.customer?.id).toBe("new-id");
  });

  it("이름이 같아도 연락처가 다르면(또는 DB에 일치하는 행이 없으면) 중복으로 취급하지 않는다", async () => {
    mockExistingRow = null; // phone_normalized가 다르므로 서버 조회 결과가 없다고 가정
    mockInsertResultRow = {
      ...EXISTING_ROW,
      id: "new-id-2",
      phone: "010-1111-2222",
      phone_normalized: "01011112222",
    };
    const result = await createCustomer({ name: "기존고객", phone: "010-1111-2222" });
    expect(result.duplicate).toBeUndefined();
    expect(result.customer?.id).toBe("new-id-2");
  });
});

describe("findCustomerByPhone", () => {
  it("연락처가 빈 값이면 조회 없이 undefined를 반환한다(불필요한 쿼리 자체를 안 함)", async () => {
    mockExistingRow = EXISTING_ROW;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findCustomerByPhone({} as any, "");
    expect(result).toBeUndefined();
  });
});
