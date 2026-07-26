import Link from "next/link";
import type { ComplexImage } from "../data/complexImages";
import type { FloorPlanImage } from "../data/floorPlans";
import type { UnitTypeImage } from "../data/unitTypeImages";
import { getComplexImages } from "../lib/complexImages";
import { getFloorPlanImagesByComplex } from "../lib/floorPlans";
import { resolveListingGallery } from "../lib/listingGalleryImages";
import { getFeaturedListings } from "../lib/listings";
import { getUnitTypeImagesByComplex } from "../lib/unitTypeImages";
import ListingCard from "./ListingCard";
import { ArrowIcon } from "./icons";

export default async function FeaturedProperties() {
  const featuredListings = await getFeaturedListings();

  // 매물마다 평면도/단지·타입 공통 사진을 따로 조회하면 카드 개수만큼 쿼리가
  // 나가므로(N+1), 목록에 나온 단지 id별로 한 번씩만 조회해 매물의 unitType으로
  // 찾아 씁니다. (app/listings/page.tsx와 동일한 패턴)
  const distinctComplexIds = [...new Set(featuredListings.map((l) => l.complexId))];
  const [floorPlansByComplex, unitTypeImagesByComplex, complexImagesByComplex] =
    await Promise.all([
      Promise.all(
        distinctComplexIds.map(
          async (complexId) =>
            [complexId, await getFloorPlanImagesByComplex(complexId)] as const,
        ),
      ).then((entries) => new Map<string, FloorPlanImage[]>(entries)),
      Promise.all(
        distinctComplexIds.map(
          async (complexId) =>
            [complexId, await getUnitTypeImagesByComplex(complexId)] as const,
        ),
      ).then((entries) => new Map<string, UnitTypeImage[]>(entries)),
      Promise.all(
        distinctComplexIds.map(
          async (complexId) => [complexId, await getComplexImages(complexId)] as const,
        ),
      ).then((entries) => new Map<string, ComplexImage[]>(entries)),
    ]);

  function getFloorPlanForListing(
    complexId: string,
    unitType: string | undefined,
  ): FloorPlanImage | undefined {
    if (!unitType) return undefined;
    return floorPlansByComplex
      .get(complexId)
      ?.find((image) => image.unitType === unitType);
  }

  function getGalleryForListing(
    complexId: string,
    unitType: string | undefined,
    listingImages: string[] | undefined,
  ): string[] {
    const unitImages = unitType
      ? (unitTypeImagesByComplex.get(complexId) ?? []).filter(
          (image) => image.unitType === unitType,
        )
      : [];
    return resolveListingGallery({
      listingImages,
      unitTypeImages: unitImages.map((image) => image.url),
      complexImages: (complexImagesByComplex.get(complexId) ?? []).map(
        (image) => image.url,
      ),
    });
  }

  return (
    <section id="properties" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-14 max-w-xl text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-600">
          FEATURED
        </p>
        <h2 className="text-2xl font-black text-navy-950 sm:text-3xl">
          추천매물
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
          호수공인중개사사무소가 엄선한 구래동 아파트·오피스텔·상가 매물을
          만나보세요.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {featuredListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            floorPlanImage={getFloorPlanForListing(
              listing.complexId,
              listing.unitType,
            )}
            galleryImages={getGalleryForListing(
              listing.complexId,
              listing.unitType,
              listing.images,
            )}
          />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/listings"
          className="group inline-flex items-center gap-2 rounded-full border border-navy-900/15 px-6 py-3 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          전체 매물 보기
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
