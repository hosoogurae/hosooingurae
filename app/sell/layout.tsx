import type { Metadata } from "next";

// page.tsx가 "use client"라 metadata를 직접 export할 수 없어서, 이
// layout.tsx(서버 컴포넌트)에서 title/description/canonical을 지정합니다.
export const metadata: Metadata = {
  title: "매물 내놓기 | 호수공인중개사사무소",
  description: "김포 구래동 아파트·오피스텔·상가 매물을 호수공인중개사사무소에 내놓으세요.",
  alternates: { canonical: "/sell" },
};

export default function SellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
