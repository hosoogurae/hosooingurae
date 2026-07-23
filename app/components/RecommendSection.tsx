import RecommendSearchBox from "./RecommendSearchBox";

export default function RecommendSection() {
  return (
    <section className="border-b border-navy-900/10 bg-gradient-to-b from-gold-500/10 to-white px-6 py-16 text-center sm:py-20">
      <p className="mb-3 text-sm font-semibold tracking-wide text-gold-600">
        AI 매물 추천
      </p>
      <h2 className="text-2xl font-black text-navy-950 sm:text-3xl">
        원하는 집을 말해보세요
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy-800/70">
        조건을 자연스럽게 문장으로 적으면, 실제 등록된 매물 중에서 가장
        가까운 매물을 순위와 함께 찾아드려요.
      </p>

      <div className="mt-8">
        <RecommendSearchBox />
      </div>
    </section>
  );
}
