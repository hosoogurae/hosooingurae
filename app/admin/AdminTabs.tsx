"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminTab {
  label: string;
  href: string;
  /** 0이거나 없으면 표시 안 함. */
  badge?: number | null;
}

/** 매물/문자/도구처럼 하위 화면 여러 개를 묶은 곳에서 쓰는 공용 탭 바. */
export function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-navy-900/10 bg-white">
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-bold transition-colors ${
                isActive
                  ? "border-gold-500 text-navy-950"
                  : "border-transparent text-navy-800/60 hover:text-navy-900"
              }`}
            >
              {tab.label}
              {!!tab.badge && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
