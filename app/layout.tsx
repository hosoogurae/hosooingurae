import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import {
  ADDRESS_LINES,
  BUSINESS_REG_NUMBER,
  CEO_NAME,
  COMPANY_NAME,
  PHONE_NUMBER,
} from "./data/contact";
import Header from "./components/Header";
import Footer from "./components/Footer";
import FloatingCallButton from "./components/FloatingCallButton";
import CompareBar from "./components/CompareBar";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "호수공인중개사사무소 | 김포 구래동 부동산",
  description: "김포 구래동 아파트·오피스텔·상가 전문. 호수공인중개사사무소.",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: COMPANY_NAME,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingCallButton />
        <CompareBar />
      </body>
    </html>
  );
}
