/**
 * 매물 사진도, 평면도도, 단지 공통 사진도 없을 때 마지막으로 쓰는
 * 브랜드 카드형 대체 이미지입니다("사진 없음" 회색 박스 대신). 단지명
 * /매물종류·거래유형을 텍스트로 보여줘 목록에서 여러 장이 나란히 있어도
 * 정보값이 있도록 하고, complexId를 해시해 몇 가지 톤 중 하나를 고정
 * 배정해 단조로움을 줄입니다(같은 단지는 항상 같은 톤).
 *
 * muted는 목록 카드(/listings) 전용입니다 — 카드가 여러 장 나란히 있을 때
 * 골드 톤이 강조되면 "사진 없음"이 오히려 부각돼서, 채도를 낮춘 베이지
 * 계열만 쓰고 원형 마크도 더 작게 줄입니다.
 */
const TONE_VARIANTS = [
  "from-beige-100 to-beige-300",
  "from-beige-200 to-gold-400/25",
  "from-gold-400/15 to-beige-100",
  "from-beige-300 to-beige-100",
  "from-beige-100 via-beige-200 to-gold-500/20",
];

const MUTED_TONE_VARIANTS = [
  "from-beige-100 to-beige-200",
  "from-beige-200 to-beige-100",
  "from-beige-100 to-beige-300",
  "from-beige-300 to-beige-100",
  "from-beige-200 to-beige-300",
];

function pickTone(seed: string, muted: boolean): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const variants = muted ? MUTED_TONE_VARIANTS : TONE_VARIANTS;
  return variants[hash % variants.length];
}

/** 실사진이 아님을 명확히 하기 위한 단색 라인아트 — 매물종류별로 실루엣만 다르게. */
function ApartmentIcon({ className }: { className?: string }) {
  const cols = [20, 29, 38];
  const rows = [13, 23, 33, 43, 53, 63];
  return (
    <svg
      viewBox="0 0 64 80"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <rect x="14" y="6" width="36" height="70" rx="1" />
      {rows.map((y) =>
        cols.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="6" />),
      )}
    </svg>
  );
}

function OfficetelIcon({ className }: { className?: string }) {
  const bands = [14, 23, 32, 41, 50, 59, 68];
  return (
    <svg
      viewBox="0 0 64 80"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <rect x="18" y="4" width="28" height="72" rx="1" />
      <line x1="32" y1="4" x2="32" y2="76" />
      {bands.map((y) => (
        <line key={y} x1="18" y1={y} x2="46" y2={y} />
      ))}
    </svg>
  );
}

function CommercialIcon({ className }: { className?: string }) {
  const storefronts = [12, 27, 42];
  const upperWindows = [11, 22, 33, 44];
  return (
    <svg
      viewBox="0 0 64 80"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <rect x="6" y="32" width="52" height="40" rx="1" />
      <line x1="6" y1="46" x2="58" y2="46" />
      {upperWindows.map((x) => (
        <rect key={x} x={x} y="37" width="6" height="6" />
      ))}
      {storefronts.map((x) => (
        <rect key={x} x={x} y="52" width="11" height="16" />
      ))}
    </svg>
  );
}

function PropertyTypeIcon({
  propertyType,
  className,
}: {
  propertyType: string;
  className?: string;
}) {
  if (propertyType === "오피스텔") {
    return <OfficetelIcon className={className} />;
  }
  if (propertyType === "상가") {
    return <CommercialIcon className={className} />;
  }
  return <ApartmentIcon className={className} />;
}

export default function ListingBrandPlaceholder({
  complexId,
  complexName,
  propertyType,
  transactionType,
  className = "",
  compact = false,
  muted = false,
}: {
  complexId: string;
  complexName: string;
  propertyType: string;
  transactionType: string;
  className?: string;
  compact?: boolean;
  muted?: boolean;
}) {
  const tone = pickTone(complexId || complexName, muted);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${tone} ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(11,26,51,0.08)_1px,transparent_1px)] [background-size:14px_14px]"
      />

      <PropertyTypeIcon
        propertyType={propertyType}
        className={`pointer-events-none absolute text-navy-900/[0.14] ${
          compact ? "h-10 w-10" : "h-24 w-24"
        }`}
      />

      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border border-gold-600/30 bg-white/60 font-black tracking-tight text-navy-900 backdrop-blur ${
            muted ? "h-5 w-5 text-[8px]" : "h-9 w-9 text-xs"
          }`}
        >
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
