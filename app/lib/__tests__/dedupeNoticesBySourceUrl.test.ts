import { describe, expect, it } from "vitest";
import { dedupeNoticesBySourceUrl, type ParsedNotice } from "../noticeSources";

function notice(overrides: Partial<ParsedNotice>): ParsedNotice {
  return {
    source: "molit",
    title: "제목",
    sourceUrl: "https://example.com/a",
    publishedAt: "2026-09-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("dedupeNoticesBySourceUrl", () => {
  it("중복이 없으면 그대로 돌려준다", () => {
    const notices = [
      notice({ sourceUrl: "https://example.com/a" }),
      notice({ sourceUrl: "https://example.com/b" }),
    ];
    expect(dedupeNoticesBySourceUrl(notices)).toEqual(notices);
  });

  it("같은 (source, source_url)이 여럿이면 published_at이 가장 최근인 것만 남긴다", () => {
    const older = notice({
      title: "[보도자료] 오래된 제목",
      sourceUrl: "https://example.com/dup",
      publishedAt: "2026-09-10T00:00:00.000Z",
    });
    const newer = notice({
      title: "[차관동정] 최신 제목",
      sourceUrl: "https://example.com/dup",
      publishedAt: "2026-09-11T00:00:00.000Z",
    });

    const result = dedupeNoticesBySourceUrl([older, newer]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newer);
  });

  it("입력 순서가 최신 먼저여도 결과는 같다", () => {
    const older = notice({ sourceUrl: "https://example.com/dup", publishedAt: "2026-09-10T00:00:00.000Z" });
    const newer = notice({ sourceUrl: "https://example.com/dup", publishedAt: "2026-09-11T00:00:00.000Z" });

    const result = dedupeNoticesBySourceUrl([newer, older]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newer);
  });

  it("source가 다르면 source_url이 같아도 별개로 취급한다", () => {
    const molit = notice({ source: "molit", sourceUrl: "https://example.com/same" });
    const gimpo = notice({ source: "gimpo", sourceUrl: "https://example.com/same" });

    const result = dedupeNoticesBySourceUrl([molit, gimpo]);

    expect(result).toHaveLength(2);
  });

  it("셋 이상 중복돼도 하나만 남는다", () => {
    const a = notice({ sourceUrl: "https://example.com/dup", publishedAt: "2026-09-09T00:00:00.000Z" });
    const b = notice({ sourceUrl: "https://example.com/dup", publishedAt: "2026-09-11T00:00:00.000Z" });
    const c = notice({ sourceUrl: "https://example.com/dup", publishedAt: "2026-09-10T00:00:00.000Z" });

    const result = dedupeNoticesBySourceUrl([a, b, c]);

    expect(result).toHaveLength(1);
    expect(result[0].publishedAt).toBe("2026-09-11T00:00:00.000Z");
  });
});
