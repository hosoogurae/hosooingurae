import { describe, expect, it } from "vitest";
import {
  getComplexNameCandidates,
  getUncertainFieldLabels,
  parseNaverListingText,
  stripTrailingBuildingFloor,
} from "../naverTextParser";
import { NAVER_OLD_SAMPLE } from "./naverOldSample.fixture";
import { NAVER_NEW_SAMPLE } from "./naverNewSample.fixture";
import { NAVER_NEW_SAMPLE_NO_COMMA } from "./naverNewSampleNoComma.fixture";
import { NAVER_NEW_SAMPLE_WITH_DIGITS_IN_FEATURES } from "./naverNewSampleDigitsInFeatures.fixture";

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

  it("융자금 라벨을 제외하면 인식 실패 필드가 없다(이 샘플엔 융자금 정보가 없음)", () => {
    expect(getUncertainFieldLabels(parsed)).toEqual(["융자금"]);
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

  it("융자금 라벨을 제외하면 인식 실패 필드가 없다(이 샘플엔 융자금 정보가 없음)", () => {
    expect(getUncertainFieldLabels(parsed)).toEqual(["융자금"]);
  });
});

describe("parseNaverListingText — 신형 샘플(쉼표 없는 공백형 특징, 이번에 새로 지원)", () => {
  const parsed = parseNaverListingText(NAVER_NEW_SAMPLE_NO_COMMA);

  it("동을 인식한다(공백형 샘플도 동일하게 동작)", () => {
    expect(parsed.building).toBe("303동");
  });

  it("가격/면적/층/방향 등 다른 필드는 그대로 인식된다", () => {
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.price).toBe(41000);
    expect(parsed.supplyArea).toBe(110.03);
    expect(parsed.exclusiveArea).toBe(84.71);
    expect(parsed.floor).toBe(3);
    expect(parsed.totalFloors).toBe(29);
    expect(parsed.direction).toBe("남서향");
  });

  it("쉼표 없이 공백으로만 나열된 특징 문장을 태그 배열로 인식한다", () => {
    expect(parsed.features).toEqual([
      "주인거주",
      "관리굿",
      "중문등",
      "상태굿",
      "가마지천뷰",
      "이사협의",
    ]);
  });

  it("매물설명은 재조합 없이 원문 문장을 그대로 쓴다", () => {
    expect(parsed.shortDescription).toBe(
      "주인거주 관리굿 중문등 상태굿 가마지천뷰 이사협의",
    );
  });

  it("'면적 단위 변경평' 같은 UI 문구를 특징으로 잘못 인식하지 않는다", () => {
    expect(parsed.features).not.toContain("면적");
    expect(parsed.shortDescription).not.toContain("면적 단위 변경평");
  });

  it("융자금 라벨을 제외하면 인식 실패 필드가 없다(이 샘플엔 융자금 정보가 없음)", () => {
    expect(getUncertainFieldLabels(parsed)).toEqual(["융자금"]);
  });
});

