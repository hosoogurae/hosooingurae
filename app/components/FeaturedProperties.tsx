import Link from "next/link";
import { getFeaturedListings } from "../lib/listings";
import ListingCard from "./ListingCard";
import { ArrowIcon } from "./icons";

export default async function FeaturedProperties() {
  const featuredListings = await getFeaturedListings();

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
        {featuredListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/listings"
          className="group inline-flex items-center gap-2 rounded-full border border-navy-900/15 px-6 py-3 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          전체 매물 보기
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
