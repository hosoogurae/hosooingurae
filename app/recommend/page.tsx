import type { Metadata } from "next";
import Link from "next/link";
import type { FloorPlanImage } from "../data/floorPlans";
import RecommendSearchBox from "../components/RecommendSearchBox";
import ListingCard from "../components/ListingCard";
import CompareToggle from "../components/CompareToggle";
import { getComplexRepresentativeImages } from "../lib/complexImages";
import { getFloorPlanImagesByComplex } from "../lib/floorPlans";
import { getAllListings } from "../lib/listings";
import { ruleBasedQueryParser } from "../lib/recommend/queryParser";
import { NEAR_MISS_HIDE_THRESHOLD, rankListings } from "../lib/recommend/scoring";

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

/**
 * "5개 조건 중 4개 충족 · 1개 확인 불가"처럼 문장으로 보여줍니다. 주 고객층이
 * 30~50대라 "4/5" 같은 기호보다 문장이 더 읽기 쉽습니다. 소프트 조건이
 * 하나도 없으면(totalCount 0) 아예 표시하지 않습니다.
 */
function formatMatchSummary(satisfiedCount: number, totalCount: number, unknownCount: number) {
  if (totalCount === 0) return undefined;
  const base = `${totalCount}개 조건 중 ${satisfiedCount}개 충족`;
  return unknownCount > 0 ? `${base} · ${unknownCount}개 확인 불가` : base;
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

  // 매물마다 평면도를 따로 조회하면 카드 개수만큼 쿼리가 나가므로(N+1),
  // 결과+근접초과 목록에 나온 단지 id별로 한 번씩만 조회합니다.
  const distinctComplexIds = [
    ...new Set(
      [...(recommendation?.results ?? []), ...(recommendation?.nearMisses ?? [])].map(
        (r) => r.listing.complexId,
      ),
    ),
  ];
  const [floorPlansByComplex, complexImagesByComplex] = await Promise.all([
    Promise.all(
      distinctComplexIds.map(
        async (complexId) =>
          [complexId, await getFloorPlanImagesByComplex(complexId)] as const,
      ),
    ).then((entries) => new Map<string, FloorPlanImage[]>(entries)),
    getComplexRepresentativeImages(distinctComplexIds),
  ]);

  function getFloorPlanForListing(
    complexId: string,
    unitType: string | undefined,
  ): FloorPlanImage | undefined {
    if (!unitType) return undefined;
    return floorPlansByComplex
      .get(complexId)
      ?.find((image) => image.unitType === unitType);
  }

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
  if (parsedQuery?.stationName) {
    interpretedLines.push(
      `교통: "${parsedQuery.stationName}" 도보 10분 이내(11~15분은 부분 반영)로 검색했습니다.`,
    );
  } else if (parsedQuery?.wantsStationProximity) {
    interpretedLines.push(
      "교통: 지하철역 도보 10분 이내(11~15분은 부분 반영)를 역세권 기준으로 검색했습니다.",
    );
  }
  if (parsedQuery?.schoolLevel) {
    interpretedLines.push(
      parsedQuery.schoolLevel === "학교"
        ? "학교: 인근 학교로 등록된 단지인지 확인했습니다."
        : `학교: "${parsedQuery.schoolLevel}"가 인근 학교로 등록된 단지인지 확인했습니다.`,
    );
  }
  if (parsedQuery?.wantsAmpleParking) {
    interpretedLines.push("주차: 세대당 1.3대 이상(1.1~1.3대는 부분 반영)을 넉넉함 기준으로 검색했습니다.");
  }
  if (parsedQuery?.wantsLargeComplex) {
    interpretedLines.push("단지 규모: 1,000세대 이상(700~999세대는 부분 반영)을 대단지 기준으로 검색했습니다.");
  }
  if (parsedQuery?.wantsLowerPrice) {
    interpretedLines.push(
      "가격: 구체적인 금액이 없어 임의로 정하지 않고, 검색된 매물들 중 상대적으로 저렴한 쪽을 우대했습니다.",
    );
  }
  // 어떤 표현을 어떤 조건으로 이해했는지(동의어 정규화 근거)를 그대로 보여줍니다.
  for (const intent of parsedQuery?.normalizedIntents ?? []) {
    interpretedLines.push(`동의어 인식: "${intent.trigger}" → ${intent.label}(으)로 이해했습니다.`);
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
              단지명, 방 개수, 고층/저층, 즉시입주, 역세권(또는 &quot;OO역&quot;),
              학교, 주차, 대단지 같은 표현으로 다시 적어주세요.
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
                {recommendation.results.map((ranked, index) => {
                  const summary = formatMatchSummary(
                    ranked.satisfiedCount,
                    ranked.totalCount,
                    ranked.unknownCount,
                  );
                  // 미충족 항목은 눈에 띄지 않게 작고 중립적인 톤으로만 보여줍니다
                  // — 카드 자체가 부정적으로 보이면 안 됩니다.
                  const unmetDetails = ranked.criteria
                    .filter((c) => !c.satisfied && !c.unknown && c.unmetDetail)
                    .map((c) => c.unmetDetail as string);

                  return (
                    <li key={ranked.listing.id} className="relative flex flex-col">
                      <span className="absolute right-3 top-3 z-10 rounded-full bg-navy-950/90 px-3 py-1 text-xs font-bold text-gold-400">
                        {index + 1}위{summary && ` · ${summary}`}
                      </span>
                      <ListingCard
                        listing={ranked.listing}
                        floorPlanImage={getFloorPlanForListing(
                          ranked.listing.complexId,
                          ranked.listing.unitType,
                        )}
                        complexImageUrl={complexImagesByComplex.get(
                          ranked.listing.complexId,
                        )}
                      />
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
                      {ranked.notes.length > 0 && (
                        <p className="mt-2 text-xs text-navy-800/40">
                          {ranked.notes.join(" · ")}
                        </p>
                      )}
                      {unmetDetails.length > 0 && (
                        <p className="mt-1 text-xs text-navy-800/30">
                          {unmetDetails.join(" · ")}
                        </p>
                      )}
                      <CompareToggle listingId={ranked.listing.id} />
                    </li>
                  );
                })}
              </ul>
            )}

            {recommendation.nearMisses.length > 0 &&
              recommendation.results.length < NEAR_MISS_HIDE_THRESHOLD && (
                <div className="mt-12">
                  <p className="text-sm font-semibold text-navy-950">
                    예산이 조금 넘지만 참고할 만한 매물
                  </p>
                  <p className="mt-1 text-xs text-navy-800/50">
                    아래 매물은 요청하신 예산 범위를 벗어나 위 추천 결과에는
                    포함하지 않았습니다.
                  </p>
                  <ul className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {recommendation.nearMisses.map((nearMiss) => (
                      <li key={nearMiss.listing.id} className="relative flex flex-col">
                        <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white">
                          {nearMiss.violation.detail}
                        </span>
                        <ListingCard
                          listing={nearMiss.listing}
                          floorPlanImage={getFloorPlanForListing(
                            nearMiss.listing.complexId,
                            nearMiss.listing.unitType,
                          )}
                          complexImageUrl={complexImagesByComplex.get(
                            nearMiss.listing.complexId,
                          )}
                        />
                        <CompareToggle listingId={nearMiss.listing.id} />
                      </li>
                    ))}
                  </ul>
                </div>
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
