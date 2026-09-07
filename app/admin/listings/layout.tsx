"use client";

import { useEffect, useState } from "react";
import { AdminTabs } from "../AdminTabs";

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  // "매물 점검" 탭의 거래 의심 배지. AdminNav의 상위 "매물" 메뉴 배지와
  // 같은 API를 각자 독립적으로 불러옵니다(AdminNav와 같은 관례).
  const [suspectedCount, setSuspectedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/listings/suspected-matches")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!cancelled) setSuspectedCount(data.matches?.length ?? 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = [
    { label: "접수", href: "/admin/listings/submissions" },
    { label: "등록", href: "/admin/listings/new" },
    { label: "관리", href: "/admin/listings/manage" },
    { label: "점검", href: "/admin/listings/inspection", badge: suspectedCount },
  ];

  return (
    <div>
      <AdminTabs tabs={tabs} />
      {children}
    </div>
  );
}
