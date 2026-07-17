import Header from "./components/Header";
import Hero from "./components/Hero";
import FeaturedProperties from "./components/FeaturedProperties";
import About from "./components/About";
import ContactCta from "./components/ContactCta";
import Footer from "./components/Footer";
import FloatingCallButton from "./components/FloatingCallButton";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturedProperties />
        <About />
        <ContactCta />
      </main>
      <Footer />
      <FloatingCallButton />
    </div>
  );
}
