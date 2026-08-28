const STATS = [
  {
    value: "15년+",
    label: "부동산 중개 경력",
    caption: "2014년 구래동 개업",
  },
  { value: "1,200건+", label: "누적 거래 성사" },
  { value: "구래동 거주 10년", label: "동네 주민이 직접 운영합니다" },
];

/**
 * Hero 하단에 표시되는 신뢰 지표. 다크(네이비) 배경 기준 스타일이라
 * 다른 섹션에 넣을 때는 배경색에 맞춰 text-white/* 톤을 조정해야 합니다.
 *
 * "1,200건+"에는 근거 캡션을 일부러 안 붙였습니다 — 실제 집계가 있는
 * 숫자이지만 정확히 언제부터의 누적인지 특정할 수 없어서, 틀릴 수 있는
 * 기준일을 붙이느니 숫자만 두는 쪽이 더 정확합니다("15년+"의 2014년
 * 개업 시점과는 별개로, 경력 자체는 그보다 더 오래됐습니다).
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
          {stat.caption && (
            <p className="mt-0.5 text-center text-[10px] text-white/40">
              {stat.caption}
            </p>
          )}
        </div>
      ))}
    </dl>
  );
}
