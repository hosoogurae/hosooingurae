"use client";

import { useState } from "react";
import ListingMediaPlaceholder from "./ListingMediaPlaceholder";

const PLACEHOLDER_THUMBNAIL_COUNT = 5;

export default function ListingGallery({ images = [] }: { images?: string[] }) {
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
          <ListingMediaPlaceholder className="h-full w-full" />
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
              <ListingMediaPlaceholder className="h-full w-full" compact />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
