"use client";

import { useState } from "react";

export default function ListingGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-navy-900/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeIndex]}
          alt="매물 사진"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
        {images.map((src, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-current={index === activeIndex}
            className={`aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
              index === activeIndex ? "border-gold-500" : "border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="매물 사진 썸네일"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
