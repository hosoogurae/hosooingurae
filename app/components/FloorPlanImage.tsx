"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatUnitTypeLabel } from "../lib/format/listingFields";

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
  fit = "fill",
  showBadge = true,
}: {
  /** 확대(라이트박스)에 쓰는 원본. 면적표 등 원문 전체를 그대로 보여줍니다. */
  url: string;
  /** 카드/썸네일에 쓰는 미리보기(용량을 줄이려고 비율 유지 축소만 한 버전, 잘라내지 않음). 없으면 원본을 씁니다. */
  previewUrl?: string;
  unitType: string;
  className?: string;
  /**
   * "fill"(기본값): 부모가 정해진 높이를 가지고 있을 때(예: aspect-ratio
   * 박스) 그 안을 object-contain으로 가득 채웁니다 — 대표 이미지처럼
   * 정해진 자리를 채워야 하는 곳에 씁니다.
   * "natural": 높이를 강제하지 않고 최대 높이만 두어 원본 비율 그대로
   * 보여줍니다(잘림 방지). 상세 페이지의 "평면도" 섹션처럼 읽는 게
   * 목적인 큰 이미지에 씁니다.
   */
  fit?: "fill" | "natural";
  showBadge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const thumbnailUrl = previewUrl || url;
  const label = formatUnitTypeLabel(unitType);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block cursor-zoom-in overflow-hidden bg-white ${
          fit === "fill" ? "h-full w-full" : "w-full"
        } ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={`${label} 평면도`}
          className={
            fit === "fill"
              ? "h-full w-full object-contain"
              : "mx-auto block h-auto max-h-[70vh] w-auto max-w-full object-contain"
          }
        />
        {showBadge && (
          <span className="absolute right-2 top-2 rounded-full bg-navy-950/70 px-2 py-0.5 text-[10px] font-bold text-gold-400 opacity-70 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
            {label} 평면도
          </span>
        )}
        <span className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-navy-950/70 px-3 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100">
          클릭하여 크게 보기
        </span>
      </button>

      {open && (
        <FloorPlanLightbox
          url={url}
          unitType={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
