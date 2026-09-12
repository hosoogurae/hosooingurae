import { describe, expect, it } from "vitest";
import { combineCompareRowValues } from "../compareRowFormat";

describe("combineCompareRowValues", () => {
  it("양쪽 다 있으면 슬래시로 이어붙인다", () => {
    expect(
      combineCompareRowValues([
        { value: "212동", fallback: "동 정보 미등록" },
        { value: "21층", fallback: "층 정보 문의" },
      ]),
    ).toBe("212동 / 21층");
  });

  it("한쪽만 있으면 그 값만 보여주고 슬래시를 붙이지 않는다", () => {
    expect(
      combineCompareRowValues([
        { value: null, fallback: "동 정보 미등록" },
        { value: "21층", fallback: "층 정보 문의" },
      ]),
    ).toBe("21층");

    expect(
      combineCompareRowValues([
        { value: "212동", fallback: "동 정보 미등록" },
        { value: null, fallback: "층 정보 문의" },
      ]),
    ).toBe("212동");
  });

  it("양쪽 다 없으면 각 항목의 기존 미등록 문구를 그대로 이어붙인다", () => {
    expect(
      combineCompareRowValues([
        { value: null, fallback: "동 정보 미등록" },
        { value: null, fallback: "층 정보 문의" },
      ]),
    ).toBe("동 정보 미등록 / 층 정보 문의");
  });

  it("면적처럼 다른 항목 쌍에도 동일하게 동작한다", () => {
    expect(
      combineCompareRowValues([
        { value: "110.1㎡", fallback: "면적 문의" },
        { value: null, fallback: "면적 문의" },
      ]),
    ).toBe("110.1㎡");
  });
});
