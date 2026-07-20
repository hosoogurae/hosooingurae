import type { Metadata } from "next";
import { getAllListings } from "../lib/listings";
import ListingCard from "../components/ListingCard";

export const metadata: Metadata = {
  title: "전체 매물 | 호수공인중개사사무소",
  description: "호수공인중개사사무소가 확인한 김포 구래동 실제 매물을 모두 확인하세요.",
};

export default function ListingsPage() {
  const listings = getAllListings();

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          LISTINGS
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          전체 매물
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          호수공인중개사사무소가 현장에서 직접 확인한 구래동 매물을
          안내합니다.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {listings.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-navy-800/60">
            현재 등록된 매물이 없습니다. 곧 새로운 매물로 찾아뵙겠습니다.
          </p>
        )}
      </section>
    </>
  );
}
