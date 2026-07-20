import Link from "next/link";
import type { ListingWithComplex } from "../lib/listings";
import ListingImagePlaceholder from "./ListingImagePlaceholder";

function formatVerifiedDate(dateStr: string) {
  return dateStr.replaceAll("-", ".");
}

export default function ListingCard({
  listing,
}: {
  listing: ListingWithComplex;
}) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-navy-900/10 bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3]">
        <ListingImagePlaceholder className="h-full w-full" />
        {listing.verifiedDate && (
          <span className="absolute left-3 top-3 rounded-full bg-navy-950/90 px-3 py-1 text-xs font-semibold text-gold-400">
            확인매물 {formatVerifiedDate(listing.verifiedDate)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <span className="w-fit rounded-full bg-navy-900/5 px-3 py-1 text-xs font-semibold text-navy-800">
          아파트
        </span>

        <h3 className="text-lg font-bold leading-snug text-navy-950">
          {listing.complex.name}
        </h3>

        <p className="text-xl font-black text-gold-600">
          {listing.transactionType} {listing.priceLabel}
        </p>

        <dl className="grid grid-cols-2 gap-y-1 text-sm text-navy-800/80">
          <dt className="text-navy-800/50">전용면적</dt>
          <dd>전용 {listing.exclusiveArea}㎡</dd>
          <dt className="text-navy-800/50">층수</dt>
          <dd>
            {listing.floor}층 / {listing.totalFloors}층
          </dd>
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
