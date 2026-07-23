import Link from "next/link";

export default function ValuationCta() {
  return (
    <section className="bg-gold-500/10 px-6 py-20 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-black text-navy-950 sm:text-3xl">
          우리 집, 지금 얼마일까요?
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-navy-800/70 sm:text-base">
          국토교통부 실거래가 데이터를 기준으로 우리 단지·평형의 최근 실제
          거래가격을 바로 확인해보세요.
        </p>
        <div className="mt-8">
          <Link
            href="/valuation"
            className="inline-block rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-8 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01]"
          >
            우리 집 시세 확인하기
          </Link>
        </div>
      </div>
    </section>
  );
}
