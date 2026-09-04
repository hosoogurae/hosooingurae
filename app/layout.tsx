import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import {
  ADDRESS_LINES,
  BUSINESS_REG_NUMBER,
  CEO_NAME,
  COMPANY_NAME,
  PHONE_NUMBER,
} from "./data/contact";
import { SiteChrome } from "./components/SiteChrome";
import CompareBar from "./components/CompareBar";
import { getApartmentComplexOptions } from "./lib/listings";
import { getSeoulToday, getUpcomingHolidays } from "./lib/holiday";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: "호수공인중개사사무소 | 김포 구래동 부동산",
  description: "김포 구래동 아파트·오피스텔·상가 전문. 호수공인중개사사무소.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "호수공인중개사사무소",
    title: "호수공인중개사사무소 | 김포 구래동 부동산",
    description: "김포 구래동 아파트·오피스텔·상가 전문. 호수공인중개사사무소.",
    locale: "ko_KR",
    type: "website",
    // 매물별 페이지는 각자 대표사진으로 덮어씁니다. 이건 그 외 모든
    // 페이지(메인·시세·매물목록 등)의 기본값이자, 대표사진이 없는
    // 매물의 폴백 이미지이기도 합니다.
    images: ["/office.jpg"],
  },
  // 검색엔진 소유확인용 공개 태그입니다(비밀값 아님, 환경변수로 뺄 필요
  // 없음). 루트 layout에서 한 번만 설정하면 하위 세그먼트가 자체
  // verification을 쓰지 않는 한 모든 페이지에 그대로 상속됩니다.
  verification: {
    google: "lSoo1KruW8qVXEFObosBXguy3ZSAltft4mqzWVsJSrw",
    other: {
      "naver-site-verification": "e14cebd9d56eb879a47c601c016319914140b637",
    },
  },
};

// Header의 "아파트" 드롭다운이 매 요청마다 현재 공개 매물 건수를 반영해야 하므로
// (다른 매물 관련 페이지들과 동일하게) 정적 캐싱을 끕니다.
export const dynamic = "force-dynamic";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: COMPANY_NAME,
  url: process.env.NEXT_PUBLIC_SITE_URL,
  image: `${process.env.NEXT_PUBLIC_SITE_URL}/office.jpg`,
  founder: {
    "@type": "Person",
    name: CEO_NAME,
  },
  telephone: PHONE_NUMBER,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${ADDRESS_LINES[0]} ${ADDRESS_LINES[1]}`,
    addressLocality: "김포시",
    addressRegion: "경기도",
    addressCountry: "KR",
  },
  taxID: BUSINESS_REG_NUMBER,
  identifier: BUSINESS_REG_NUMBER,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apartmentComplexes = await getApartmentComplexOptions();
  // 휴무일은 매 요청마다 Asia/Seoul 기준 "오늘"로 새로 계산합니다(레이아웃이
  // 이미 force-dynamic이라 매 요청 재렌더링됨). SiteChrome은 클라이언트
  // 컴포넌트라 그 안에서 new Date()를 부르면 서버/클라이언트 계산이 어긋나
  // 하이드레이션 불일치가 날 수 있어, 계산은 여기(서버 컴포넌트)에서 한 번만
  // 하고 결과값만 prop으로 내려줍니다.
  const holidayInfo = getUpcomingHolidays(getSeoulToday());

  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <SiteChrome apartmentComplexes={apartmentComplexes} holidayInfo={holidayInfo}>
          {children}
        </SiteChrome>
        <CompareBar />
        <Script id="pwa-sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              var registerSw = function () {
                navigator.serviceWorker.register('/sw.js', {
                  scope: '/',
                  updateViaCache: 'none',
                });
              };
              // afterInteractive 스크립트는 이미 window의 load 이벤트가 지나간
              // 뒤에 실행되는 경우가 많아서, 'load' 리스너만 걸면 서비스워커가
              // 영영 등록되지 않을 수 있습니다. readyState를 먼저 확인합니다.
              if (document.readyState === 'complete') {
                registerSw();
              } else {
                window.addEventListener('load', registerSw);
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}
