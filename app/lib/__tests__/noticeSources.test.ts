import { describe, expect, it } from "vitest";
import { parseGimpoNoticeList, parseMolitRss } from "../noticeSources";
import { MOLIT_RSS_SAMPLE } from "./molitRssSample.fixture";
import { GIMPO_NOTICE_LIST_SAMPLE } from "./gimpoNoticeListSample.fixture";

describe("parseMolitRss", () => {
  it("정상 응답에서 제목/링크/게시일을 파싱한다(본문은 가져오지 않음)", () => {
    const { notices, error } = parseMolitRss(MOLIT_RSS_SAMPLE);

    expect(error).toBeUndefined();
    expect(notices).toHaveLength(3);
    expect(notices[0]).toEqual({
      source: "molit",
      title: "[설명] 정부는 ‘26년 목표 물량 26.8만호 달성을 위해 총력을 기울이고 있습니다.",
      sourceUrl: "https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092417&src=text&kw=000004",
      publishedAt: new Date("2026-09-11T16:01:49+09:00").toISOString(),
    });
    // description(본문 iframe)이 결과 어디에도 섞여 나오지 않아야 합니다.
    expect(JSON.stringify(notices)).not.toContain("iframe");
  });

  it("항목이 0개면 성공이 아니라 실패로 취급한다(빈 channel)", () => {
    const emptyRss = `<rss version="2.0"><channel><title>보도자료</title></channel></rss>`;
    const { notices, error } = parseMolitRss(emptyRss);

    expect(notices).toEqual([]);
    expect(error).toBeTruthy();
  });

  it("형식이 깨진 응답(RSS가 아닌 HTML 에러 페이지 등)은 error를 남긴다", () => {
    const brokenResponse = `<html><body><h1>503 Service Unavailable</h1></body></html>`;
    const { notices, error } = parseMolitRss(brokenResponse);

    expect(notices).toEqual([]);
    expect(error).toBeTruthy();
  });
});

describe("parseGimpoNoticeList", () => {
  it("정상 응답에서 제목/링크(절대경로)/게시일을 파싱한다", () => {
    const { notices, error } = parseGimpoNoticeList(GIMPO_NOTICE_LIST_SAMPLE);

    expect(error).toBeUndefined();
    expect(notices).toHaveLength(3);
    expect(notices[0]).toEqual({
      source: "gimpo",
      title: "도로지정 공고(고정리 774-3)",
      sourceUrl:
        "https://www.gimpo.go.kr/portal/ntfcPblancView.do?key=1004&not_ancmt_mgt_no=75624&pageIndex=1&searchCnd=40900000000&cate_cd=1",
      publishedAt: new Date("2026-09-11T00:00:00+09:00").toISOString(),
    });
  });

  it("항목이 0개면 성공이 아니라 실패로 취급한다(빈 tbody)", () => {
    const emptyTable = `<table><thead></thead><tbody></tbody></table>`;
    const { notices, error } = parseGimpoNoticeList(emptyTable);

    expect(notices).toEqual([]);
    expect(error).toBeTruthy();
  });

  it("형식이 깨진 응답(표 구조 자체가 없음)은 error를 남긴다", () => {
    const brokenResponse = `<html><body><p>페이지를 찾을 수 없습니다.</p></body></html>`;
    const { notices, error } = parseGimpoNoticeList(brokenResponse);

    expect(notices).toEqual([]);
    expect(error).toBeTruthy();
  });
});
