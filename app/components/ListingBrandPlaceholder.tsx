/**
 * 매물 사진도, 평면도도, 단지 공통 사진도 없을 때 마지막으로 쓰는
 * 브랜드 카드형 대체 이미지입니다("사진 없음" 회색 박스 대신). 단지명
 * /매물종류·거래유형을 텍스트로 보여줘 목록에서 여러 장이 나란히 있어도
 * 정보값이 있도록 하고, complexId를 해시해 몇 가지 골드/베이지 톤 중
 * 하나를 고정 배정해 단조로움을 줄입니다(같은 단지는 항상 같은 톤).
 */
const TONE_VARIANTS = [
  "from-beige-100 to-beige-300",
  "from-beige-200 to-gold-400/25",
  "from-gold-400/15 to-beige-100",
  "from-beige-300 to-beige-100",
  "from-beige-100 via-beige-200 to-gold-500/20",
];

function pickTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TONE_VARIANTS[hash % TONE_VARIANTS.length];
}

export default function ListingBrandPlaceholder({
  complexId,
  complexName,
  propertyType,
  transactionType,
  className = "",
  compact = false,
}: {
  complexId: string;
  complexName: string;
  propertyType: string;
  transactionType: string;
  className?: string;
  compact?: boolean;
}) {
  const tone = pickTone(complexId || complexName);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${tone} ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(11,26,51,0.08)_1px,transparent_1px)] [background-size:14px_14px]"
      />

      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-600/30 bg-white/60 text-xs font-black tracking-tight text-navy-900 backdrop-blur">
          호수
        </span>
        {!compact && (
          <>
            <p className="line-clamp-2 max-w-[16ch] text-sm font-bold leading-snug text-navy-900">
              {complexName}
            </p>
            <p className="text-xs font-medium text-navy-800/60">
              {propertyType} · {transactionType}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
