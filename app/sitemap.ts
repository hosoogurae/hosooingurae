import type { MetadataRoute } from "next";
import { LISTINGS_PAGE_SIZE } from "./lib/listingPagination";
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
    { url: `${SITE_URL}/notices`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // /listings는 필터 없는 기본 목록을 페이지 단위(LISTINGS_PAGE_SIZE)로
  // 나눠 보여줍니다(app/listings/page.tsx 참고). 필터 조합까지 sitemap에
  // 넣으면 조합이 지나치게 많아지므로, 기본(필터 없음) 정렬의 목록
  // 페이지들만 넣습니다 — 이미 들고 있는 listings 배열 길이로 페이지 수를
  // 계산해서 추가 쿼리 없이 만듭니다. 1페이지는 위 staticPages의
  // "/listings"와 같은 주소라 2페이지부터만 추가합니다.
  const listingsTotalPages = Math.max(1, Math.ceil(listings.length / LISTINGS_PAGE_SIZE));
  const listingsPaginationPages: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(0, listingsTotalPages - 1) },
    (_, index) => ({
      url: `${SITE_URL}/listings?page=${index + 2}`,
      changeFrequency: "daily",
      priority: 0.6,
    }),
  );

  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${SITE_URL}/listings/${listing.id}`,
    lastModified: listing.updatedAt ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...listingsPaginationPages, ...listingPages];
}
