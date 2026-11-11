import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isConsultPickerEnabled } from "../consultPhones";

/**
 * 홈 「나랑 맞는 상담 스타일 고르기」의 번호 조회 API.
 * 실제 번호는 절대 쓰지 않습니다 — 번호처럼 생기지도 않은 가짜 문자열만 씁니다.
 */

const FAKE_FACT = "fake-fact-value";
const FAKE_HEART = "fake-heart-value";

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/consult-phone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function callPost(body: unknown) {
  const { POST } = await import("../../api/consult-phone/route");
  return POST(buildRequest(body));
}

describe("POST /api/consult-phone", () => {
  beforeEach(() => {
    vi.stubEnv("CONSULT_PHONE_FACT", FAKE_FACT);
    vi.stubEnv("CONSULT_PHONE_HEART", FAKE_HEART);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("style이 fact면 해당 번호를 no-store로 돌려준다", async () => {
    const response = await callPost({ style: "fact" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ phone: FAKE_FACT });
  });

  it("style이 heart면 해당 번호를 돌려준다", async () => {
    const response = await callPost({ style: "heart" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ phone: FAKE_HEART });
  });

  it.each([
    ["알 수 없는 값", { style: "other" }],
    ["대문자", { style: "FACT" }],
    ["style 없음", {}],
    ["숫자", { style: 1 }],
    ["null 본문", null],
  ])("style이 올바르지 않으면(%s) 400이고 번호가 응답에 없다", async (_label, body) => {
    const response = await callPost(body);
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).not.toContain(FAKE_FACT);
    expect(text).not.toContain(FAKE_HEART);
  });

  it("JSON이 아닌 본문은 400", async () => {
    const response = await callPost("not-json{");
    expect(response.status).toBe(400);
  });

  it("환경변수가 없으면 404", async () => {
    vi.stubEnv("CONSULT_PHONE_FACT", "");
    const response = await callPost({ style: "fact" });
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("환경변수가 공백뿐이어도 404", async () => {
    vi.stubEnv("CONSULT_PHONE_HEART", "   ");
    const response = await callPost({ style: "heart" });
    expect(response.status).toBe(404);
  });

  it("어떤 경우에도 번호를 콘솔에 남기지 않는다", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );

    await callPost({ style: "fact" });
    await callPost({ style: "heart" });
    await callPost({ style: "other" });

    for (const spy of spies) {
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).not.toContain(FAKE_FACT);
      expect(logged).not.toContain(FAKE_HEART);
    }
  });
});

describe("isConsultPickerEnabled — 버튼 노출 여부", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("두 번호가 모두 있으면 true", () => {
    vi.stubEnv("CONSULT_PHONE_FACT", FAKE_FACT);
    vi.stubEnv("CONSULT_PHONE_HEART", FAKE_HEART);
    expect(isConsultPickerEnabled()).toBe(true);
  });

  it("하나라도 비어 있으면 false", () => {
    vi.stubEnv("CONSULT_PHONE_FACT", FAKE_FACT);
    vi.stubEnv("CONSULT_PHONE_HEART", "");
    expect(isConsultPickerEnabled()).toBe(false);
  });

  it("둘 다 없으면 false", () => {
    vi.stubEnv("CONSULT_PHONE_FACT", "");
    vi.stubEnv("CONSULT_PHONE_HEART", "");
    expect(isConsultPickerEnabled()).toBe(false);
  });
});
