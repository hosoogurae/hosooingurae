import { featuredProperties } from "../data/properties";
import PropertyCard from "./PropertyCard";

export default function FeaturedProperties() {
  return (
    <section id="properties" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto mb-14 max-w-xl text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-600">
          FEATURED
        </p>
        <h2 className="text-2xl font-black text-navy-950 sm:text-3xl">
          추천매물
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
          호수공인중개사사무소가 엄선한 구래동 아파트·오피스텔·상가 매물을
          만나보세요.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {featuredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
