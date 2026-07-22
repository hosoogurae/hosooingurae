"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function FloorPlanLightbox({
  url,
  unitType,
  onClose,
}: {
  url: string;
  unitType: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    // 뒤쪽 페이지가 스크롤되지 않게 잠급니다. overflow만 바꾸므로 스크롤
    // 위치 자체는 건드리지 않아, 닫으면 원래 위치 그대로 돌아옵니다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${unitType} 평면도 확대`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${unitType} 평면도 확대`}
        className="h-[90vh] w-[90vw] rounded-lg bg-white object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

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
        <span className="absolute right-2 top-2 rounded-full bg-navy-950/70 px-2 py-0.5 text-[10px] font-bold text-gold-400 opacity-70 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          {unitType} 평면도
        </span>
        <span className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-navy-950/70 px-3 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          클릭하여 크게 보기
        </span>
      </button>

      {open && (
        <FloorPlanLightbox
          url={url}
          unitType={unitType}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