describe("parseNaverListingText — 신형 샘플(특징 문장에 숫자가 섞인 경우, 매물번호 2640683107)", () => {
  const parsed = parseNaverListingText(NAVER_NEW_SAMPLE_WITH_DIGITS_IN_FEATURES);

  it("동/가격/면적/층/향/입주가능일을 인식한다", () => {
    expect(parsed.building).toBe("302동");
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.priceLabel).toBe("4억 3,000만원");
    expect(parsed.supplyArea).toBe(108.6);
    expect(parsed.exclusiveArea).toBe(84.64);
    expect(parsed.floor).toBe(6);
    expect(parsed.totalFloors).toBe(26);
    expect(parsed.direction).toBe("남동향");
    expect(parsed.moveInDate).toBe("즉시입주 협의 가능");
  });

  it("'방4', '냉장고장2등'처럼 숫자가 섞인 특징 문장도 통째로 제외되지 않는다", () => {
    expect(parsed.features).toEqual([
      "인기판상형",
      "방4",
      "안방붙박이장",
      "냉장고장2등",
      "집상태",
      "최상",
    ]);
    expect(parsed.shortDescription).toBe(
      "인기판상형 방4 안방붙박이장 냉장고장2등 집상태 최상",
    );
  });

  it("융자금 라벨을 제외하면 인식 실패 필드가 없다(이 샘플엔 융자금 정보가 없음)", () => {
    expect(getUncertainFieldLabels(parsed)).toEqual(["융자금"]);
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

  it("공백형 특징 후보는 토큰이 3개 미만이면 인정하지 않는다", () => {
    const text = [
      "테스트단지 202동",
      "매매 3억",
      "아파트 남향",
      "짧은문장",
      "집주인확인매물 2026. 07. 28.",
      "기본 정보",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.features).toBeUndefined();
    expect(parsed.shortDescription).toBeUndefined();
  });

  it("공백형 특징 후보는 숫자·㎡·원·괄호가 섞인 토큰이 있으면 인정하지 않는다", () => {
    const text = [
      "테스트단지 202동",
      "매매 3억",
      "아파트 남향",
      "채광좋음 84.5㎡ 즉시입주",
      "집주인확인매물 2026. 07. 28.",
      "기본 정보",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.features).toBeUndefined();
    expect(parsed.shortDescription).toBeUndefined();
  });

  it("공백형 특징 후보는 순수 숫자+단위 토큰(㎡·원 기호 없이도)이 있으면 인정하지 않는다", () => {
    const text = [
      "테스트단지 202동",
      "매매 3억",
      "아파트 남향",
      "채광좋음 26층 즉시입주",
      "집주인확인매물 2026. 07. 28.",
      "기본 정보",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.features).toBeUndefined();
    expect(parsed.shortDescription).toBeUndefined();
  });

  it("공백형 특징 후보는 한글 단어에 숫자가 자연스럽게 섞인 토큰은 그대로 허용한다", () => {
    const text = [
      "테스트단지 202동",
      "매매 3억",
      "아파트 남향",
      "방3 붙박이장2개 채광좋음",
      "집주인확인매물 2026. 07. 28.",
      "기본 정보",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.features).toEqual(["방3", "붙박이장2개", "채광좋음"]);
    expect(parsed.shortDescription).toBe("방3 붙박이장2개 채광좋음");
  });

  it("여러 공백형 후보가 있으면 경계에 가장 가까운(마지막) 줄을 선택한다", () => {
    const text = [
      "테스트단지 202동",
      "매매 3억",
      "아파트 남향",
      "먼저 나오는 후보 문장",
      "면적 단위 변경평",
      "실제로 선택돼야 하는 마지막 문장",
      "집주인확인매물 2026. 07. 28.",
      "기본 정보",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.shortDescription).toBe("실제로 선택돼야 하는 마지막 문장");
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

describe("parseNaverListingText — 매물번호 추출", () => {
  it("\"매물번호\" 라벨 뒤 숫자를 인식한다(라벨과 값이 다른 줄)", () => {
    const parsed = parseNaverListingText(NAVER_NEW_SAMPLE_WITH_DIGITS_IN_FEATURES);
    expect(parsed.articleNumber).toBe("2640683107");
  });

  it("매물번호가 없으면 undefined다", () => {
    const parsed = parseNaverListingText(
      "테스트단지 202동\n매매 3억\n아파트 남향\n채광좋음 즉시입주\n기본 정보",
    );
    expect(parsed.articleNumber).toBeUndefined();
  });
});

describe("parseNaverListingText — 가격: '기본 정보' 이후 구간 우선", () => {
  it("상단 요약 줄과 다른 값이 '기본 정보' 뒤에 있으면 그 값을 쓴다", () => {
    const text = [
      "테스트단지 202동",
      "매매 9억", // 상단 요약 줄 — 이 값은 무시돼야 함
      "아파트 남향",
      "기본 정보",
      "매매가",
      "4억 2,000만원",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.price).toBe(42000);
  });

  it("전세가도 동일하게 '기본 정보' 이후 값을 우선한다", () => {
    const text = [
      "테스트단지 202동",
      "전세 1억",
      "아파트 남향",
      "기본 정보",
      "전세가",
      "3억 5,000만원",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.transactionType).toBe("전세");
    expect(parsed.price).toBe(35000);
  });

  it("월세는 '기본 정보' 이후 보증금/월세가 둘 다 있어야 인식한다", () => {
    const text = [
      "테스트단지 202동",
      "아파트 남향",
      "기본 정보",
      "보증금",
      "1,000만원",
      "월세",
      "50만원",
    ].join("\n");
    const parsed = parseNaverListingText(text);
    expect(parsed.transactionType).toBe("월세");
    expect(parsed.price).toBe(1000);
  });

  it("'기본 정보' 마커가 없으면 기존 방식(전체 텍스트 검색)으로 대체된다", () => {
    const text = "테스트단지 202동\n매매가\n4억 2,000만원\n아파트 남향";
    const parsed = parseNaverListingText(text);
    expect(parsed.transactionType).toBe("매매");
    expect(parsed.price).toBe(42000);
  });
});

describe("parseNaverListingText — 융자금 추출", () => {
  it("금액이 있으면 hasLoan=true, 원문 그대로 loanAmount에 담는다(숫자 변환 없음)", () => {
    const parsed = parseNaverListingText("융자금\n1억 5,000만원\n기본 정보");
    expect(parsed.hasLoan).toBe(true);
    expect(parsed.loanAmount).toBe("1억 5,000만원");
  });

  it("\"없음\"이면 hasLoan=false, loanAmount=null로 확정한다", () => {
    const parsed = parseNaverListingText("융자금\n없음\n기본 정보");
    expect(parsed.hasLoan).toBe(false);
    expect(parsed.loanAmount).toBeNull();
  });

  it("\"무\"도 \"없음\"과 동일하게 처리한다", () => {
    const parsed = parseNaverListingText("융자금 무\n기본 정보");
    expect(parsed.hasLoan).toBe(false);
    expect(parsed.loanAmount).toBeNull();
  });

  it("라벨 자체를 못 찾으면 미확인 상태(undefined)로 남기고 uncertainFields에 안내한다", () => {
    const parsed = parseNaverListingText("테스트단지 202동\n매매 3억\n기본 정보");
    expect(parsed.hasLoan).toBeUndefined();
    expect(parsed.loanAmount).toBeUndefined();
    expect(getUncertainFieldLabels(parsed)).toContain("융자금");
  });
});

describe("parseNaverListingText — naver.me 링크 추출", () => {
  it("텍스트 안의 naver.me 단축 링크를 인식한다", () => {
    const parsed = parseNaverListingText(
      "테스트단지 202동\nhttps://naver.me/xAbC123d\n기본 정보",
    );
    expect(parsed.naverMeLink).toBe("https://naver.me/xAbC123d");
  });

  it("naver.me 링크가 없으면 undefined다", () => {
    const parsed = parseNaverListingText("테스트단지 202동\n기본 정보");
    expect(parsed.naverMeLink).toBeUndefined();
  });
});

describe("parseNaverListingText — 집주인확인매물 날짜 추출", () => {
  it("\"집주인확인매물 2026. 07. 29.\" 형태를 YYYY-MM-DD로 정규화한다", () => {
    const parsed = parseNaverListingText(NAVER_NEW_SAMPLE_WITH_DIGITS_IN_FEATURES);
    expect(parsed.verifiedOwnerConfirmationDate).toBe("2026-07-29");
  });

  it("\"집주인 확인매물 2026.07.29\"처럼 공백/마침표 표기가 달라도 인식한다", () => {
    const parsed = parseNaverListingText("집주인 확인매물 2026.07.29\n기본 정보");
    expect(parsed.verifiedOwnerConfirmationDate).toBe("2026-07-29");
  });

  it("\"확인매물 2026. 7. 29.\"처럼 \"집주인\" 없이 한 자리 월/일이어도 인식한다", () => {
    const parsed = parseNaverListingText("확인매물 2026. 7. 29.\n기본 정보");
    expect(parsed.verifiedOwnerConfirmationDate).toBe("2026-07-29");
  });

  it("날짜를 찾지 못하면 undefined다(오늘 날짜로 대체하지 않음)", () => {
    const parsed = parseNaverListingText(NAVER_OLD_SAMPLE);
    expect(parsed.verifiedOwnerConfirmationDate).toBeUndefined();
  });
});
