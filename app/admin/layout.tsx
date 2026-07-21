import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 · 매물 등록 관리 | 호수공인중개사사무소",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
