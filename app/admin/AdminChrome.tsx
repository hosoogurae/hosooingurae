"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "./AdminNav";

/** 로그인 화면에서는 공통 네비게이션을 보여줄 필요가 없어 경로로 구분합니다. */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
