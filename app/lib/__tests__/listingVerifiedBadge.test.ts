import { describe, expect, it } from "vitest";
import {
  getVerifiedBadgeLabel,
  VERIFIED_BADGE_MAX_AGE_DAYS,
} from "../listingVerifiedBadge";

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("getVerifiedBadgeLabel — 날짜 경계", () => {
  it("값이 없으면 배지를 표시하지 않는다", () => {
    expect(getVerifiedBadgeLabel(undefined)).toBeNull();
  });

  it(`${VERIFIED_BADGE_MAX_AGE_DAYS - 1}일 경과는 표시한다`, () => {
    expect(getVerifiedBadgeLabel(isoDaysAgo(VERIFIED_BADGE_MAX_AGE_DAYS - 1))).not.toBeNull();
  });

  it(`${VERIFIED_BADGE_MAX_AGE_DAYS}일 경과(경계값)는 표시한다`, () => {
    expect(getVerifiedBadgeLabel(isoDaysAgo(VERIFIED_BADGE_MAX_AGE_DAYS))).not.toBeNull();
  });

  it(`${VERIFIED_BADGE_MAX_AGE_DAYS + 1}일 경과는 표시하지 않는다`, () => {
    expect(getVerifiedBadgeLabel(isoDaysAgo(VERIFIED_BADGE_MAX_AGE_DAYS + 1))).toBeNull();
  });

  it("표시될 때 문구 형식은 '확인매물 YYYY.MM.DD'다", () => {
    const label = getVerifiedBadgeLabel("2026-09-15T00:00:00+00:00");
    expect(label).toBe("확인매물 2026.09.15");
  });
});
