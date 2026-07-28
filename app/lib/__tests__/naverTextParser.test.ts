import { describe, expect, it } from "vitest";
import {
  getComplexNameCandidates,
  getUncertainFieldLabels,
  parseNaverListingText,
  stripTrailingBuildingFloor,
} from "../naverTextParser";
import { NAVER_OLD_SAMPLE } from "./naverOldSample.fixture";
import { NAVER_NEW_SAMPLE } from "./naverNewSample.fixture";

describe("parseNaverListingText — 구형 샘플(반드시 계속 통과해야 함)", () => {
  const parsed = parseNaverListingText(NAVER_OLD_SAMPLE);

  it("단지명/동을 인식한다", () => {
    expect(parsed.complexName).toBe("호수마을e편한세상2단지 208동21층");
    expect(parsed.building).toBe("208동");
  });

  it("가격/거래유형을 인식한다", () => {
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.price).toBe(42500);
  });

  it("매물종류/방향을 인식한다", () => {
    expect(parsed.propertyType).toBe("아파트");
    expect(parsed.direction).toBe("남서향");
  });

  it("공급/전용면적을 인식한다", () => {
    expect(parsed.supplyArea).toBe(110.1);
    expect(parsed.exclusiveArea).toBe(84.71);
  });

  it("층/총층, 방수/욕실수를 인식한다", () => {
    expect(parsed.floor).toBe(21);
    expect(parsed.totalFloors).toBe(25);
    expect(parsed.roomCount).toBe(2);
    expect(parsed.bathroomCount).toBe(2);
  });

  it("관리비/입주가능일을 인식한다", () => {
    expect(parsed.maintenanceFee).toBe("25만원");
    expect(parsed.moveInDate).toBe("즉시입주 협의가능");
  });

  it("매물특징/매물설명을 기존 방식(공백 분리 후 재조합)대로 인식한다", () => {
    // 구형 경로는 일부러 손대지 않았으므로, 기존에 알려진 대로 쉼표가
    // 포함된 채 공백 기준으로 쪼개지는 동작이 그대로 재현돼야 합니다.
    expect(parsed.features).toEqual([
      "포베이",
      "구조,내부",
      "깔끔,전망",
      "굳,버스정류장",
      "인접,즉시입주",
    ]);
    expect(parsed.shortDescription).toBe(
      "포베이 구조,내부 깔끔,전망 굳,버스정류장 인접,즉시입주",
    );
  });

  it("인식 실패 필드가 없다(모두 채워짐)", () => {
    expect(getUncertainFieldLabels(parsed)).toEqual([]);
  });
});

describe("parseNaverListingText — 신형 샘플(이번에 새로 지원)", () => {
  const parsed = parseNaverListingText(NAVER_NEW_SAMPLE);

  it("동을 인식한다(동과 층이 분리된 신형 레이아웃)", () => {
    expect(parsed.building).toBe("303동");
  });

  it("단지명을 인식한다", () => {
    expect(parsed.complexName).toBe("호수마을e편한세상3단지 303동");
  });

  it("가격/거래유형을 인식한다", () => {
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.price).toBe(41000);
  });

  it("매물종류/방향을 인식한다(라벨이 '향'으로 바뀌어도 원문 스캔으로 인식)", () => {
    expect(parsed.propertyType).toBe("아파트");
    expect(parsed.direction).toBe("남서향");
  });

  it("공급/전용면적을 인식한다(라벨과 값이 다른 줄)", () => {
    expect(parsed.supplyArea).toBe(110.03);
    expect(parsed.exclusiveArea).toBe(84.71);
  });

  it("층/총층, 방수/욕실수를 인식한다(라벨과 값이 다른 줄)", () => {
    expect(parsed.floor).toBe(3);
    expect(parsed.totalFloors).toBe(29);
    expect(parsed.roomCount).toBe(3);
    expect(parsed.bathroomCount).toBe(2);
  });

  it("관리비/입주가능일을 인식한다(라벨과 값이 다른 줄)", () => {
    expect(parsed.maintenanceFee).toBe("30만원");
    expect(parsed.moveInDate).toBe("즉시입주 협의 가능");
  });

  it("매물특징을 라벨 없이도 인식한다", () => {
    expect(parsed.features).toEqual([
      "로얄동",
      "2in1에어컨",
      "붙박이장",
      "구래역 최단거리",
      "빠른입주",
    ]);
  });

  it("매물소개가 자동생성 메타정보뿐이면 매물설명은 특징 재조합으로 대체된다", () => {
    expect(parsed.shortDescription).toBe(
      "로얄동 2in1에어컨 붙박이장 구래역 최단거리 빠른입주",
    );
  });

  it("인식 실패 필드가 없다(모두 채워짐)", () => {
    expect(getUncertainFieldLabels(parsed)).toEqual([]);
  });
});

