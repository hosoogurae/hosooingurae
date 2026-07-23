import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import type { ListingWithComplex } from "../lib/listings";
import { getListingById } from "../lib/listings";
import { buildCompareInquiryMessage } from "../lib/listingInquiry";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import InquirySmsButton from "../components/InquirySmsButton";
import ListingImagePlaceholder from "../components/ListingImagePlaceholder";
import ClearCompareSelectionButton from "./ClearCompareSelectionButton";
import RemoveFromCompareButton from "./RemoveFromCompareButton";
import { MAX_COMPARE_SELECTION } from "../lib/compareConstants";

export const metadata: Metadata = {
  title: "매물 비교 | 호수공인중개사사무소",
  robots: { index: false, follow: false },
};

// 매물 데이터를 Supabase에서 매 요청마다 새로 읽어오므로 정적 캐싱을 끕니다.
export const dynamic = "force-dynamic";

interface ComparePageProps {
  searchParams: Promise<{ ids?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

interface AttributeRow {
  label: string;
  /** 모바일 "항목별 세로비교"에서는 대표 사진을 상단 요약에 이미 보여주므로 제외합니다. */
  hideOnMobile?: boolean;
  render: (listing: ListingWithComplex) => React.ReactNode;
}

const ATTRIBUTE_ROWS: AttributeRow[] = [
  {
    label: "대표 사진",
    hideOnMobile: true,
    render: (l) => {
      const src = l.images?.[0] ?? l.image;
      return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${l.complex.name} 대표 이미지`}
          className="h-28 w-full rounded-md object-cover"
        />
      ) : (
        <ListingImagePlaceholder className="h-28 w-full rounded-md" />
      );
    },
  },
  {
    label: "단지명",
    render: (l) => <span className="font-bold text-navy-950">{l.complex.name}</span>,
  },
  { label: "거래유형", render: (l) => l.transactionType },
  {
    label: "가격",
    render: (l) => <span className="font-bold text-gold-600">{l.priceLabel}</span>,
  },
  { label: "동", render: (l) => (l.building?.trim() ? l.building : "동 정보 미등록") },
  { label: "층", render: (l) => `${l.floor}/${l.totalFloors}층` },
  { label: "공급면적", render: (l) => `${l.supplyArea}㎡` },
  { label: "전용면적", render: (l) => `${l.exclusiveArea}㎡` },
  { label: "방 / 욕실", render: (l) => `방 ${l.roomCount} · 욕실 ${l.bathroomCount}` },
  { label: "방향", render: (l) => l.direction },
  { label: "입주 가능일", render: (l) => l.moveInDate },
  {
    label: "주요 특징",
    render: (l) =>
      l.features.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {l.features.slice(0, 6).map((feature) => (
            <span
              key={feature}
              className="rounded border border-gold-500/30 px-1.5 py-0.5 text-xs text-gold-600"
            >
              {feature}
            </span>
          ))}
        </div>
      ) : (
        "-"
      ),
  },
  {
    label: "상세보기",
    render: (l) => (
      <Link
        href={`/listings/${l.id}`}
        className="inline-block rounded-md border border-navy-900/15 px-3 py-1.5 text-xs font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
      >
        상세보기 →
      </Link>
    ),
  },
];

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const resolvedSearchParams = await searchParams;
  const rawIds = firstValue(resolvedSearchParams.ids)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  // 클라이언트에서 이미 3개로 막지만, URL은 누구나 조작할 수 있으니 서버에서도
  // 중복 제거 + 최대 개수 제한을 다시 적용합니다.
  const requestedIds = [...new Set(rawIds)].slice(0, MAX_COMPARE_SELECTION);

  const fetched = await Promise.all(
    requestedIds.map((id) => getListingById(id)),
  );
  // getListingById는 공개(published) 매물만 돌려주므로, draft이거나 존재하지
  // 않는 id는 여기서 자동으로 undefined가 되어 빠집니다.
  const validListings = fetched.filter(
    (listing): listing is ListingWithComplex => listing !== undefined,
  );
  const someExcluded = validListings.length < requestedIds.length;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const pageUrl =
    host && validListings.length > 0
      ? `${protocol}://${host}/compare?ids=${validListings.map((l) => l.id).join(",")}`
      : undefined;

  const inquiryMobileNumber =
    process.env.NEXT_PUBLIC_INQUIRY_MOBILE?.trim() || undefined;
  const inquiryMessage = buildCompareInquiryMessage({
    listings: validListings.map((l) => ({
      complexName: l.complex.name,
      building: l.building,
      floor: l.floor,
      transactionType: l.transactionType,
      priceLabel: l.priceLabel,
    })),
    pageUrl,
  });

  const uniqueComplexes = Array.from(
    new Map(validListings.map((l) => [l.complex.id, l.complex])).values(),
  );
  const hasComplexInfo = uniqueComplexes.some(
    (complex) =>
      complex.totalHouseholds !== undefined ||
      complex.parkingCount !== undefined ||
      complex.heating !== undefined ||
      complex.transportation.subway !== undefined ||
      complex.nearbySchools.length > 0,
  );

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          COMPARE
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          매물 비교
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          선택하신 매물을 나란히 비교해보세요.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        {requestedIds.length === 0 && (
          <p className="rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
            비교할 매물을 아직 선택하지 않았습니다.{" "}
            <Link href="/listings" className="text-gold-600 underline-offset-4 hover:underline">
              전체 매물 보러 가기 →
            </Link>
          </p>
        )}

        {requestedIds.length > 0 && validListings.length === 0 && (
          <p className="rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
            비교할 매물을 찾을 수 없습니다(비공개로 전환되었거나 삭제된 매물일 수
            있어요).{" "}
            <Link href="/listings" className="text-gold-600 underline-offset-4 hover:underline">
              전체 매물 보러 가기 →
            </Link>
          </p>
        )}

        {validListings.length === 1 && (
          <p className="mb-6 rounded-md border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm font-medium text-navy-900">
            비교하려면 매물을 1개 더 선택해주세요. 지금은 1개만 있어 참고용으로만
            보여드립니다.
          </p>
        )}

        {someExcluded && validListings.length > 0 && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            선택하신 매물 중 일부는 더 이상 공개되어 있지 않아 비교에서
            제외했습니다.
          </p>
        )}

        {validListings.length > 0 && (
          <>
            <div className="mb-4 flex justify-end">
              <ClearCompareSelectionButton />
            </div>

            {/* 데스크톱: 속성 라벨 고정 + 매물별 값 가로 스크롤 */}
            <div className="hidden overflow-x-auto rounded-xl border border-navy-900/10 sm:block">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `140px repeat(${validListings.length}, minmax(200px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-10 border-b border-r border-navy-900/10 bg-navy-900/[0.03] p-3" />
                {validListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="border-b border-navy-900/10 p-3 text-center"
                  >
                    <RemoveFromCompareButton
                      listingId={listing.id}
                      remainingIds={validListings
                        .map((l) => l.id)
                        .filter((id) => id !== listing.id)}
                    />
                  </div>
                ))}

                {ATTRIBUTE_ROWS.map((row) => (
                  <Fragment key={row.label}>
                    <div className="sticky left-0 z-10 border-b border-r border-navy-900/10 bg-white p-3 text-xs font-bold text-navy-800/60">
                      {row.label}
                    </div>
                    {validListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="border-b border-navy-900/10 p-3 text-sm text-navy-900"
                      >
                        {row.render(listing)}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* 모바일: 항목별 세로비교 — 표를 억지로 압축하지 않고 항목마다 매물 값을 나열 */}
            <div className="flex flex-col gap-6 sm:hidden">
              <div className="flex flex-col gap-3">
                {validListings.map((listing, index) => {
                  const src = listing.images?.[0] ?? listing.image;
                  return (
                    <div
                      key={listing.id}
                      className="flex items-center gap-3 rounded-xl border border-navy-900/10 p-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <ListingImagePlaceholder className="h-14 w-14 shrink-0 rounded-md" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-navy-950">
                          {listing.complex.name}
                        </p>
                        <p className="text-xs text-navy-800/60">
                          {listing.building?.trim() ? listing.building : "동 정보 미등록"}
                        </p>
                      </div>
                      <RemoveFromCompareButton
                        listingId={listing.id}
                        remainingIds={validListings
                          .map((l) => l.id)
                          .filter((id) => id !== listing.id)}
                      />
                    </div>
                  );
                })}
              </div>

              {ATTRIBUTE_ROWS.filter((row) => !row.hideOnMobile).map((row) => (
                <div key={row.label} className="rounded-xl border border-navy-900/10 p-4">
                  <p className="text-xs font-bold text-gold-600">{row.label}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {validListings.map((listing, index) => (
                      <li
                        key={listing.id}
                        className="flex items-start gap-2 text-sm text-navy-900"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900/10 text-[10px] font-bold text-navy-800">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">{row.render(listing)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {hasComplexInfo && (
              <div className="mt-10">
                <h2 className="text-sm font-bold text-navy-950">
                  단지 정보
                  {uniqueComplexes.length > 1 ? " 비교" : ""}
                </h2>
                <p className="mt-1 text-xs text-navy-800/50">
                  같은 단지 매물은 한 번만 보여드립니다.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {uniqueComplexes.map((complex) => (
                    <div
                      key={complex.id}
                      className="rounded-xl border border-navy-900/10 p-4"
                    >
                      <p className="font-bold text-navy-950">{complex.name}</p>
                      <dl className="mt-2 space-y-1.5 text-sm text-navy-800/70">
                        {complex.totalHouseholds !== undefined && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-navy-800/50">세대수</dt>
                            <dd>{complex.totalHouseholds.toLocaleString()}세대</dd>
                          </div>
                        )}
                        {complex.parkingCount !== undefined && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-navy-800/50">주차</dt>
                            <dd className="text-right">
                              {complex.parkingCount.toLocaleString()}대
                              {complex.parkingPerHousehold !== undefined
                                ? ` (세대당 ${complex.parkingPerHousehold}대)`
                                : ""}
                            </dd>
                          </div>
                        )}
                        {complex.heating && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-navy-800/50">난방</dt>
                            <dd>{complex.heating}</dd>
                          </div>
                        )}
                        {complex.transportation.subway && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-navy-800/50">교통</dt>
                            <dd className="text-right">
                              {complex.transportation.subway}
                              {complex.transportation.subwayDistance
                                ? ` (${complex.transportation.subwayDistance})`
                                : ""}
                            </dd>
                          </div>
                        )}
                        {complex.nearbySchools.length > 0 && (
                          <div className="flex justify-between gap-2">
                            <dt className="shrink-0 text-navy-800/50">학교</dt>
                            <dd className="text-right">
                              {complex.nearbySchools.join(", ")}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-navy-900/10 p-6 text-center sm:flex-row sm:justify-center">
              <div className="sm:mr-4 sm:text-left">
                <p className="text-base font-bold text-navy-950">
                  어떤 집이 더 나을지 상담받기
                </p>
                <p className="mt-1 text-xs text-navy-800/60">
                  비교 중인 매물 정보가 문의 내용에 자동으로 포함됩니다.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {inquiryMobileNumber ? (
                  <InquirySmsButton
                    phoneNumber={inquiryMobileNumber}
                    message={inquiryMessage}
                    officePhoneNumber={PHONE_NUMBER}
                    officePhoneHref={PHONE_HREF}
                  />
                ) : (
                  <a
                    href={PHONE_HREF}
                    className="rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3 text-center text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
                  >
                    전화 상담 {PHONE_NUMBER}
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
