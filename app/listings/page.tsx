import type { Metadata } from "next";
import type { FloorPlanImage } from "../data/floorPlans";
import { getFloorPlanImagesByComplex } from "../lib/floorPlans";
import { getAllListings } from "../lib/listings";
import {
  hasActiveFilters,
  parseListingSearchParams,
  type RawSearchParams,
} from "../lib/listingFilters";
import ListingCard from "../components/ListingCard";
import ListingsFilterBar from "../components/ListingsFilterBar";

export const metadata: Metadata = {
  title: "전체 매물 | 호수공인중개사사무소",
  description: "호수공인중개사사무소가 확인한 김포 구래동 실제 매물을 모두 확인하세요.",
};

// 매물 데이터를 Supabase에서 매 요청마다 새로 읽어오므로 정적 캐싱을 끕니다.
export const dynamic = "force-dynamic";

interface ListingsPageProps {
  searchParams: Promise<RawSearchParams>;
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseListingSearchParams(resolvedSearchParams);
  const filtersActive = hasActiveFilters(filters);

  const listings = await getAllListings({ filters });

  // 매물마다 평면도를 따로 조회하면 카드 개수만큼 쿼리가 나가므로(N+1),
  // 목록에 나온 단지 id별로 한 번씩만 조회해 매물의 unitType으로 찾아 씁니다.
  const distinctComplexIds = [...new Set(listings.map((l) => l.complexId))];
  const floorPlansByComplex = new Map<string, FloorPlanImage[]>(
    await Promise.all(
      distinctComplexIds.map(
        async (complexId) =>
          [complexId, await getFloorPlanImagesByComplex(complexId)] as const,
      ),
    ),
  );

  function getFloorPlanForListing(
    complexId: string,
    unitType: string | undefined,
  ): FloorPlanImage | undefined {
    if (!unitType) return undefined;
    return floorPlansByComplex
      .get(complexId)
      ?.find((image) => image.unitType === unitType);
  }

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          LISTINGS
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          전체 매물
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          호수공인중개사사무소가 현장에서 직접 확인한 구래동 매물을
          안내합니다.
        </p>
      </section>

      <div className="px-6">
        <ListingsFilterBar
          initialPropertyType={firstValue(resolvedSearchParams.propertyType)}
          initialTransactionType={firstValue(resolvedSearchParams.transactionType)}
          initialPriceRange={firstValue(resolvedSearchParams.priceRange)}
        />
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {listings.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                floorPlanImage={getFloorPlanForListing(
                  listing.complexId,
                  listing.unitType,
                )}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-navy-800/60">
            {filtersActive
              ? "조건에 맞는 매물이 없습니다."
              : "현재 등록된 매물이 없습니다. 곧 새로운 매물로 찾아뵙겠습니다."}
          </p>
        )}
      </section>
    </>
  );
}
