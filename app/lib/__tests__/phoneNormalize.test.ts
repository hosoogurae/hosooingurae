import { describe, expect, it } from "vitest";
import { formatPhoneNumber, normalizePhone } from "../phoneNormalize";

describe("normalizePhone — 숫자만 남기기", () => {
  it("하이픈·공백을 제거하고 숫자만 남긴다", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("010 1234 5678")).toBe("01012345678");
  });
});

describe("formatPhoneNumber — Contact Picker 등에서 오는 제각각인 표기를 010-1234-5678 형태로", () => {
  it("이미 올바른 형태면 그대로 둔다(idempotent)", () => {
    expect(formatPhoneNumber("010-1234-5678")).toBe("010-1234-5678");
  });

  it("하이픈 없는 11자리를 3-4-4로 나눈다", () => {
    expect(formatPhoneNumber("01012345678")).toBe("010-1234-5678");
  });

  it("공백으로 구분된 표기를 정규화한다", () => {
    expect(formatPhoneNumber("010 1234 5678")).toBe("010-1234-5678");
  });

  it("점으로 구분된 표기를 정규화한다", () => {
    expect(formatPhoneNumber("010.1234.5678")).toBe("010-1234-5678");
  });

  it("국가코드(+82, 하이픈 표기)를 국내 표기로 되돌린다", () => {
    expect(formatPhoneNumber("+82 10-1234-5678")).toBe("010-1234-5678");
  });

  it("국가코드(+82, 공백 표기)를 국내 표기로 되돌린다", () => {
    expect(formatPhoneNumber("+82 10 1234 5678")).toBe("010-1234-5678");
  });

  it("+ 없이 82로 시작하는 표기도 국내 표기로 되돌린다", () => {
    expect(formatPhoneNumber("8210-1234-5678")).toBe("010-1234-5678");
  });

  it("옛날 10자리 이동통신 번호(011 등)는 3-3-4로 나눈다", () => {
    expect(formatPhoneNumber("011-123-4567")).toBe("011-123-4567");
    expect(formatPhoneNumber("01112345 67".replace(/\s/g, ""))).toBe("011-123-4567");
  });

  it("016/017/018/019도 같은 규칙으로 정규화한다", () => {
    expect(formatPhoneNumber("0161234567")).toBe("016-123-4567");
    expect(formatPhoneNumber("01712345678")).toBe("017-1234-5678");
  });

  it("빈 문자열·숫자 없는 입력은 빈 문자열을 돌려준다", () => {
    expect(formatPhoneNumber("")).toBe("");
    expect(formatPhoneNumber("연락처 없음")).toBe("");
  });

  it("01로 시작하지 않는 번호(유선전화 등)는 자릿수를 추측하지 않고 숫자만 돌려준다", () => {
    // 02는 지역번호가 2자리라 010과 같은 3자리 규칙을 적용하면 틀린
    // 위치에 하이픈이 들어갑니다 — 그래서 포맷하지 않고 숫자만 둡니다.
    expect(formatPhoneNumber("02-1234-5678")).toBe("0212345678");
  });

  it("자릿수가 애매한 값은 하이픈을 지어내지 않고 숫자만 돌려준다", () => {
    expect(formatPhoneNumber("010-12")).toBe("01012");
  });
});
