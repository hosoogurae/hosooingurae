import { describe, expect, it, vi } from "vitest";

/**
 * fetchPublishedNotices는 getPublishedNotices(unstable_cache로 감싼 함수)가
 * 실패를 "성공적으로 캐싱"하지 않도록, 실패 시 빈 배열이 아니라 예외를
 * 던져야 합니다(Next.js unstable_cache 소스 확인: 콜백이 throw하면
 * cacheNewResult가 호출되지 않아 캐싱 자체가 안 됨). getPublishedNotices
 * 자체는 unstable_cache가 Next 요청 컨텍스트(incrementalCache) 없이는
 * 실행되지 않아 vitest에서 직접 테스트할 수 없으므로, 캐싱되는 대상인
 * fetchPublishedNotices를 직접 테스트해 이 계약을 고정합니다.
 */

let mockData: unknown[] | null;
let mockError: { message: string } | null;

vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => mockSupabaseClient,
}));

let mockSupabaseClient: ReturnType<typeof makeMockSupabaseClient> | null;

function makeMockSupabaseClient() {
  return {
    from: (_table: string) => ({
      select: (_columns: string) => ({
        eq: (_column: string, _value: string) => ({
          order: (_column: string, _opts: unknown) =>
            Promise.resolve({ data: mockData, error: mockError }),
        }),
      }),
    }),
  };
}

describe("fetchPublishedNotices — 실패는 절대 빈 배열로 뭉개지 않는다", () => {
  it("정상 조회(2건)면 매핑된 결과를 그대로 반환한다", async () => {
    mockSupabaseClient = makeMockSupabaseClient();
    mockData = [
      {
        source: "molit",
        title: "테스트 소식",
        source_url: "https://molit.go.kr/a",
        published_at: "2026-09-10T00:00:00Z",
      },
    ];
    mockError = null;

    const { fetchPublishedNotices } = await import("../publicNotices");
    const result = await fetchPublishedNotices();

    expect(result).toEqual([
      {
        source: "molit",
        title: "테스트 소식",
        sourceUrl: "https://molit.go.kr/a",
        publishedAt: "2026-09-10T00:00:00Z",
      },
    ]);
  });

  it("진짜로 0건이면(에러 없이 빈 배열) 예외 없이 빈 배열을 반환한다", async () => {
    mockSupabaseClient = makeMockSupabaseClient();
    mockData = [];
    mockError = null;

    const { fetchPublishedNotices } = await import("../publicNotices");

    await expect(fetchPublishedNotices()).resolves.toEqual([]);
  });

  it("Supabase 쿼리가 에러를 반환하면(예: Gateway Timeout) 예외를 던진다(빈 배열 아님)", async () => {
    mockSupabaseClient = makeMockSupabaseClient();
    mockData = null;
    mockError = { message: "Gateway Timeout" };

    const { fetchPublishedNotices } = await import("../publicNotices");

    await expect(fetchPublishedNotices()).rejects.toThrow();
  });

  it("Supabase 클라이언트 자체가 없으면(설정 누락) 예외를 던진다(빈 배열 아님)", async () => {
    mockSupabaseClient = null;

    const { fetchPublishedNotices } = await import("../publicNotices");

    await expect(fetchPublishedNotices()).rejects.toThrow();
  });
});
