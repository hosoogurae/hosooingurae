import type { Metadata } from "next";

// 매물 접수 건마다 발급되는 비공개 업로드 링크입니다. 상위 app/sell/layout.tsx의
// title/canonical("/sell")을 그대로 물려받으면 안 되므로 여기서 덮어씁니다.
export const metadata: Metadata = {
  title: "사진 업로드 | 호수공인중개사사무소",
  robots: { index: false, follow: false },
};

export default function SellPhotosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
