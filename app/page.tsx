import Hero from "./components/Hero";
import FeaturedProperties from "./components/FeaturedProperties";
import About from "./components/About";
import ContactCta from "./components/ContactCta";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProperties />
      <About />
      <ContactCta />
    </>
  );
}
