import { describe, expect, it } from "vitest";
import { matchNoticeKeywords } from "../noticeKeywords";

describe("matchNoticeKeywords", () => {
  it("손님 관련 단어에 걸리면 matched·customerCandidate 둘 다 true다", () => {
    const result = matchNoticeKeywords("김포 한강신도시 아파트 분양 소식");
    expect(result).toEqual({ matched: true, customerCandidate: true });
  });

  it("사무소 추가 단어에만 걸리면 matched는 true, customerCandidate는 false다", () => {
    const result = matchNoticeKeywords("공인중개사 중개보수 요율 개편 안내");
    expect(result).toEqual({ matched: true, customerCandidate: false });
  });

  it("둘 다 걸리지 않으면 전부 false다(실제 사례)", () => {
    const result = matchNoticeKeywords(
      "[차관동정] 김이탁 제1차관, LH 조직 개편, 충분히 소통하면서 추진",
    );
    expect(result).toEqual({ matched: false, customerCandidate: false });
  });

  it("두 목록에 동시에 걸려도 customerCandidate는 true다(사무소 범위가 손님 범위를 포함)", () => {
    const result = matchNoticeKeywords("김포 아파트 재건축과 중개보수 규정 변경");
    expect(result).toEqual({ matched: true, customerCandidate: true });
  });

  it("가운뎃점으로 나뉜 단어도 놓치지 않는다(표시·광고 → 표시광고)", () => {
    const result = matchNoticeKeywords("공인중개사 표시·광고 규정 위반 사례 안내");
    expect(result).toEqual({ matched: true, customerCandidate: false });
  });

  it("공백으로 나뉜 단어도 놓치지 않는다(표시 광고 → 표시광고)", () => {
    const result = matchNoticeKeywords("표시 광고 관련 유의사항");
    expect(result).toEqual({ matched: true, customerCandidate: false });
  });

  it("공백으로 나뉜 손님 단어도 놓치지 않는다(한강 신도시 → 한강신도시)", () => {
    const result = matchNoticeKeywords("한강 신도시 개발 현황 보고");
    expect(result).toEqual({ matched: true, customerCandidate: true });
  });
});
