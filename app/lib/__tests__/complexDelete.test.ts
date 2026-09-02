import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * DELETE /api/admin/complexes/[id]의 "23503(foreign_key_violation) → 409 +
 * 번역된 메시지" 경로 전용 테스트입니다. 이 경로는 화면에서 삭제 버튼이
 * 매물이 있는 단지에선 애초에 비활성화돼 있어 손으로는 도달할 수 없으므로,
 * 테스트가 없으면 실제로 동작하는지 확인할 방법이 없습니다(동시 요청으로
 * 매물이 막 생긴 경우에만 실제로 이 경로를 탑니다).
 */

const MOCK_COMPLEX_ROW = {
  id: "complex-1",
  name: "테스트단지",
  address: "경기도 김포시",
  property_type: "아파트",
  approval_date: null,
  total_households: null,
  buildings: null,
  parking_count: null,
  parking_per_household: null,
  heating: null,
  hallway_type: null,
  builder: null,
  max_floor: null,
  floor_area_ratio: null,
  building_coverage_ratio: null,
  management_office_phone: null,
  management_fee_won: null,
  management_fee_raw: null,
  management_fee_as_of: null,
  nearby_schools: [],
  subway: null,
  subway_distance: null,
  subway_walk_minutes: null,
  buses: [],
  features: [],
  molit_lawd_code: null,
  molit_apt_seq: null,
};

let mockComplexDeleteError: { code: string; message: string } | null = null;

/**
 * getComplexById는 공개 클라이언트(getSupabaseClient), deleteComplex는
 * service_role 클라이언트(getSupabaseAdminClient)를 쓰지만 이 테스트에서는
 * 둘 다 같은 모의 구현으로 충분합니다.
 */
function makeMockSupabaseClient() {
  return {
    from(table: string) {
      return {
        select: (_columns: string) => ({
          eq: (_column: string, _value: string) => {
            // image 테이블(select().eq())은 바로 await되므로 그 자체가 thenable이어야 하고,
            // complexes(select().eq().maybeSingle())는 .maybeSingle()까지 체이닝됩니다.
            const thenable = Promise.resolve({
              data: table === "complexes" ? null : [],
              error: null,
            }) as Promise<{ data: unknown; error: null }> & {
              maybeSingle: () => Promise<{ data: unknown; error: null }>;
            };
            thenable.maybeSingle = () =>
              Promise.resolve({
                data: table === "complexes" ? MOCK_COMPLEX_ROW : null,
                error: null,
              });
            return thenable;
          },
        }),
        delete: () => ({
          eq: (_column: string, _value: string) =>
            Promise.resolve({ error: mockComplexDeleteError }),
        }),
      };
    },
    storage: {
      from: () => ({ remove: () => Promise.resolve({ error: null }) }),
    },
  };
}

vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => makeMockSupabaseClient(),
  getSupabaseAdminClient: () => makeMockSupabaseClient(),
}));

describe("DELETE /api/admin/complexes/[id] — 23503(FK 제약 위반) 번역", () => {
  beforeEach(() => {
    mockComplexDeleteError = null;
  });

  it("Supabase가 23503을 반환하면 409와 번역된 메시지를 반환하고, 원문 에러를 노출하지 않는다", async () => {
    mockComplexDeleteError = {
      code: "23503",
      message:
        'update or delete on table "complexes" violates foreign key constraint "listings_complex_id_fkey" on table "listings"',
    };

    const { DELETE } = await import("../../api/admin/complexes/[id]/route");
    const request = new NextRequest("http://localhost/api/admin/complexes/complex-1");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "complex-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.errors).toEqual(["이 단지에 연결된 매물이 있어 삭제할 수 없습니다."]);

    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("23503");
    expect(bodyText).not.toContain("violates foreign key constraint");
    expect(bodyText).not.toContain("listings_complex_id_fkey");
  });

  it("23503이 아닌 다른 DB 에러는 500과 일반 메시지를 반환한다", async () => {
    mockComplexDeleteError = { code: "XX000", message: "일부러 낸 알 수 없는 오류" };

    const { DELETE } = await import("../../api/admin/complexes/[id]/route");
    const request = new NextRequest("http://localhost/api/admin/complexes/complex-1");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "complex-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors).toEqual(["단지를 삭제하지 못했습니다."]);
    expect(JSON.stringify(body)).not.toContain("일부러 낸 알 수 없는 오류");
  });
});
