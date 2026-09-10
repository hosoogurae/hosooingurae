import { describe, expect, it } from "vitest";
import {
  buildContractPrepSms,
  formatContractDateKorean,
  formatContractTimeKorean,
  getContractTypeLabel,
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

describe("getContractTypeLabel", () => {
  it("매수인·매도인은 매매계약", () => {
    expect(getContractTypeLabel("매수인")).toBe("매매계약");
    expect(getContractTypeLabel("매도인")).toBe("매매계약");
  });

  it("임차인·임대인은 임대차계약", () => {
    expect(getContractTypeLabel("임차인")).toBe("임대차계약");
    expect(getContractTypeLabel("임대인")).toBe("임대차계약");
  });
});

describe("buildContractPrepSms — 공통(날짜/이름/뼈대)", () => {
  it("문자 작성일이 아니라 dateStr(실제 계약일)을 그대로 쓴다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: [],
    });
    expect(result).toContain("9월 8일(화)");
  });

  it("이름을 넣으면 첫 줄에 자연스럽게 들어간다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      customerName: "김철수",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result.startsWith("김철수님, 9월 8일(화) 매매계약 일정 안내드립니다.")).toBe(true);
  });

  it("이름을 비우면 이름·undefined·불필요한 쉼표 없이 자연스럽게 나간다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      customerName: "",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result.startsWith("9월 8일(화) 매매계약 일정 안내드립니다.")).toBe(true);
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("님,");
  });

  it("항목이 없으면 준비물 문단 자체를 넣지 않는다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: [],
    });
    expect(result).not.toContain("지참");
    expect(result).not.toContain("추가 준비물");
  });

  it("금액을 넣지 않는다 — 항목 이름만 들어가고 숫자·원 단위 금액 문구가 없다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["계약금"],
    });
    expect(result).not.toMatch(/\d+[만천억]?원/);
  });

  it("사무소명·주소·전화번호는 contact.ts 값 그대로 들어간다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result).toContain("호수공인중개사사무소에서 뵙겠습니다.");
    expect(result).toContain("경기도 김포시 김포한강5로 385, 상가동 108호");
    expect(result).toContain("문의 031-998-4556");
  });

  it("OTP·통장 사본 문구가 들어가지 않는다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금", "계좌이체 한도 확인"],
    });
    expect(result).not.toContain("OTP");
    expect(result).not.toContain("통장 사본");
  });
});

describe("buildContractPrepSms — 매수인/임차인(송금하는 역할)", () => {
  it("신분증·도장·계약금·계좌이체 한도 확인이 모두 체크되면 예시와 동일한 문장을 만든다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금", "계좌이체 한도 확인"],
    });
    expect(result).toBe(
      [
        "9월 8일(화) 매매계약 일정 안내드립니다.",
        "신분증, 도장을 지참해 주시고 계약금 이체에 불편이 없도록 계좌이체 한도를 미리 확인해 주세요.",
        "오후 6시에 호수공인중개사사무소에서 뵙겠습니다.",
        "경기도 김포시 김포한강5로 385, 상가동 108호",
        "문의 031-998-4556",
      ].join("\n"),
    );
  });

  it("계좌이체 한도 확인만 체크되면(계약금 미체크) 계약금이 선택된 것처럼 표현하지 않는다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["계좌이체 한도 확인"],
    });
    const [, prepLine] = result.split("\n");
    expect(prepLine).toBe("계좌이체 한도를 미리 확인해 주세요.");
    expect(prepLine).not.toContain("계약금 이체에");
  });

  it("계약금만 체크되고 계좌이체 한도 확인은 미체크면 일반 지참 항목으로 합쳐진다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "계약금"],
    });
    expect(result).toContain("신분증, 계약금을 지참해 주세요.");
  });

  it("임차인도 같은 규칙을 쓴다", () => {
    const result = buildContractPrepSms({
      role: "임차인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금", "계좌이체 한도 확인"],
    });
    expect(result).toContain("임대차계약 일정 안내드립니다.");
    expect(result).toContain(
      "신분증, 도장을 지참해 주시고 계약금 이체에 불편이 없도록 계좌이체 한도를 미리 확인해 주세요.",
    );
  });
});

describe("buildContractPrepSms — 매도인/임대인(계약금을 받는 역할)", () => {
  it("본인 명의 계좌번호 항목이 체크되면 안내 문장이 들어간다", () => {
    const result = buildContractPrepSms({
      role: "매도인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금을 수령할 본인 명의 계좌번호"],
    });
    expect(result).toContain(
      "신분증, 도장을 지참해 주시고 계약금을 수령하실 본인 명의 계좌번호를 준비해 주세요.",
    );
  });

  it("본인 명의 계좌번호만 체크돼도(신분증·도장 미체크) 문장이 단독으로 나간다", () => {
    const result = buildContractPrepSms({
      role: "매도인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["계약금을 수령할 본인 명의 계좌번호"],
    });
    const [, prepLine] = result.split("\n");
    expect(prepLine).toBe("계약금을 수령하실 본인 명의 계좌번호를 준비해 주세요.");
  });

  it("임대인도 같은 규칙을 쓰고 임대차계약으로 표시한다", () => {
    const result = buildContractPrepSms({
      role: "임대인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금을 수령할 본인 명의 계좌번호"],
    });
    expect(result).toContain("임대차계약 일정 안내드립니다.");
    expect(result).toContain("계약금을 수령하실 본인 명의 계좌번호를 준비해 주세요.");
  });

  it("매도인에게 계좌이체 한도 확인 문구는 나오지 않는다(받는 역할이라 무관)", () => {
    const result = buildContractPrepSms({
      role: "매도인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "도장", "계약금을 수령할 본인 명의 계좌번호"],
    });
    expect(result).not.toContain("계좌이체 한도");
  });
});

describe("buildContractPrepSms — 체크 해제/추가 준비물", () => {
  it("체크하지 않은 준비물은 문자에 절대 포함되지 않는다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
    });
    expect(result).not.toContain("도장");
    expect(result).not.toContain("계약금");
  });

  it("관리자가 직접 추가한 일반 준비물은 '추가 준비물:'로 표시된다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "가족관계증명서"],
    });
    expect(result).toContain("신분증을 지참해 주세요.");
    expect(result).toContain("추가 준비물: 가족관계증명서");
  });

  it("기본 준비물과 같은 이름이면 추가 준비물에 중복 표시하지 않는다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "신분증"],
    });
    const matches = result.match(/신분증/g) ?? [];
    // "지참해 주세요" 문장 안 1회만 — 추가 준비물 줄에 다시 나오지 않는다.
    expect(matches).toHaveLength(1);
  });

  it("체크된 특수계약(공동명의 등) 준비물도 추가 준비물로 자연스럽게 표시된다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증"],
      specialItems: ["공동명의자 신분증 사본"],
    });
    expect(result).toContain("추가 준비물: 공동명의자 신분증 사본");
  });

  it("일반 추가 준비물과 특수계약 준비물이 동시에 있으면 한 줄에 함께 나온다", () => {
    const result = buildContractPrepSms({
      role: "매수인",
      dateStr: "2026-09-08",
      timeStr: "18:00",
      items: ["신분증", "가족관계증명서"],
      specialItems: ["위임장"],
    });
    expect(result).toContain("추가 준비물: 가족관계증명서, 위임장");
  });
});
