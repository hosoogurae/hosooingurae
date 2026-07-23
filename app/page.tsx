import Hero from "./components/Hero";
import FeaturedProperties from "./components/FeaturedProperties";
import ValuationCta from "./components/ValuationCta";
import About from "./components/About";
import ContactCta from "./components/ContactCta";

// 매물 데이터를 Supabase에서 매 요청마다 새로 읽어오므로 정적 캐싱을 끕니다.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProperties />
      <ValuationCta />
      <About />
      <ContactCta />
    </>
  );
}
