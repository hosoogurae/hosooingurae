import Link from "next/link";
import type { Listing } from "../data/listings";
import type { DuplicateListingSummary, DuplicateMatch } from "../lib/naverDuplicate";

interface CompareRow {
  label: string;
  existing: string;
  incoming: string;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "확인 기록 없음";
  const date = new Date(iso);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

/**
 * 기존 매물과 지금 새로 입력(파싱)된 값을 나란히 비교합니다. merge된 값이
 * 아니라 draft(원문 파싱 결과) 그대로를 씁니다 — merge는 파싱 안 된 필드를
 * 기존값으로 채워버려서, "실제로 뭐가 다른지"가 가려질 수 있기 때문입니다.
 */
function buildCompareRows(
  existing: DuplicateListingSummary,
  draft: Listing,
): CompareRow[] {
  return [
    { label: "동", existing: existing.building, incoming: draft.building },
    {
      label: "거래유형",
      existing: existing.transactionType,
      incoming: draft.transactionType,
    },
    { label: "가격", existing: existing.priceLabel, incoming: draft.priceLabel },
    {
      label: "공급면적",
      existing: `${existing.supplyArea}㎡`,
      incoming: `${draft.supplyArea}㎡`,
    },
    {
      label: "전용면적",
      existing: `${existing.exclusiveArea}㎡`,
      incoming: `${draft.exclusiveArea}㎡`,
    },
    {
      label: "층",
      existing: `${existing.floor}/${existing.totalFloors}층`,
      incoming: `${draft.floor}/${draft.totalFloors}층`,
    },
    {
      label: "마지막 확인일",
      existing: formatDate(existing.lastVerifiedAt),
      incoming: formatDate(draft.lastVerifiedAt),
    },
    {
      label: "특징",
      existing: existing.features.join(", ") || "(없음)",
      incoming: draft.features.join(", ") || "(없음)",
    },
    {
      label: "매물설명",
      existing: existing.shortDescription || "(없음)",
      incoming: draft.shortDescription || "(없음)",
    },
  ];
}

/**
 * 네이버 매물 (재)가져오기 중 이미 등록된 것으로 보이는 매물을 찾았을 때
 * 보여주는 확인 패널. "기존 매물 업데이트" / "새 매물로 등록" / "취소" 중
 * 하나를 관리자가 직접 골라야 하며, 이 컴포넌트는 어떤 선택도 자동으로
 * 확정하지 않습니다(호출하는 쪽에서 버튼 콜백으로 처리).
 */
export default function NaverDuplicatePanel({
  duplicate,
  draft,
  onUpdateExisting,
  onRegisterNew,
  onCancel,
}: {
  duplicate: DuplicateMatch;
  /** 지금 새로 파싱된 값(merge 전 원본). 있으면 기존 매물과 나란히 비교해서 보여줍니다. */
  draft?: Listing;
  onUpdateExisting: () => void;
  onRegisterNew: () => void;
  onCancel: () => void;
}) {
  const { listing } = duplicate;
  const compareRows = draft ? buildCompareRows(listing, draft) : [];

  return (
    <div className="mt-4 rounded-md border border-gold-500/40 bg-gold-500/10 p-4 text-sm text-navy-900">
      <p className="font-bold">이미 등록된 것으로 보이는 매물이 있습니다.</p>
      <p className="mt-1 text-xs text-navy-800/60">
        <strong>{duplicate.matchedOn.join("·")}</strong>이 일치해서 후보로
        찾았습니다.
        {duplicate.matchType === "fallback" &&
          " 매물번호가 아니라 이 조건만으로 찾은 후보이니, 다른 매물일 수 있습니다 — 아래 비교를 꼭 확인해주세요."}
      </p>

      <p className="mt-3 text-xs font-semibold text-navy-800/50">
        {listing.complexName} {listing.building} · 기존 매물
      </p>

      {compareRows.length > 0 ? (
        <div className="mt-2 overflow-x-auto rounded-md border border-navy-900/10 bg-white">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="border-b border-navy-900/10 bg-navy-900/[0.03] text-navy-800/60">
                <th className="px-3 py-2 font-semibold">항목</th>
                <th className="px-3 py-2 font-semibold">기존 매물</th>
                <th className="px-3 py-2 font-semibold">새로 입력한 값</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => {
                const isDifferent = row.existing !== row.incoming;
                return (
                  <tr
                    key={row.label}
                    className={`border-b border-navy-900/5 last:border-0 ${
                      isDifferent ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 text-navy-800/50">{row.label}</td>
                    <td className="px-3 py-1.5">{row.existing}</td>
                    <td
                      className={`px-3 py-1.5 ${
                        isDifferent ? "font-semibold text-amber-700" : ""
                      }`}
                    >
                      {row.incoming}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-navy-800/50">거래유형/가격</dt>
          <dd>
            {listing.transactionType} {listing.priceLabel}
          </dd>
          <dt className="text-navy-800/50">면적</dt>
          <dd>
            공급 {listing.supplyArea}㎡ / 전용 {listing.exclusiveArea}㎡
          </dd>
          <dt className="text-navy-800/50">층</dt>
          <dd>
            {listing.floor}/{listing.totalFloors}층
          </dd>
        </dl>
      )}

      <p className="mt-2 text-xs text-navy-800/50">
        공개 여부: {listing.status === "published" ? "공개중" : "임시저장"} ·
        등록일 {formatDate(listing.registeredAt)}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onUpdateExisting}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            duplicate.matchType === "article-id"
              ? "bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 shadow-md shadow-gold-500/30"
              : "border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-600"
          }`}
        >
          기존 매물 업데이트{duplicate.matchType === "article-id" ? " (권장)" : ""}
        </button>
        <button
          type="button"
          onClick={onRegisterNew}
          className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          새 매물로 등록
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800/60 transition-colors hover:border-red-300 hover:text-red-600"
        >
          취소
        </button>
      </div>

      <Link
        href={listing.editUrl}
        target="_blank"
        className="mt-3 inline-block text-xs font-semibold text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
      >
        기존 매물 직접 열어보기 →
      </Link>
    </div>
  );
}
