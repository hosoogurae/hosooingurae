import Image from "next/image";
import Link from "next/link";
import type { FloorPlanImage } from "../data/floorPlans";
import { resolveListingHeroImage } from "../lib/listingGalleryImages";
import type { ListingWithComplex } from "../lib/listings";
import {
  formatArea,
  formatFloor,
  formatFloorRange,
  formatRooms,
} from "../lib/format/listingFields";
import ListingBrandPlaceholder from "./ListingBrandPlaceholder";

// 목록 그리드(sm:2열/lg:3열, 컨테이너 max-w-6xl)에서 카드 이미지가 실제로
// 차지하는 폭 근사치입니다. 이 값이 있어야 next/image가 큰 원본 대신 실제
// 표시 크기에 맞는 작은 변형을 요청합니다.
const CARD_IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

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
        ? formatFloorRange(listing.floor, listing.totalFloors)
        : formatFloor(listing.floor),
    );
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export default function ListingCard({
  listing,
  floorPlanImage,
  complexImageUrl,
  priceNotice,
  emphasize,
  priority = false,
}: {
  listing: ListingWithComplex;
  floorPlanImage?: FloorPlanImage;
  /** 매물 사진·평면도가 모두 없을 때 세 번째로 시도할 단지 대표 이미지. */
  complexImageUrl?: string;
  /** 가격 바로 아래에 경고색으로 붙일 한 줄 안내(예: 예산 초과/부족 안내). 없으면 표시 안 함. */
  priceNotice?: string;
  /** 카드 테두리·배경을 경고 톤으로 바꿔 조건에 맞는 매물과 한눈에 구분되게 합니다. */
  emphasize?: "warning";
  /**
   * 첫 화면에 바로 보이는 카드(보통 그리드 첫 줄 2~3장)만 true로 넘겨
   * 지연 로딩 없이 즉시 불러옵니다. 그리드 카드는 뷰포트에 따라 어느 것이
   * LCP가 될지 달라질 수 있어(Next.js 16 문서상 이런 경우엔 preload 대신
   * loading="eager" 권장) next/image의 preload/priority prop은 쓰지 않고
   * loading 속성만 바꿉니다.
   */
  priority?: boolean;
}) {
  const heroImage = resolveListingHeroImage(listing);
  const floorPlanThumbnail =
    floorPlanImage && (floorPlanImage.previewUrl || floorPlanImage.url);
  const buildingFloorLine = formatBuildingFloor(listing);
  const loading = priority ? "eager" : "lazy";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={`group flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-lg ${
        emphasize === "warning"
          ? "border-amber-300 bg-amber-50/50"
          : "border-navy-900/10 bg-white"
      }`}
    >
      <div className="relative h-52 shrink-0 sm:h-56 lg:h-60">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${listing.complex.name} 대표 이미지`}
            fill
            sizes={CARD_IMAGE_SIZES}
            loading={loading}
            className="object-cover"
          />
        ) : floorPlanThumbnail ? (
          <div className="relative h-full w-full bg-white p-3">
            <Image
              src={floorPlanThumbnail}
              alt={`${listing.unitType} 평면도`}
              fill
              sizes={CARD_IMAGE_SIZES}
              loading={loading}
              className="object-contain"
            />
            <span className="absolute right-2 top-2 z-10 rounded-full bg-navy-950/70 px-2 py-0.5 text-[10px] font-bold text-gold-400 backdrop-blur">
              {listing.unitType} 평면도
            </span>
          </div>
        ) : complexImageUrl ? (
          <Image
            src={complexImageUrl}
            alt={`${listing.complex.name} 단지 사진`}
            fill
            sizes={CARD_IMAGE_SIZES}
            loading={loading}
            className="object-cover"
          />
        ) : (
          <ListingBrandPlaceholder
            propertyType={listing.propertyType}
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

        {priceNotice && (
          <p className="-mt-2 text-sm font-bold text-amber-700">{priceNotice}</p>
        )}

        {buildingFloorLine && (
          <p className="-mt-2 text-sm font-medium text-navy-800/60">
            {buildingFloorLine}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-y-1 text-sm text-navy-800/80">
          <dt className="text-navy-800/50">전용면적</dt>
          <dd>{formatArea(listing.exclusiveArea, "전용 ")}</dd>
          <dt className="text-navy-800/50">방향</dt>
          <dd>{listing.direction}</dd>
          <dt className="text-navy-800/50">방/욕실</dt>
          <dd>
            방 {formatRooms(listing.roomCount)} / 욕실{" "}
            {formatRooms(listing.bathroomCount)}
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
