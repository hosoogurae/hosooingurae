import { describe, expect, it } from "vitest";
import {
  getUncertainComplexFieldLabels,
  parseNaverComplexText,
} from "../parseNaverComplex";

const SAMPLE_WITH_BASIC_INFO = [
  "호반베르디움더레이크5차",
  "* 아파트",
  "* 266세대",
  "* 2018. 8.(8년차)",
  "* 용적률 119%",
  "* 건폐율 12%",
  "* 위치경기도 김포시 김포한강4로420번길 19상세내역 보기",
  "기본 정보",
  "* 사용승인일",
  "2018. 8. 31. (8년차)",
  "* 세대수",
  "266세대",
  "* 동수",
  "4개",
  "* 최고층",
  "15층 (가장 낮은 동)",
  "18층 (가장 높은 동)",
  "* 난방",
  "지역난방 / 열병합",
  "* 주차",
  "360대 (세대당 1.35대)",
  "* 용적률/건폐율",
  "119% / 12%",
  "* 건설사",
  "(주)호반건설, (주)호반건설주택",
].join("\n");

describe("parseNaverComplexText — 기본 정보 섹션이 있는 경우", () => {
  const parsed = parseNaverComplexText(SAMPLE_WITH_BASIC_INFO);

  it("단지명/주소를 인식한다", () => {
    expect(parsed.name).toBe("호반베르디움더레이크5차");
    expect(parsed.address).toBe("경기도 김포시 김포한강4로420번길 19");
  });

  it("사용승인일을 YYYY-MM-DD로 변환한다", () => {
    expect(parsed.approvalDate).toBe("2018-08-31");
  });

  it("세대수/동수를 숫자로 인식한다", () => {
    expect(parsed.totalHouseholds).toBe(266);
    expect(parsed.buildings).toBe(4);
  });

  it("최고층은 두 값 중 더 큰 값을 쓴다", () => {
    expect(parsed.maxFloor).toBe(18);
  });

  it("난방·건설사는 원문 그대로 인식한다", () => {
    expect(parsed.heating).toBe("지역난방 / 열병합");
    expect(parsed.builder).toBe("(주)호반건설, (주)호반건설주택");
  });

  it("주차를 총대수/세대당 대수 두 필드로 분리한다", () => {
    expect(parsed.parkingCount).toBe(360);
    expect(parsed.parkingPerHousehold).toBe(1.35);
  });

  it("용적률/건폐율을 각각 분리한다", () => {
    expect(parsed.floorAreaRatio).toBe(119);
    expect(parsed.buildingCoverageRatio).toBe(12);
  });

  it("인식 실패 필드가 없다(모두 채워짐)", () => {
    expect(getUncertainComplexFieldLabels(parsed)).toEqual([]);
  });
});

describe("parseNaverComplexText — '기본 정보' 마커 없이도 상세 라벨 형식만 인식한다", () => {
  it("상단 요약 태그(라벨 없는 값)는 무시하고 상세 섹션의 라벨+값만 매칭한다", () => {
    const text = [
      "테스트단지",
      "* 아파트",
      "* 999세대", // 상단 요약 — 라벨이 없어 세대수 정규식과 매칭되지 않아야 함
      "* 용적률 999%", // 상단 요약 — "용적률/건폐율" 조합 라벨이 아니라 매칭되지 않아야 함
      "세대수",
      "266세대",
      "용적률/건폐율",
      "119% / 12%",
    ].join("\n");
    const parsed = parseNaverComplexText(text);
    expect(parsed.totalHouseholds).toBe(266);
    expect(parsed.floorAreaRatio).toBe(119);
    expect(parsed.buildingCoverageRatio).toBe(12);
  });
});

describe("parseNaverComplexText — 경계 상황", () => {
  it("빈 텍스트는 모든 필드가 비어있고 인식 실패로 표시된다", () => {
    const parsed = parseNaverComplexText("");
    expect(parsed.name).toBeUndefined();
    expect(parsed.totalHouseholds).toBeUndefined();
    expect(getUncertainComplexFieldLabels(parsed).length).toBeGreaterThan(0);
  });

  it("최고층이 한 줄만 있어도 인식한다", () => {
    const text = "테스트단지\n기본 정보\n* 최고층\n20층\n";
    const parsed = parseNaverComplexText(text);
    expect(parsed.maxFloor).toBe(20);
  });

  it("주차 정보가 없으면 두 필드 다 비워둔다(허위 값 생성 금지)", () => {
    const text = "테스트단지\n기본 정보\n* 세대수\n100세대\n";
    const parsed = parseNaverComplexText(text);
    expect(parsed.parkingCount).toBeUndefined();
    expect(parsed.parkingPerHousehold).toBeUndefined();
  });
});
