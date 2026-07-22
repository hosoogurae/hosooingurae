"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function FloorPlanImage({
  url,
  previewUrl,
  unitType,
  className = "",
}: {
  /** 확대(라이트박스)에 쓰는 원본. 면적표 등 원문 전체를 그대로 보여줍니다. */
  url: string;
  /** 카드/썸네일에 쓰는 미리보기(상단 정보 배너를 잘라낸 버전). 없으면 원본을 씁니다. */
  previewUrl?: string;
  unitType: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const thumbnailUrl = previewUrl || url;

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block h-full w-full cursor-zoom-in overflow-hidden bg-white ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={`${unitType} 평면도`}
          className="h-full w-full object-contain"
        />
        <span className="absolute right-2 top-2 rounded-full bg-navy-950/80 px-2.5 py-1 text-[11px] font-bold text-gold-400 backdrop-blur">
          {unitType} 평면도
        </span>
        <span className="absolute inset-x-0 bottom-0 bg-navy-950/70 py-1.5 text-center text-[11px] font-medium text-white backdrop-blur-sm">
          클릭하여 크게 보기
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${unitType} 평면도 확대`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${unitType} 평면도 확대`}
            className="h-[80vh] w-[90vw] max-h-[95vh] max-w-[95vw] rounded-lg bg-white object-contain sm:h-[85vh] sm:w-[80vw]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
