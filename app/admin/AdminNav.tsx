"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ContactRequest } from "../data/contactRequests";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AdminInstallPwaButton } from "./AdminInstallPwaButton";
import { AdminPushToggleButton } from "./AdminPushToggleButton";

/**
 * href는 눌렀을 때 가는 곳(그룹의 기본 탭), activePrefix는 "지금 이 메뉴
 * 안에 있다"고 판단할 기준입니다 — 예를 들어 "매물"은 접수/등록/관리/점검
 * 탭 중 어디에 있든 activePrefix("/admin/listings")로 활성 표시됩니다.
 */
const NAV_ITEMS = [
  { label: "대시보드", href: "/admin", activePrefix: "/admin" },
  { label: "매물", href: "/admin/listings/manage", activePrefix: "/admin/listings" },
  { label: "단지", href: "/admin/complexes", activePrefix: "/admin/complexes" },
  { label: "문자", href: "/admin/sms/compose", activePrefix: "/admin/sms" },
  { label: "문의함", href: "/admin/contacts", activePrefix: "/admin/contacts" },
  { label: "도구", href: "/admin/tools/consult-helper", activePrefix: "/admin/tools" },
];

const TOUCH_TARGET = "flex min-h-[44px] items-center";

/** 부모님이 쓰실 화면이라 아이콘/축약 없이 텍스트를 그대로, 크게 보여줍니다. */
export function AdminNav() {
  const pathname = usePathname();
  // AdminNav는 admin/layout.tsx에 한 번만 마운트되고 페이지 이동에도 유지되므로
  // (AdminChrome이 pathname만 다시 읽음), 이 fetch는 admin 화면에 들어올 때 한
  // 번만 실행됩니다.
  const [newContactCount, setNewContactCount] = useState<number | null>(null);
  const [suspectedCount, setSuspectedCount] = useState<number | null>(null);

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

    fetch("/api/admin/listings/suspected-matches")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => { if (!cancelled) setSuspectedCount(data.matches?.length ?? 0); })
      .catch(() => undefined);

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
        <span className="min-w-0 truncate text-sm font-black text-navy-950 sm:text-base">
          호수공인중개사사무소 관리자
        </span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-md px-2 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-900/5"
          >
            홈페이지
          </a>
          <AdminPushToggleButton />
          <AdminInstallPwaButton />
          <AdminLogoutButton />
        </div>
      </div>

      {/* 하단 바: 6개 메뉴가 390px 폭에서도 가로 스크롤 없이 한 줄에 들어가도록
          여백을 좁게 잡았습니다(예전 12개 항목일 때 쓰던 스크롤+그라데이션
          힌트 UI는 이제 필요 없지만, 라벨이 길어지는 경우를 대비해 남겨둡니다). */}
      <div className="relative border-t border-navy-900/10">
        <nav
          ref={scrollRef}
          className="mx-auto flex max-w-5xl items-center gap-0.5 overflow-x-auto px-4 py-1.5 sm:px-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.activePrefix === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.activePrefix);
            const showContactBadge =
              item.label === "문의함" && (newContactCount ?? 0) > 0;
            const showSuspectedBadge =
              item.label === "매물" && (suspectedCount ?? 0) > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${TOUCH_TARGET} shrink-0 gap-1 whitespace-nowrap rounded-md px-2 text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-navy-950 text-white"
                    : "text-navy-800 hover:bg-navy-900/5"
                }`}
              >
                {item.label}
                {showContactBadge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      isActive
                        ? "bg-gold-400 text-navy-950"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {newContactCount}
                  </span>
                )}
                {showSuspectedBadge && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? "bg-gold-400 text-navy-950" : "bg-purple-600 text-white"}`}>
                    {suspectedCount}
                  </span>
                )}
              </Link>
            );
          })}
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
