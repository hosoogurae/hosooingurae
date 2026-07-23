"use client";

import { useState } from "react";
import Link from "next/link";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { PhoneIcon } from "./icons";

const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "추천매물", href: "/listings?featured=true" },
  { label: "아파트", href: "/listings?propertyType=apartment" },
  { label: "오피스텔", href: "/listings?propertyType=officetel" },
  { label: "상가", href: "/listings?propertyType=commercial" },
  { label: "우리 집 시세", href: "/valuation" },
  { label: "매물 내놓기", href: "/sell" },
  { label: "문의하기", href: "/#contact" },
];

export default function Header() {
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
          {NAV_ITEMS.map((item) => (
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
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-900/5 hover:text-gold-600"
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
