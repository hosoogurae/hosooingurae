import type { MetadataRoute } from "next";
import { getAllListings } from "./lib/listings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

// 매물은 공개/비공개가 수시로 바뀌므로, 기본 캐시(재배포 전까지 고정)로 두지
// 않고 1시간마다 다시 만듭니다.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // getAllListings()의 기본값(includeDrafts 미지정)은 published + 광고중/협의중
  // 매물만 돌려줍니다 — /listings 화면이 보여주는 것과 동일한 기준입니다.
  const listings = await getAllListings();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL!, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/listings`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/sise`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/sell`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${SITE_URL}/listings/${listing.id}`,
    lastModified: listing.updatedAt ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...listingPages];
}
