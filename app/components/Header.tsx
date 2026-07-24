"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ApartmentComplexOption } from "../lib/listings";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { ChevronDownIcon, PhoneIcon } from "./icons";

const SIMPLE_NAV_ITEMS = [
  { label: "오피스텔", href: "/listings?propertyType=officetel" },
  { label: "상가", href: "/listings?propertyType=commercial" },
  { label: "우리 집 시세", href: "/valuation" },
  { label: "매물 내놓기", href: "/sell" },
];

const APARTMENT_ALL_HREF = "/listings?propertyType=apartment";

function complexHref(complexId: string): string {
  return `/listings?propertyType=apartment&complexId=${encodeURIComponent(complexId)}`;
}

/** PC 전용: 클릭 또는 hover로 열리는 단지별 아파트 드롭다운. */
function ApartmentDropdown({
  complexes,
}: {
  complexes: ApartmentComplexOption[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 text-sm font-medium text-navy-800 transition-colors hover:text-gold-600"
        aria-expanded={open}
        aria-haspopup="true"
      >
        아파트
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-3 w-64 overflow-hidden rounded-xl border border-navy-900/10 bg-white py-2 shadow-lg">
          <Link
            href={APARTMENT_ALL_HREF}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:bg-gold-500/10 hover:text-gold-600"
          >
            아파트 전체보기
          </Link>
          {complexes.length > 0 && (
            <>
              <div className="my-1 border-t border-navy-900/10" />
              {complexes.map((complex) => (
                <Link
                  key={complex.complexId}
                  href={complexHref(complex.complexId)}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-navy-800 transition-colors hover:bg-gold-500/10 hover:text-gold-600"
                >
                  <span className="truncate">{complex.complexName}</span>
                  <span className="shrink-0 text-xs text-navy-800/40">
                    ({complex.count})
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 모바일 전용: 탭하면 펼쳐지는 아코디언. hover는 쓰지 않습니다. */
function ApartmentAccordion({
  complexes,
  onNavigate,
}: {
  complexes: ApartmentComplexOption[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md px-2 py-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
        aria-expanded={open}
      >
        아파트
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="ml-2 flex flex-col gap-0.5 border-l border-navy-900/10 pl-3">
          <Link
            href={APARTMENT_ALL_HREF}
            onClick={onNavigate}
            className="rounded-md px-2 py-3 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
          >
            아파트 전체보기
          </Link>
          {complexes.map((complex) => (
            <Link
              key={complex.complexId}
              href={complexHref(complex.complexId)}
              onClick={onNavigate}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-3 text-sm text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
            >
              <span className="truncate">{complex.complexName}</span>
              <span className="shrink-0 text-xs text-navy-800/40">
                ({complex.count})
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({
  apartmentComplexes,
}: {
  apartmentComplexes: ApartmentComplexOption[];
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/#home"
          className="text-lg font-bold tracking-tight text-navy-900 sm:text-xl"
        >
          호수공인중개사사무소
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-navy-800 transition-colors hover:text-gold-600"
          >
            홈
          </Link>
          <ApartmentDropdown complexes={apartmentComplexes} />
          {SIMPLE_NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-navy-800 transition-colors hover:text-gold-600"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={PHONE_HREF}
            className="hidden items-center gap-2 rounded-full border border-gold-500/40 px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:bg-gold-500/10 sm:flex"
          >
            <PhoneIcon className="h-4 w-4 text-gold-600" />
            {PHONE_NUMBER}
          </a>
          <a
            href={PHONE_HREF}
            aria-label={`전화 문의 ${PHONE_NUMBER}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/40 text-gold-600 sm:hidden"
          >
            <PhoneIcon className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-navy-900 md:hidden"
            aria-label="메뉴 열기"
            aria-expanded={isMenuOpen}
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 bg-current transition-transform ${
                  isMenuOpen ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-current transition-opacity ${
                  isMenuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 bg-current transition-transform ${
                  isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-navy-900/10 bg-white px-6 py-4 md:hidden">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="rounded-md px-2 py-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
          >
            홈
          </Link>
          <ApartmentAccordion
            complexes={apartmentComplexes}
            onNavigate={() => setIsMenuOpen(false)}
          />
          {SIMPLE_NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-md px-2 py-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
            >
              {item.label}
            </a>
          ))}
          <a
            href={PHONE_HREF}
            className="mt-2 flex items-center gap-2 rounded-md border border-gold-500/40 px-2 py-2 text-sm font-bold text-navy-900"
          >
            <PhoneIcon className="h-4 w-4 text-gold-600" />
            전화 상담 {PHONE_NUMBER}
          </a>
        </nav>
      )}
    </header>
  );
}
