"use client";

import { useState } from "react";
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

/**
 * PC 전용: "아파트" 텍스트 클릭 = 전체 목록으로 이동, hover = 단지 드롭다운 표시.
 *
 * 트리거와 패널 사이에 시각적 여백(패널 안쪽 pt-3)은 두되, 그 여백을
 * "relative" 컨테이너의 자식(margin이 아니라 padding)으로 만들어서 hover
 * 판정에 끊기는 지점(dead zone)이 생기지 않게 합니다. margin으로 간격을
 * 두면 그 여백 구간은 컨테이너의 렌더링 박스 밖이라 마우스가 지나가는 순간
 * mouseleave가 먼저 발생해 버립니다 — 그래서 여백을 패널 wrapper의
 * padding-top으로 옮기고 top-full(간격 0)로 붙여, 커서가 트리거→여백→패널로
 * 이동하는 내내 항상 이 컨테이너의 자손 위에 있도록 만든 것이 핵심입니다.
 */
function ApartmentDropdown({
  complexes,
}: {
  complexes: ApartmentComplexOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={APARTMENT_ALL_HREF}
        className="flex items-center gap-1 text-sm font-medium text-navy-800 transition-colors hover:text-gold-600"
        aria-expanded={open}
        aria-haspopup="true"
      >
        아파트
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Link>

      {open && (
        <div className="absolute left-0 top-full z-20 pt-3">
          <div className="w-64 overflow-hidden rounded-xl border border-navy-900/10 bg-white py-2 shadow-lg">
            <Link
              href={APARTMENT_ALL_HREF}
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
        </div>
      )}
    </div>
  );
}

/**
 * 모바일 전용: hover 없이, "아파트" 텍스트는 전체 목록으로 바로 이동하고
 * 옆의 화살표 버튼을 눌러야 단지 목록이 펼쳐지는 아코디언입니다(PC의
 * "텍스트=이동, hover=펼침" 구조를 터치 환경에 맞게 "텍스트=이동,
 * 버튼=펼침"으로 옮긴 것).
 */
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
      <div className="flex items-center gap-1">
        <Link
          href={APARTMENT_ALL_HREF}
          onClick={onNavigate}
          className="flex-1 rounded-md px-2 py-3 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
        >
          아파트
        </Link>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="아파트 단지 목록 펼치기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
        >
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

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
