/**
 * 매물 사진도, 평면도도, 단지 공통 사진도 없을 때 마지막으로 쓰는
 * 대체 이미지입니다. 단지명/매물종류·거래유형은 카드 하단에 이미
 * 나와 있어 여기서 중복 표시하지 않고, 옅은 배경 위에 매물종류를
 * 나타내는 라인아트 아이콘만 은은하게 둡니다 — 목록에 실사진·평면도
 * 카드와 나란히 있어도 톤이 튀지 않도록, 단지별 색상 변화도 주지
 * 않고 항상 같은 옅은 배경을 씁니다.
 */
/** 아파트는 동 하나가 아니라 단지처럼 높이가 다른 동 여러 개가 나란히 있어야 알아보기 쉽습니다. */
function ApartmentIcon({ className }: { className?: string }) {
  const towers = [
    { x: 4, y: 28, w: 14, h: 48, cols: [7, 13], rows: [34, 42, 50, 58, 66] },
    { x: 23, y: 6, w: 16, h: 70, cols: [27, 34], rows: [12, 21, 30, 39, 48, 57, 66] },
    { x: 45, y: 20, w: 14, h: 56, cols: [48, 54], rows: [26, 34, 42, 50, 58, 66] },
  ];
  return (
    <svg
      viewBox="0 0 64 80"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <line x1="2" y1="76" x2="62" y2="76" />
      {towers.map((tower) => (
        <g key={tower.x}>
          <rect x={tower.x} y={tower.y} width={tower.w} height={tower.h} rx="1" />
          {tower.rows.map((y) =>
            tower.cols.map((x) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="3" height="4" />
            )),
          )}
        </g>
      ))}
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
  propertyType,
  className = "",
}: {
  propertyType: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-[#fafafa] ${className}`}
    >
      <PropertyTypeIcon
        propertyType={propertyType}
        className="h-[45%] w-[45%] text-navy-950/25"
      />
    </div>
  );
}
