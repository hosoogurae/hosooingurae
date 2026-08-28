import type { Metadata } from "next";
import { AdminChrome } from "./AdminChrome";

/**
 * manifest.ts 특수 파일 컨벤션은 app 루트에서만 인식됩니다(Next.js
 * 소스의 is-metadata-route.js에서 manifest/robots 정규식만 `^`로
 * 루트 고정 — icon/sitemap/opengraph-image와 달리 세그먼트 하위에 두면
 * 아예 라우트가 생성되지 않는 것을 빌드로 직접 확인했습니다). 그래서
 * public/admin.webmanifest 정적 파일을 만들고, 여기 metadata.manifest
 * 필드로 연결합니다 — 이 필드는 세그먼트 단위로 정상적으로 적용되어
 * (바로 아래 robots 필드와 동일한 방식), /admin 이하 페이지에만
 * <link rel="manifest">가 들어갑니다.
 */
export const metadata: Metadata = {
  title: "관리자 · 매물 등록 관리 | 호수공인중개사사무소",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminChrome>{children}</AdminChrome>;
}
