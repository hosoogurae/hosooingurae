import type { Metadata } from "next";
import { AdminChrome } from "./AdminChrome";

export const metadata: Metadata = {
  title: "관리자 · 매물 등록 관리 | 호수공인중개사사무소",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminChrome>{children}</AdminChrome>;
}
