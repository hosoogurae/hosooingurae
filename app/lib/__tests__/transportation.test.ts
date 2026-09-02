import { describe, expect, it } from "vitest";
import { formatSubwayTransportation } from "../format/transportation";

describe("formatSubwayTransportation", () => {
  it("분리 저장된 값을 중복 없이 한 번씩 표시한다", () => {
    const value = formatSubwayTransportation({
      subway: "구래역",
      subwayDistance: "330m",
      subwayWalkMinutes: 7,
    });
    expect(value).toBe("구래역 · 330m · 도보 7분");
    expect(value?.match(/도보 7분/g)).toHaveLength(1);
  });

  it("기존 설명에 포함된 도보시간을 제거하고 숫자 필드를 한 번만 표시한다", () => {
    expect(formatSubwayTransportation({
      subway: "구래역 도보 7분",
      subwayDistance: "330m, 도보거리 약 7분",
      subwayWalkMinutes: 7,
    })).toBe("구래역 · 330m · 도보 7분");
  });
});
