"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "./AdminLogoutButton";

const NAV_ITEMS = [
  { label: "대시보드", href: "/admin" },
  { label: "매물 접수", href: "/admin/listing-submissions" },
  { label: "매물 등록", href: "/admin/listings/new" },
  { label: "매물 관리", href: "/admin/listings" },
  { label: "단지 관리", href: "/admin/complexes" },
  { label: "평면도 관리", href: "/admin/floor-plans" },
];

/** 부모님이 쓰실 화면이라 아이콘/축약 없이 텍스트를 그대로, 크게 보여줍니다. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-navy-900/10 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-bold transition-colors sm:text-base ${
                isActive
                  ? "bg-navy-950 text-white"
                  : "text-navy-800 hover:bg-navy-900/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-2 text-sm font-bold text-navy-800 transition-colors hover:bg-navy-900/5 sm:text-base"
        >
          홈페이지 보기
        </a>
        <div className="ml-auto">
          <AdminLogoutButton />
        </div>
      </nav>
    </div>
  );
}
