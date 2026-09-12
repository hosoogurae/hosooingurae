import { describe, expect, it } from "vitest";
import { matchNoticeKeywords } from "../noticeKeywords";

describe("matchNoticeKeywords — gimpo", () => {
  it("지역명(김포)만으로는 걸리지 않는다 — 모든 글에 다 들어있기 때문", () => {
    // 아래 3건은 실제로 통과했던(잘못 걸러지지 않은) 부동산 무관 사례입니다.
    expect(matchNoticeKeywords("gimpo", "「2026년 김포시 영세·소규모 사업장 노동자 건강검진비 지원사업」참여자 모집 공고")).toEqual({
      matched: false,
      customerCandidate: false,
    });
    expect(matchNoticeKeywords("gimpo", "김포시외국인주민지원센터 위탁운영 기관 모집 공고")).toEqual({
      matched: false,
      customerCandidate: false,
    });
    expect(matchNoticeKeywords("gimpo", "김포시, 제7기 여성친화도시 시민참여단 모집")).toEqual({
      matched: false,
      customerCandidate: false,
    });
  });

  it("부동산 성격 단어에 걸리면 matched·customerCandidate 둘 다 true다", () => {
    expect(matchNoticeKeywords("gimpo", "도로지정 공고(고정리 774-3)")).toEqual({
      matched: true,
      customerCandidate: true,
    });
  });

  it("가운뎃점·공백으로 나뉜 단어도 놓치지 않는다", () => {
    expect(matchNoticeKeywords("gimpo", "지구 단위 계획 변경 결정 고시")).toEqual({
      matched: true,
      customerCandidate: true,
    });
    expect(matchNoticeKeywords("gimpo", "공동·주택 리모델링 안전진단 결과 공고")).toEqual({
      matched: true,
      customerCandidate: true,
    });
  });
});

describe("matchNoticeKeywords — molit", () => {
  it("부동산과 무관하면 전부 false다(실제 사례)", () => {
    expect(
      matchNoticeKeywords("molit", "[차관동정] 김이탁 제1차관, LH 조직 개편, 충분히 소통하면서 추진"),
    ).toEqual({ matched: false, customerCandidate: false });
  });

  it("손님 관련 단어(지역명·거래유형 등)에 걸리면 customerCandidate도 true다", () => {
    expect(matchNoticeKeywords("molit", "김포 한강신도시 아파트 분양 소식")).toEqual({
      matched: true,
      customerCandidate: true,
    });
  });

  it("사무소 전용 단어(공인중개사·세금·규제)에만 걸리면 matched는 true, customerCandidate는 false다", () => {
    expect(matchNoticeKeywords("molit", "공인중개사 중개보수 요율 개편 안내")).toEqual({
      matched: true,
      customerCandidate: false,
    });
    expect(matchNoticeKeywords("molit", "조정대상지역 해제 및 규제지역 재지정 안내")).toEqual({
      matched: true,
      customerCandidate: false,
    });
  });

  it("가운뎃점·공백으로 나뉜 단어도 놓치지 않는다", () => {
    expect(matchNoticeKeywords("molit", "공인중개사 표시·광고 규정 위반 사례 안내")).toEqual({
      matched: true,
      customerCandidate: false,
    });
    expect(matchNoticeKeywords("molit", "한강 신도시 개발 현황 보고")).toEqual({
      matched: true,
      customerCandidate: true,
    });
  });
});
