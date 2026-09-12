import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildListingAnnouncementBody,
  type ListingAnnouncementListing,
} from "../listingAnnouncementSms";

const LISTING_A: ListingAnnouncementListing = {
  id: "listing-a",
  complexName: "호수마을2단지",
  building: "208동",
  floor: 21,
  transactionType: "매매",
  priceLabel: "4억 2,500",
};

const LISTING_B: ListingAnnouncementListing = {
  id: "listing-b",
  complexName: "김포한강아이파크",
  building: "308동",
  floor: 12,
  transactionType: "매매",
  priceLabel: "5억",
};

const LISTING_C: ListingAnnouncementListing = {
  id: "listing-c",
  complexName: "한강신도시반도유보라",
  building: "101동",
  floor: 5,
  transactionType: "전세",
  priceLabel: "3억",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hosoobudongsan.kr");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildListingAnnouncementBody", () => {
  it("매물 1개면 /listings/{id} 링크를 쓴다", () => {
    const { body, linkUrl } = buildListingAnnouncementBody([LISTING_A]);

    expect(linkUrl).toBe("https://hosoobudongsan.kr/listings/listing-a");
    expect(body).toBe(
      [
        "안녕하세요. {사무소명}입니다.",
        "문의하신 매물 안내드립니다.",
        "",
        "1. 호수마을2단지 208동 21층",
        "   매매 4억 2,500",
        "",
        "사진·평면도 등 자세한 내용은 아래에서 보실 수 있습니다.",
        "https://hosoobudongsan.kr/listings/listing-a",
        "",
        "문의: {부동산전화번호}",
      ].join("\n"),
    );
  });

  it("매물 3개면 /compare?ids=... 링크를 쓰고, 번호·ids 순서가 고른 순서와 같다", () => {
    // 일부러 등록순이 아닌 순서로 고른 상황을 재현합니다.
    const { body, linkUrl } = buildListingAnnouncementBody([LISTING_C, LISTING_A, LISTING_B]);

    expect(linkUrl).toBe(
      "https://hosoobudongsan.kr/compare?ids=listing-c,listing-a,listing-b",
    );
    expect(body).toBe(
      [
        "안녕하세요. {사무소명}입니다.",
        "문의하신 매물 안내드립니다.",
        "",
        "1. 한강신도시반도유보라 101동 5층",
        "   전세 3억",
        "2. 호수마을2단지 208동 21층",
        "   매매 4억 2,500",
        "3. 김포한강아이파크 308동 12층",
        "   매매 5억",
        "",
        "사진·평면도 등 자세한 내용은 아래에서 보실 수 있습니다.",
        "https://hosoobudongsan.kr/compare?ids=listing-c,listing-a,listing-b",
        "",
        "문의: {부동산전화번호}",
      ].join("\n"),
    );
  });

  it("동·층 정보가 없는 매물은 지어내지 않고 그 부분만 생략한다", () => {
    const noBuildingNoFloor: ListingAnnouncementListing = {
      ...LISTING_A,
      building: "",
      floor: 0,
    };
    const noFloorOnly: ListingAnnouncementListing = {
      ...LISTING_B,
      floor: 0,
    };

    const { body } = buildListingAnnouncementBody([noBuildingNoFloor, noFloorOnly]);

    expect(body).toContain("1. 호수마을2단지\n   매매 4억 2,500");
    expect(body).toContain("2. 김포한강아이파크 308동\n   매매 5억");
    expect(body).not.toContain("층 정보 문의");
  });

  it("NEXT_PUBLIC_SITE_URL이 없으면 링크 문단을 생략하고 linkUrl은 undefined다", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const { body, linkUrl } = buildListingAnnouncementBody([LISTING_A]);

    expect(linkUrl).toBeUndefined();
    expect(body).not.toContain("보실 수 있습니다");
    expect(body).toBe(
      [
        "안녕하세요. {사무소명}입니다.",
        "문의하신 매물 안내드립니다.",
        "",
        "1. 호수마을2단지 208동 21층",
        "   매매 4억 2,500",
        "",
        "문의: {부동산전화번호}",
      ].join("\n"),
    );
  });
});
