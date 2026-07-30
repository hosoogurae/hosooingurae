import type { MetadataRoute } from "next";

/**
 * Next.js 내장 manifest 파일 컨벤션(app/manifest.ts)을 사용합니다.
 * 별도 PWA 패키지 없이 Next.js가 자동으로 /manifest.webmanifest로 제공하고
 * 루트 레이아웃 <head>에 링크도 자동으로 넣어줍니다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "호수공인중개사사무소 관리자",
    short_name: "호수 관리자",
    description: "호수공인중개사사무소 관리자용 상담 도우미 등 관리 도구",
    start_url: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#060e1f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
