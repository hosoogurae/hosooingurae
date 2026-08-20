import Link from "next/link";
import type { FloorPlanImage } from "../data/floorPlans";
import { resolveListingHeroImage } from "../lib/listingGalleryImages";
import type { ListingWithComplex } from "../lib/listings";
import ListingBrandPlaceholder from "./ListingBrandPlaceholder";

function formatVerifiedDate(dateStr: string) {
  return dateStr.replaceAll("-", ".");
}

/** "201동 · 3층 / 20층"처럼 대표 식별 정보를 만듭니다. 없는 값은 추측하지 않고 생략합니다. */
function formatBuildingFloor(listing: ListingWithComplex): string | undefined {
  const parts: string[] = [];
  if (listing.building && listing.building.trim() !== "") {
    parts.push(listing.building);
  }
  if (listing.floor !== undefined && listing.floor !== null) {
    parts.push(
      listing.totalFloors !== undefined && listing.totalFloors !== null
        ? `${listing.floor}층 / ${listing.totalFloors}층`
        : `${listing.floor}층`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export default function ListingCard({
  listing,
  floorPlanImage,
  complexImageUrl,
}: {
  listing: ListingWithComplex;
  floorPlanImage?: FloorPlanImage;
  /** 매물 사진·평면도가 모두 없을 때 세 번째로 시도할 단지 대표 이미지. */
  complexImageUrl?: string;
}) {
  const heroImage = resolveListingHeroImage(listing);
  const floorPlanThumbnail =
    floorPlanImage && (floorPlanImage.previewUrl || floorPlanImage.url);
  const buildingFloorLine = formatBuildingFloor(listing);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-1 flex-col overflow-hidden rounded-xl border border-navy-900/10 bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative h-52 shrink-0 sm:h-56 lg:h-60">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={`${listing.complex.name} 대표 이미지`}
            className="h-full w-full object-cover"
          />
        ) : floorPlanThumbnail ? (
          <div className="flex h-full w-full items-center justify-center bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={floorPlanThumbnail}
              alt={`${listing.unitType} 평면도`}
              className="max-h-full max-w-full object-contain"
            />
            <span className="absolute right-2 top-2 rounded-full bg-navy-950/70 px-2 py-0.5 text-[10px] font-bold text-gold-400 backdrop-blur">
              {listing.unitType} 평면도
            </span>
          </div>
        ) : complexImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={complexImageUrl}
            alt={`${listing.complex.name} 단지 사진`}
            className="h-full w-full object-cover"
          />
        ) : (
          <ListingBrandPlaceholder
            complexId={listing.complexId}
            complexName={listing.complex.name}
            propertyType={listing.propertyType}
            transactionType={listing.transactionType}
            className="h-full w-full"
          />
        )}
        {listing.verifiedDate && (
          <span className="absolute left-3 top-3 rounded-full bg-navy-950/90 px-3 py-1 text-xs font-semibold text-gold-400">
            확인매물 {formatVerifiedDate(listing.verifiedDate)}
          </span>
        )}
        {listing.dealStatus === "negotiating" && (
          <span className="absolute right-3 top-3 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-semibold text-white">
            계약 진행중
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <span className="w-fit rounded-full bg-navy-900/5 px-3 py-1 text-xs font-semibold text-navy-800">
          {listing.propertyType}
        </span>

        <h3 className="text-lg font-bold leading-snug text-navy-950">
          {listing.complex.name}
        </h3>

        <p className="text-xl font-black text-gold-600">
          {listing.transactionType} {listing.priceLabel}
        </p>

        {buildingFloorLine && (
          <p className="-mt-2 text-sm font-medium text-navy-800/60">
            {buildingFloorLine}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-y-1 text-sm text-navy-800/80">
          <dt className="text-navy-800/50">전용면적</dt>
          <dd>전용 {listing.exclusiveArea}㎡</dd>
          <dt className="text-navy-800/50">방향</dt>
          <dd>{listing.direction}</dd>
          <dt className="text-navy-800/50">방/욕실</dt>
          <dd>
            방 {listing.roomCount} / 욕실 {listing.bathroomCount}
          </dd>
        </dl>

        <p className="text-sm leading-relaxed text-navy-800/70">
          {listing.shortDescription}
        </p>

        <ul className="mt-auto flex flex-wrap gap-2 pt-2">
          {listing.features.slice(0, 4).map((feature) => (
            <li
              key={feature}
              className="rounded-md border border-gold-500/30 px-2 py-1 text-xs font-medium text-gold-600"
            >
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
