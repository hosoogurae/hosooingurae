import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { FloorPlanImage } from "../data/floorPlans";
import { getComplexById } from "../lib/complexes";
import { getComplexRepresentativeImages } from "../lib/complexImages";
import { getFloorPlanImagesByComplex } from "../lib/floorPlans";
import { getListingsPage } from "../lib/listings";
import {
  hasActiveFilters,
  parseListingSearchParams,
  type RawSearchParams,
} from "../lib/listingFilters";
import {
  LISTINGS_PAGE_SIZE,
  buildListingsCanonicalPath,
  buildListingsPageHref,
  parseListingPage,
  resolveListingsPageRedirect,
} from "../lib/listingPagination";
import { parseListingSortKey } from "../lib/listingSort";
import ListingCard from "../components/ListingCard";
import ListingsFilterBar from "../components/ListingsFilterBar";
import ListingsPagination from "../components/ListingsPagination";
import ListingSortSelect from "../components/ListingSortSelect";
import CompareToggle from "../components/CompareToggle";

// 매물 데이터를 Supabase에서 매 요청마다 새로 읽어오므로 정적 캐싱을 끕니다.
export const dynamic = "force-dynamic";

interface ListingsPageProps {
  searchParams: Promise<RawSearchParams>;
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * 페이지 번호가 주소에 포함되므로(canonical이 page별로 달라짐) 정적 metadata
 * 대신 요청마다 계산합니다. sort는 canonical에서 빼서(listingPagination.ts
 * 주석 참고) 정렬만 다른 같은 목록끼리 신호가 나뉘지 않게 합니다.
 */
export async function generateMetadata({
  searchParams,
}: ListingsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const page = parseListingPage(resolvedSearchParams.page);
  return {
    title: "전체 매물 | 호수공인중개사사무소",
    description: "호수공인중개사사무소가 확인한 김포 구래동 실제 매물을 모두 확인하세요.",
    alternates: { canonical: buildListingsCanonicalPath(resolvedSearchParams, page) },
  };
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseListingSearchParams(resolvedSearchParams);
  const filtersActive = hasActiveFilters(filters);
  const sort = parseListingSortKey(firstValue(resolvedSearchParams.sort));
  const requestedPage = parseListingPage(resolvedSearchParams.page);

  const [{ listings, totalCount }, filteredComplex] = await Promise.all([
    getListingsPage({ filters, sort, page: requestedPage, pageSize: LISTINGS_PAGE_SIZE }),
    filters.complexId ? getComplexById(filters.complexId) : Promise.resolve(undefined),
  ]);

  // 요청한 page가 이상한 값(0/음수/소수/문자)이었거나 실제 페이지 수를
  // 넘으면, 주소가 화면과 어긋나지 않도록 올바른 주소로 돌려보냅니다
  // (resolveListingsPageRedirect 참고 — 0건 결과여도 반복 리다이렉트 없음).
  const { totalPages, effectivePage, shouldRedirect } = resolveListingsPageRedirect(
    requestedPage,
    resolvedSearchParams.page,
    totalCount,
    LISTINGS_PAGE_SIZE,
  );
  if (shouldRedirect) {
    redirect(buildListingsPageHref(resolvedSearchParams, effectivePage));
  }

  // 매물마다 평면도를 따로 조회하면 카드 개수만큼 쿼리가 나가므로(N+1),
  // 목록에 나온 단지 id별로 한 번씩만 조회해 매물의 unitType으로 찾아 씁니다.
  const distinctComplexIds = [...new Set(listings.map((l) => l.complexId))];
  const [floorPlansByComplex, complexImagesByComplex] = await Promise.all([
    Promise.all(
      distinctComplexIds.map(
        async (complexId) =>
          [complexId, await getFloorPlanImagesByComplex(complexId)] as const,
      ),
    ).then((entries) => new Map<string, FloorPlanImage[]>(entries)),
    getComplexRepresentativeImages(distinctComplexIds),
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
          initialComplexId={firstValue(resolvedSearchParams.complexId)}
        />

        {filteredComplex && (
          <div className="mx-auto mt-4 flex max-w-4xl items-center justify-center gap-2 text-sm">
            <span className="text-navy-800/60">
              선택한 단지: <strong className="text-navy-900">{filteredComplex.name}</strong>
            </span>
            <Link
              href={`/listings?propertyType=${firstValue(resolvedSearchParams.propertyType) || "apartment"}`}
              className="rounded-full border border-navy-900/15 px-2.5 py-0.5 text-xs font-semibold text-navy-800/60 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              해제 ✕
            </Link>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {totalCount > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-navy-800/60">
              총 <strong className="text-navy-900">{totalCount}</strong>건
            </p>
            <ListingSortSelect />
          </div>
        )}

        {totalCount > 0 ? (
          <>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing, index) => (
                <div key={listing.id} className="flex h-full flex-col">
                  <ListingCard
                    listing={listing}
                    floorPlanImage={getFloorPlanForListing(
                      listing.complexId,
                      listing.unitType,
                    )}
                    complexImageUrl={complexImagesByComplex.get(listing.complexId)}
                    priority={index < 3}
                  />
                  <CompareToggle listingId={listing.id} />
                </div>
              ))}
            </div>
            <ListingsPagination
              currentPage={requestedPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={LISTINGS_PAGE_SIZE}
              buildHref={(page) => buildListingsPageHref(resolvedSearchParams, page)}
            />
          </>
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
