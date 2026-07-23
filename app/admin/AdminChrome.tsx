"use client";

import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "./AdminLogoutButton";

/** 로그인 화면에서는 로그아웃 버튼을 보여줄 필요가 없어 경로로 구분합니다. */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex justify-end px-6 pt-4">
        <AdminLogoutButton />
      </div>
      {children}
    </>
  );
}
