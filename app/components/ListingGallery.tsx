"use client";

import { useState } from "react";
import ListingBrandPlaceholder from "./ListingBrandPlaceholder";

const PLACEHOLDER_THUMBNAIL_COUNT = 5;

/**
 * complexId 등은 images가 비어 있을 때(매물/타입/단지 사진이 전부
 * 없을 때)만 브랜드 플레이스홀더에 씁니다 — resolveListingGallery가 이미
 * 단지 공통 사진까지 합쳐서 넘기므로, 여기 도달하는 건 정말 사진이
 * 하나도 없는 경우뿐입니다.
 */
export default function ListingGallery({
  images = [],
  complexId,
  complexName,
  propertyType,
  transactionType,
}: {
  images?: string[];
  complexId?: string;
  complexName?: string;
  propertyType?: string;
  transactionType?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasImages = images.length > 0;
  const thumbnailSlots = hasImages
    ? images
    : Array.from({ length: PLACEHOLDER_THUMBNAIL_COUNT });

  return (
    <div>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-navy-900/10">
        {hasImages ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[activeIndex]}
            alt="매물 사진"
            className="h-full w-full object-cover"
          />
        ) : (
          <ListingBrandPlaceholder
            complexId={complexId ?? ""}
            complexName={complexName ?? ""}
            propertyType={propertyType ?? ""}
            transactionType={transactionType ?? ""}
            className="h-full w-full"
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
        {thumbnailSlots.map((src, index) => (
          <button
            key={index}
            type="button"
            disabled={!hasImages}
            onClick={() => setActiveIndex(index)}
            aria-current={hasImages && index === activeIndex}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
              hasImages && index === activeIndex
                ? "border-gold-500"
                : "border-transparent"
            } ${hasImages ? "cursor-pointer" : "cursor-default"}`}
          >
            {hasImages ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src as string}
                alt="매물 사진 썸네일"
                className="h-full w-full object-cover"
              />
            ) : (
              <ListingBrandPlaceholder
                complexId={complexId ?? ""}
                complexName={complexName ?? ""}
                propertyType={propertyType ?? ""}
                transactionType={transactionType ?? ""}
                className="h-full w-full"
                compact
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
