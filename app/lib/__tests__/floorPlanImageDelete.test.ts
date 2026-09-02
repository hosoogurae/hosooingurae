import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * deleteFloorPlanImage가 url뿐 아니라 preview_url(크롭된 미리보기, 있는 경우만)의
 * Storage 파일도 함께 지우는지 확인합니다. 이전에는 url만 지우고 preview_url은
 * Storage에 고아 파일로 남았습니다.
 */

const BUCKET = "floor-plans";
const MARKER = `/object/public/${BUCKET}/`;

let mockExistingRow: { url: string; preview_url: string | null } | null = null;
let removedPaths: string[][] = [];

vi.mock("../supabase/client", () => ({
  getSupabaseAdminClient: () => ({
    from(table: string) {
      return {
        select: (_columns: string) => ({
          eq: (_column: string, _value: string) => ({
            maybeSingle: () =>
              Promise.resolve({ data: mockExistingRow, error: null }),
          }),
        }),
        delete: () => ({
          eq: (_column: string, _value: string) =>
            Promise.resolve({ error: null }),
        }),
        __table: table,
      };
    },
    storage: {
      from: (_bucket: string) => ({
        remove: (paths: string[]) => {
          removedPaths.push(paths);
          return Promise.resolve({ error: null });
        },
      }),
    },
  }),
}));

describe("deleteFloorPlanImage — url/preview_url Storage 정리", () => {
  beforeEach(() => {
    mockExistingRow = null;
    removedPaths = [];
  });

  it("preview_url이 있으면 url·preview_url 두 파일을 함께 지운다", async () => {
    mockExistingRow = {
      url: `https://x.supabase.co${MARKER}complex-1/84A/original.jpg`,
      preview_url: `https://x.supabase.co${MARKER}complex-1/84A/preview.jpg`,
    };

    const { deleteFloorPlanImage } = await import("../floorPlans");
    const result = await deleteFloorPlanImage("floor-plan-1");

    expect(result.success).toBe(true);
    expect(removedPaths).toEqual([
      ["complex-1/84A/original.jpg", "complex-1/84A/preview.jpg"],
    ]);
  });

  it("preview_url이 없으면 url 파일만 지운다", async () => {
    mockExistingRow = {
      url: `https://x.supabase.co${MARKER}complex-1/84A/original.jpg`,
      preview_url: null,
    };

    const { deleteFloorPlanImage } = await import("../floorPlans");
    const result = await deleteFloorPlanImage("floor-plan-1");

    expect(result.success).toBe(true);
    expect(removedPaths).toEqual([["complex-1/84A/original.jpg"]]);
  });
});
