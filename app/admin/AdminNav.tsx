"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ContactRequest } from "../data/contactRequests";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AdminInstallPwaButton } from "./AdminInstallPwaButton";
import { AdminPushToggleButton } from "./AdminPushToggleButton";

/** 폰에서 가장 자주 쓰는 상담 도우미·문의함을 앞에 둬서 스크롤 없이 바로 보이게 합니다. */
const NAV_ITEMS = [
  { label: "상담 도우미", href: "/admin/consult-helper" },
  { label: "문의함", href: "/admin/contacts" },
  { label: "대시보드", href: "/admin" },
  { label: "문자양식", href: "/admin/sms-templates" },
  { label: "매물 접수", href: "/admin/listing-submissions" },
  { label: "매물 등록", href: "/admin/listings/new" },
  { label: "매물 관리", href: "/admin/listings" },
  { label: "매물 점검", href: "/admin/listing-inspection" },
  { label: "광고용 도구", href: "/admin/ad-copy" },
  { label: "단지 관리", href: "/admin/complexes" },
  { label: "평면도 관리", href: "/admin/floor-plans" },
];

const TOUCH_TARGET = "flex min-h-[44px] items-center";

/** 부모님이 쓰실 화면이라 아이콘/축약 없이 텍스트를 그대로, 크게 보여줍니다. */
export function AdminNav() {
  const pathname = usePathname();
  // AdminNav는 admin/layout.tsx에 한 번만 마운트되고 페이지 이동에도 유지되므로
  // (AdminChrome이 pathname만 다시 읽음), 이 fetch는 admin 화면에 들어올 때 한
  // 번만 실행됩니다.
  const [newContactCount, setNewContactCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/contact-requests")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (cancelled) return;
        const contactRequests = data.contactRequests as ContactRequest[];
        setNewContactCount(
          contactRequests.filter((c) => c.status === "new").length,
        );
      })
      .catch(() => {
        // 배지는 부가 정보라 실패해도 조용히 무시합니다(문의함 화면에서 다시 시도됨).
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollRef = useRef<HTMLElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateFades() {
      if (!el) return;
      setShowLeftFade(el.scrollLeft > 4);
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    window.addEventListener("resize", updateFades);
    return () => {
      el.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, []);

  return (
    <div className="sticky top-0 z-40 border-b border-navy-900/10 bg-white">
      {/* 상단 바: 사무소명 + 알림/설치/로그아웃 */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <span className="truncate text-sm font-black text-navy-950 sm:text-base">
          호수공인중개사사무소 관리자
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <AdminPushToggleButton />
          <AdminInstallPwaButton />
          <AdminLogoutButton />
        </div>
      </div>

      {/* 하단 바: 메뉴 — 폰에서 가로 스크롤, 뒤에 더 있으면 가장자리에 그라데이션 힌트 */}
      <div className="relative border-t border-navy-900/10">
        <nav
          ref={scrollRef}
          className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const showContactBadge =
              item.href === "/admin/contacts" && (newContactCount ?? 0) > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${TOUCH_TARGET} shrink-0 gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-navy-950 text-white"
                    : "text-navy-800 hover:bg-navy-900/5"
                }`}
              >
                {item.label}
                {showContactBadge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive
                        ? "bg-gold-400 text-navy-950"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {newContactCount}
                  </span>
                )}
              </Link>
            );
          })}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${TOUCH_TARGET} shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-900/5`}
          >
            홈페이지 보기
          </a>
        </nav>

        {showLeftFade && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent"
          />
        )}
        {showRightFade && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent"
          />
        )}
      </div>
    </div>
  );
}
