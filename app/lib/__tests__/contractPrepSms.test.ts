import { describe, expect, it } from "vitest";
import {
  buildContractPrepSms,
  formatContractDateKorean,
  formatContractTimeKorean,
  hasBatchim,
  josa,
} from "../contractPrepSms";

describe("formatContractDateKorean", () => {
  it("2026년 9월 8일은 화요일이다(사람이 잘못 적기 쉬운 값이라 반드시 코드로 계산)", () => {
    expect(formatContractDateKorean("2026-09-08")).toBe("9월 8일(화)");
  });

  it("월말 경계 — 2026년 9월 30일(수)", () => {
    expect(formatContractDateKorean("2026-09-30")).toBe("9월 30일(수)");
  });

  it("월이 바뀌는 경계 — 2026년 10월 1일(목)", () => {
    expect(formatContractDateKorean("2026-10-01")).toBe("10월 1일(목)");
  });

  it("연말 경계 — 2026년 12월 31일(목)", () => {
    expect(formatContractDateKorean("2026-12-31")).toBe("12월 31일(목)");
  });

  it("연이 바뀌는 경계 — 2027년 1월 1일(금)", () => {
    expect(formatContractDateKorean("2027-01-01")).toBe("1월 1일(금)");
  });

  it("윤년 2월 29일 — 2028년 2월 29일(화)", () => {
    expect(formatContractDateKorean("2028-02-29")).toBe("2월 29일(화)");
  });

  it("윤년 다음날(3월 1일)로 넘어가도 요일이 이어진다 — 2028년 3월 1일(수)", () => {
    expect(formatContractDateKorean("2028-03-01")).toBe("3월 1일(수)");
  });
});

describe("formatContractTimeKorean", () => {
  it("정각은 분을 생략한다", () => {
    expect(formatContractTimeKorean("18:00")).toBe("오후 6시");
  });

  it("분이 있으면 함께 표시한다", () => {
    expect(formatContractTimeKorean("18:30")).toBe("오후 6시 30분");
  });

  it("정오(12:00)는 오후 12시", () => {
    expect(formatContractTimeKorean("12:00")).toBe("오후 12시");
  });

  it("자정(00:00)은 오전 12시", () => {
    expect(formatContractTimeKorean("00:00")).toBe("오전 12시");
  });

  it("오전 시각", () => {
    expect(formatContractTimeKorean("09:15")).toBe("오전 9시 15분");
  });
});

describe("hasBatchim / josa", () => {
  it("받침 있는 단어를 판정한다", () => {
    expect(hasBatchim("신분증")).toBe(true);
    expect(hasBatchim("계약금")).toBe(true);
  });

  it("받침 없는 단어를 판정한다", () => {
    expect(hasBatchim("카드")).toBe(false);
    expect(hasBatchim("증명서")).toBe(false);
  });

  it("을/를 조사를 받침 유무에 맞게 고른다", () => {
    expect(josa("신분증", "을", "를")).toBe("을");
    expect(josa("카드", "을", "를")).toBe("를");
  });
});

describe("buildContractPrepSms", () => {
  it("예시와 동일한 문장을 만든다(이름 없음)", () => {
    const result = buildContractPrepSms({
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금"],
    });
    expect(result).toBe(
      [
        "9월 8일(화) 계약 시 필요한 사항 안내드립니다.",
        "신분증, 도장, 계약금을 지참해 주세요.",
        "오후 6시에 호수공인중개사사무소에서 뵙겠습니다.",
        "경기도 김포시 김포한강5로 385, 상가동 108호",
        "문의 031-998-4556",
      ].join("\n"),
    );
  });

  it("이름을 넣으면 첫 줄에 자연스럽게 들어간다", () => {
    const result = buildContractPrepSms({
      customerName: "김철수",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result.startsWith("김철수님, 9월 8일(화) 계약 시 필요한 사항 안내드립니다.")).toBe(
      true,
    );
  });

  it("이름을 비우면 이름 없이 자연스럽게 나간다", () => {
    const result = buildContractPrepSms({
      customerName: "",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result.startsWith("9월 8일(화) 계약 시 필요한 사항 안내드립니다.")).toBe(true);
  });

  it("항목이 1개면 조사가 자연스럽다", () => {
    const result = buildContractPrepSms({
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result).toContain("신분증을 지참해 주세요.");
  });

  it("항목이 없으면 지참 문장 자체를 넣지 않는다", () => {
    const result = buildContractPrepSms({
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: [],
    });
    expect(result).not.toContain("지참");
  });

  it("금액을 넣지 않는다 — 항목 이름만 들어가고 숫자·원 단위 금액 문구가 없다", () => {
    const result = buildContractPrepSms({
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["계약금"],
    });
    expect(result).toContain("계약금을 지참해 주세요.");
    expect(result).not.toMatch(/\d+[만천억]?원/);
  });

  it("사무소명·주소·전화번호는 contact.ts 값 그대로 들어간다", () => {
    const result = buildContractPrepSms({
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result).toContain("호수공인중개사사무소에서 뵙겠습니다.");
    expect(result).toContain("경기도 김포시 김포한강5로 385, 상가동 108호");
    expect(result).toContain("문의 031-998-4556");
  });
});
