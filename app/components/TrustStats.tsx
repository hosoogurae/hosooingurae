const STATS = [
  { value: "15년+", label: "부동산 중개 경력" },
  { value: "1,200건+", label: "누적 거래 성사" },
  { value: "4.9 / 5", label: "고객 상담 만족도" },
];

/**
 * Hero 하단에 표시되는 신뢰 지표. 다크(네이비) 배경 기준 스타일이라
 * 다른 섹션에 넣을 때는 배경색에 맞춰 text-white/* 톤을 조정해야 합니다.
 */
export default function TrustStats() {
  return (
    <dl className="grid w-full max-w-2xl grid-cols-3 gap-4 border-y border-white/10 py-6">
      {STATS.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center">
          <dt className="sr-only">{stat.label}</dt>
          <dd className="text-lg font-black text-gold-400 sm:text-xl">
            {stat.value}
          </dd>
          <p className="mt-1 text-center text-xs text-white/60 sm:text-sm">
            {stat.label}
          </p>
        </div>
      ))}
    </dl>
  );
}