describe("경계·예외 상황", () => {
  it("빈 텍스트는 모든 필드가 비어있고 인식 실패로 표시된다", () => {
    const parsed = parseNaverListingText("");
    expect(parsed.complexName).toBeUndefined();
    expect(parsed.building).toBeUndefined();
    expect(parsed.transactionType).toBeUndefined();
    expect(parsed.features).toBeUndefined();
    expect(parsed.shortDescription).toBeUndefined();
    expect(getUncertainFieldLabels(parsed).length).toBeGreaterThan(0);
  });

  it("줄바꿈이 과도하게 많아도(라벨과 값 사이 빈 줄 여러 개) 인식된다", () => {
    const text = "매매가\n\n\n\n4억 5,000만원\n\n\n관리비\n\n\n20만원";
    const parsed = parseNaverListingText(text);
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.price).toBe(45000);
    expect(parsed.maintenanceFee).toBe("20만원");
  });

  it("라벨과 값이 다음 줄로 분리된 경우 각 필드가 정상 인식된다", () => {
    const text = [
      "테스트단지 101동",
      "전세가",
      "3억 원",
      "공급면적",
      "84.5㎡",
      "전용면적",
      "59.9㎡",
      "해당층/총층",
      "5/15층",
      "방수/욕실수",
      "2/1개",
      "관리비",
      "10만원",
      "입주가능일",
      "즉시입주 가능",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.transactionType).toBe("전세");
    expect(parsed.price).toBe(30000);
    expect(parsed.supplyArea).toBe(84.5);
    expect(parsed.exclusiveArea).toBe(59.9);
    expect(parsed.floor).toBe(5);
    expect(parsed.totalFloors).toBe(15);
    expect(parsed.roomCount).toBe(2);
    expect(parsed.bathroomCount).toBe(1);
    expect(parsed.maintenanceFee).toBe("10만원");
  });

  it("매물소개에 실제 서술형 설명이 있으면 특징 재조합 대신 그 설명을 우선 사용한다", () => {
    const text = [
      "테스트단지 202동",
      "매매 3억",
      "아파트 남향",
      "특징하나,특징둘,특징셋",
      "매물소개",
      "채광이 좋고 관리 상태가 우수한 매물입니다. 즉시 입주 가능합니다.",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.shortDescription).toBe(
      "채광이 좋고 관리 상태가 우수한 매물입니다. 즉시 입주 가능합니다.",
    );
  });
});

describe("stripTrailingBuildingFloor — 신형(동만 있고 층 없음) 대응", () => {
  it("구형(동+층)은 기존과 동일하게 둘 다 제거한다", () => {
    expect(stripTrailingBuildingFloor("호수마을e편한세상2단지 208동21층")).toBe(
      "호수마을e편한세상2단지",
    );
  });

  it("신형(동만 있음)은 동만 제거한다", () => {
    expect(stripTrailingBuildingFloor("호수마을e편한세상3단지 303동")).toBe(
      "호수마을e편한세상3단지",
    );
  });
});

describe("getComplexNameCandidates — 배지 위치가 달라져도 후보를 찾는다", () => {
  it("배지가 맨 앞이 아니어도(신형) 첫 줄을 단지명 후보로 인정한다", () => {
    const candidates = getComplexNameCandidates(NAVER_NEW_SAMPLE);
    expect(candidates[0]).toBe("호수마을e편한세상3단지 303동");
  });
});
