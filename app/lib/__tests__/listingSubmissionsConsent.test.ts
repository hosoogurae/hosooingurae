import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /sell(매물 내놓기) 폼의 개인정보 수집 동의는 화면 체크박스만으로는
 * 강제되지 않습니다(체크박스는 devtools 등으로 우회 가능) — 실제로
 * 막는 건 이 API 라우트의 서버 측 검증뿐입니다. 이 테스트가 없으면
 * 나중에 리팩터링하다 그 한 줄이 사라져도 아무도 모릅니다.
 */

const createListingSubmissionMock = vi.fn();

vi.mock("../listingSubmissions", () => ({
  createListingSubmission: (...args: unknown[]) => createListingSubmissionMock(...args),
}));

const VALID_PAYLOAD = {
  complexName: "호수마을2단지",
  transactionType: "매매",
  desiredPriceLabel: "4억 2,000만원",
  contactName: "김철수",
  contactPhone: "010-1234-5678",
};

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/listing-submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/listing-submissions — 개인정보 수집 동의", () => {
  beforeEach(() => {
    createListingSubmissionMock.mockReset();
  });

  it("동의값이 아예 없으면 저장을 시도하지 않고 400과 한국어 에러를 반환한다", async () => {
    const { POST } = await import("../../api/listing-submissions/route");
    const response = await POST(buildRequest(VALID_PAYLOAD));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toContain("개인정보 수집·이용에 동의해주세요.");
    expect(createListingSubmissionMock).not.toHaveBeenCalled();
  });

  it("동의값이 false여도 마찬가지로 거부하고 저장을 시도하지 않는다", async () => {
    const { POST } = await import("../../api/listing-submissions/route");
    const response = await POST(buildRequest({ ...VALID_PAYLOAD, consent: false }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toContain("개인정보 수집·이용에 동의해주세요.");
    expect(createListingSubmissionMock).not.toHaveBeenCalled();
  });

  it("동의값이 true이고 나머지 항목이 유효하면 저장을 시도한다", async () => {
    createListingSubmissionMock.mockResolvedValue({
      submission: { id: "sub-1" },
    });

    const { POST } = await import("../../api/listing-submissions/route");
    const response = await POST(buildRequest({ ...VALID_PAYLOAD, consent: true }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.submission).toEqual({ id: "sub-1" });
    expect(createListingSubmissionMock).toHaveBeenCalledTimes(1);
  });
});
