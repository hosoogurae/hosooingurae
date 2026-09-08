import Link from "next/link";
import type {
  DuplicateSuspectGroup,
  DuplicateSuspectListing,
  DuplicateSuspectSeverity,
} from "../../lib/duplicateSuspectedMatch";

const SEVERITY_META: Record<
  DuplicateSuspectSeverity,
  { label: string; badgeClass: string; cardClass: string; note: string }
> = {
  strong: {
    label: "강함",
    badgeClass: "bg-red-600 text-white",
    cardClass: "border-red-300 bg-red-50/40",
    note: "단지·동·층·거래유형·공급면적·전용면적이 전부 같습니다.",
  },
  weak: {
    label: "약함",
    badgeClass: "bg-amber-500 text-white",
    cardClass: "border-amber-300 bg-amber-50/40",
    note: "단지·동·층·거래유형은 같지만 면적이 다릅니다. 같은 층 다른 호수일 수 있습니다.",
  },
  "floor-unknown": {
    label: "층 확인 필요",
    badgeClass: "bg-navy-800 text-white",
    cardClass: "border-navy-900/20 bg-navy-900/[0.02]",
    note: "단지·동·거래유형·면적은 같지만, 한쪽(또는 둘 다) 층 정보가 없어 같은 집인지 층으로 확인하지 못했습니다.",
  },
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "확인 기록 없음";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "확인 기록 없음";
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function formatArea(listing: DuplicateSuspectListing): string {
  return `공급 ${listing.supplyArea}㎡ / 전용 ${listing.exclusiveArea}㎡`;
}

function formatFloor(listing: DuplicateSuspectListing): string {
  if (listing.floor <= 0) return "층 정보 없음";
  return listing.totalFloors > 0
    ? `${listing.floor}/${listing.totalFloors}층`
    : `${listing.floor}층`;
}

interface CompareRowDef {
  label: string;
  render: (listing: DuplicateSuspectListing) => string;
}

const COMPARE_ROWS: CompareRowDef[] = [
  { label: "가격", render: (l) => l.priceLabel },
  { label: "면적", render: formatArea },
  { label: "층", render: formatFloor },
  { label: "방향", render: (l) => l.direction || "-" },
  { label: "등록일", render: (l) => formatDate(l.registeredAt) },
  { label: "마지막 확인일", render: (l) => formatDate(l.lastVerifiedAt) },
];

function DuplicateSuspectGroupCard({ group }: { group: DuplicateSuspectGroup }) {
  const meta = SEVERITY_META[group.severity];

  return (
    <div className={`rounded-xl border p-4 ${meta.cardClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-navy-950">
            {group.complexName} {group.building}
            {group.floor !== undefined ? ` · ${group.floor}층` : ""} ·{" "}
            {group.transactionType}
          </h3>
          <p className="mt-1 text-xs text-navy-800/60">{meta.note}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      </div>

      <p className="mt-3 text-xs font-semibold text-amber-700">
        의심일 뿐 확정이 아닙니다 — 같은 층에도 여러 호수가 있을 수 있습니다. 자동으로
        합치거나 지우지 않습니다. 아래 내용을 직접 비교해 판단해주세요.
      </p>

      <div className="mt-3 overflow-x-auto rounded-md border border-navy-900/10 bg-white">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead>
            <tr className="border-b border-navy-900/10 bg-navy-900/[0.03] text-navy-800/60">
              <th className="px-3 py-2 font-semibold">항목</th>
              {group.listings.map((listing, index) => (
                <th key={listing.id} className="px-3 py-2 font-semibold">
                  매물 {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-navy-900/5 last:border-0">
                <td className="px-3 py-1.5 text-navy-800/50">{row.label}</td>
                {group.listings.map((listing) => (
                  <td key={listing.id} className="px-3 py-1.5">
                    {row.render(listing)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 특징 문구는 판단의 핵심 근거라 표 칸에 넣지 않고(길면 잘림) 아래에
          매물별로 전체를 그대로 보여줍니다. */}
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-navy-800/50">매물 특징·설명 전체</p>
        {group.listings.map((listing, index) => (
          <div
            key={listing.id}
            className="rounded-md border border-navy-900/10 bg-white p-3 text-xs leading-relaxed text-navy-900"
          >
            <p className="font-bold text-navy-950">매물 {index + 1}</p>
            <p className="mt-1">
              {listing.features.length > 0 ? listing.features.join(" · ") : "(특징 없음)"}
            </p>
            {listing.shortDescription && (
              <p className="mt-1 text-navy-800/70">{listing.shortDescription}</p>
            )}
            <Link
              href={listing.editUrl}
              target="_blank"
              className="mt-2 inline-block font-semibold text-gold-600 underline-offset-4 hover:underline"
            >
              이 매물 관리 화면 열기 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DuplicateSuspectPanel({
  groups,
  excludedMissingBuildingCount,
}: {
  groups: DuplicateSuspectGroup[];
  excludedMissingBuildingCount: number;
}) {
  return (
    <div className="mt-6">
      <div className="rounded-md border border-navy-900/10 bg-navy-900/[0.02] px-4 py-3 text-sm text-navy-800/80">
        같은 매물이 실수로 두 번 등록된 것 같은 경우를 사람이 확인하도록 모아
        보여줍니다. <strong>자동으로 합치거나 삭제하지 않습니다.</strong>{" "}
        아래 매물이 정말 같은 집인지는 특징 문구 등을 직접 읽고 판단해주세요.
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 rounded-md border border-navy-900/10 px-4 py-6 text-center text-sm text-navy-800/50">
          지금은 중복 의심 매물이 없습니다.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {groups.map((group) => (
            <DuplicateSuspectGroupCard key={group.key} group={group} />
          ))}
        </div>
      )}

      {excludedMissingBuildingCount > 0 && (
        <p className="mt-4 text-xs text-navy-800/50">
          단지·동 정보가 없는 매물 {excludedMissingBuildingCount}건은 이
          검사에서 제외됩니다(비교할 기준이 없어서입니다).
        </p>
      )}
    </div>
  );
}
