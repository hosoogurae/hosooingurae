import type { Metadata } from "next";
import Link from "next/link";
import RecommendSearchBox from "../components/RecommendSearchBox";
import ListingCard from "../components/ListingCard";
import CompareToggle from "../components/CompareToggle";
import { getAllListings } from "../lib/listings";
import { ruleBasedQueryParser } from "../lib/recommend/queryParser";
import { rankListings } from "../lib/recommend/scoring";

export const metadata: Metadata = {
  title: "AI 매물 추천 | 호수공인중개사사무소",
  robots: { index: false, follow: false },
};

// 매물 데이터를 Supabase에서 매 요청마다 새로 읽어오므로 정적 캐싱을 끕니다.
export const dynamic = "force-dynamic";

interface RecommendPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function RecommendPage({ searchParams }: RecommendPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = firstValue(resolvedSearchParams.q).trim();

  const listings = query ? await getAllListings() : [];
  const knownComplexNames = [...new Set(listings.map((l) => l.complex.name))];
  const parsedQuery = query
    ? ruleBasedQueryParser.parse(query, { knownComplexNames })
    : null;
  const recommendation = parsedQuery ? rankListings(listings, parsedQuery) : null;

  const interpretedLines: string[] = [];
  if (parsedQuery?.transactionType) {
    interpretedLines.push(`거래유형: ${parsedQuery.transactionType}`);
  }
  if (parsedQuery?.propertyType) {
    interpretedLines.push(`매물종류: ${parsedQuery.propertyType}`);
  }
  if (parsedQuery?.price) {
    interpretedLines.push(`가격: ${parsedQuery.price.interpretation}`);
  }
  if (parsedQuery?.complexName) {
    interpretedLines.push(`단지: ${parsedQuery.complexName}`);
  }
  if (parsedQuery?.roomCount !== undefined) {
    interpretedLines.push(`방 개수: ${parsedQuery.roomCount}개`);
  }
  if (parsedQuery?.floorTier) {
    interpretedLines.push(
      `층 선호: "${parsedQuery.floorTier === "high" ? "고층" : "저층"}" 요청으로 이해해, 건물 층수 대비 ${
        parsedQuery.floorTier === "high" ? "높은" : "낮은"
      } 층 매물에 가산점을 주었습니다.`,
    );
  }
  if (parsedQuery?.wantsImmediateMoveIn) {
    interpretedLines.push("입주: 즉시 입주 가능 여부를 반영했습니다.");
  }

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          AI 매물 추천
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          원하는 집을 말해보세요
        </h1>
        <div className="mx-auto mt-6 max-w-xl">
          <RecommendSearchBox initialQuery={query} size="compact" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        {!query && (
          <p className="rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
            위 검색창에 원하시는 조건을 문장으로 적어주세요.
          </p>
        )}

        {query && recommendation?.noCriteriaRecognized && (
          <div className="rounded-xl border border-navy-900/10 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-navy-950">
              조건을 이해하지 못했습니다.
            </p>
            <p className="mt-2 text-sm text-navy-800/60">
              가격, 거래유형(매매/전세/월세), 매물종류(아파트/오피스텔/상가),
              단지명, 방 개수, 고층/저층, 즉시입주 같은 표현으로 다시
              적어주세요.
            </p>
          </div>
        )}

        {query && recommendation && !recommendation.noCriteriaRecognized && (
          <>
            <div className="rounded-xl border border-navy-900/10 bg-navy-900/[0.02] p-5">
              <p className="text-xs font-semibold text-navy-800/50">
                &quot;{query}&quot;를 이렇게 해석했습니다
              </p>
              <ul className="mt-2 space-y-1 text-sm text-navy-800/80">
                {interpretedLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {parsedQuery && parsedQuery.unrecognizedPhrases.length > 0 && (
                <p className="mt-3 text-sm text-navy-800/50">
                  현재 검색에 반영하지 못한 조건:{" "}
                  {parsedQuery.unrecognizedPhrases.join(", ")}
                </p>
              )}
            </div>

            {recommendation.results.length === 0 && (
              <p className="mt-8 rounded-xl border border-navy-900/10 px-6 py-16 text-center text-sm text-navy-800/50">
                현재 등록된 매물이 없습니다.
              </p>
            )}

            {recommendation.results.length > 0 && !recommendation.hasExactMatch && (
              <p className="mt-6 rounded-md border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm font-medium text-navy-900">
                조건과 정확히 일치하는 매물은 없지만 가까운 매물을
                추천합니다.
              </p>
            )}

            {recommendation.results.length > 0 && (
              <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {recommendation.results.map((ranked, index) => (
                  <li key={ranked.listing.id} className="relative flex flex-col">
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-navy-950/90 px-3 py-1 text-xs font-bold text-gold-400">
                      {index + 1}위 · {ranked.score}% 일치
                    </span>
                    <ListingCard listing={ranked.listing} />
                    {ranked.reasons.length > 0 && (
                      <div className="mt-3 rounded-lg bg-navy-900/[0.03] p-3">
                        <p className="text-xs font-semibold text-gold-600">
                          추천 이유
                        </p>
                        <p className="mt-1 text-sm text-navy-800/70">
                          {ranked.reasons.join(" ")}
                        </p>
                      </div>
                    )}
                    <CompareToggle listingId={ranked.listing.id} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-12 text-center text-xs text-navy-800/40">
          <Link href="/listings" className="underline-offset-4 hover:underline">
            전체 매물 직접 둘러보기 →
          </Link>
        </p>
      </section>
    </>
  );
}
