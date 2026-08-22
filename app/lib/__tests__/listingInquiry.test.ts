import { describe, expect, it } from "vitest";
import { buildCompareInquiryMessage, buildInquiryMessage } from "../listingInquiry";

describe("buildInquiryMessage", () => {
  it("층수를 확인할 수 없으면(0) 0층이 아니라 그 항목 자체를 생략한다", () => {
    const message = buildInquiryMessage({
      complexName: "호수마을e편한세상2단지",
      building: "203동",
      floor: 0,
      transactionType: "매매",
      priceLabel: "4억 1,000만원",
    });

    expect(message).not.toContain("0층");
    expect(message).toContain("203동");
  });

  it("층수가 있으면 동/층을 함께 표시한다", () => {
    const message = buildInquiryMessage({
      complexName: "호수마을e편한세상2단지",
      building: "203동",
      floor: 11,
      transactionType: "매매",
      priceLabel: "4억 1,000만원",
    });

    expect(message).toContain("203동 / 11층");
  });
});

describe("buildCompareInquiryMessage", () => {
  it("층수를 확인할 수 없는 매물도 0층 없이 나열한다", () => {
    const message = buildCompareInquiryMessage({
      listings: [
        {
          complexName: "호수마을e편한세상2단지",
          building: "203동",
          floor: 0,
          transactionType: "매매",
          priceLabel: "4억 1,000만원",
        },
      ],
    });

    expect(message).not.toContain("0층");
    expect(message).toContain("203동");
  });
});
