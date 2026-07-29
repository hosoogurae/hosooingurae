import Link from "next/link";
import type { Listing } from "../data/listings";
import type { DuplicateListingSummary, DuplicateMatch } from "../lib/naverDuplicate";

interface DiffRow {
  label: string;
  before: string;
  after: string;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "확인 기록 없음";
  const date = new Date(iso);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function buildDiffRows(
  existing: DuplicateListingSummary,
  merged: Listing,
): DiffRow[] {
  const rows: DiffRow[] = [];
  const push = (label: string, before: string, after: string) => {
    if (before !== after) rows.push({ label, before, after });
  };

  push("가격", existing.priceLabel, merged.priceLabel);
  push("마지막 확인일", formatDate(existing.lastVerifiedAt), formatDate(merged.lastVerifiedAt));
  push(
    "면적",
    `공급 ${existing.supplyArea}㎡ / 전용 ${existing.exclusiveArea}㎡`,
    `공급 ${merged.supplyArea}㎡ / 전용 ${merged.exclusiveArea}㎡`,
  );
  push(
    "층",
    `${existing.floor}/${existing.totalFloors}층`,
    `${merged.floor}/${merged.totalFloors}층`,
  );
  push("특징", existing.features.join(", ") || "(없음)", merged.features.join(", ") || "(없음)");
  push(
    "매물설명",
    existing.shortDescription || "(없음)",
    merged.shortDescription || "(없음)",
  );

  return rows;
}

/**
 * 네이버 매물 (재)가져오기 중 이미 등록된 것으로 보이는 매물을 찾았을 때
 * 보여주는 확인 패널. "기존 매물 업데이트" / "새 매물로 등록" / "취소" 중
 * 하나를 관리자가 직접 골라야 하며, 이 컴포넌트는 어떤 선택도 자동으로
 * 확정하지 않습니다(호출하는 쪽에서 버튼 콜백으로 처리).
 */
export default function NaverDuplicatePanel({
  duplicate,
  mergedPreview,
  onUpdateExisting,
  onRegisterNew,
  onCancel,
}: {
  duplicate: DuplicateMatch;
  /** 있으면 업데이트 시 반영될 값과의 차이를 보여줍니다. */
  mergedPreview?: Listing;
  onUpdateExisting: () => void;
  onRegisterNew: () => void;
  onCancel: () => void;
}) {
  const { listing } = duplicate;
  const diffRows = mergedPreview ? buildDiffRows(listing, mergedPreview) : [];

  return (
    <div className="mt-4 rounded-md border border-gold-500/40 bg-gold-500/10 p-4 text-sm text-navy-900">
      <p className="font-bold">이미 등록된 것으로 보이는 매물이 있습니다.</p>
      {duplicate.matchType === "fallback" && (
        <p className="mt-1 text-xs text-navy-800/60">
          매물번호가 아니라 단지·동·거래유형·면적·층 정보로 찾은 후보입니다.
          다른 매물일 수 있으니 꼭 확인 후 선택해주세요.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-navy-800/50">매물명</dt>
        <dd>
          {listing.complexName} {listing.building}
        </dd>
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
        <dt className="text-navy-800/50">공개 여부</dt>
        <dd>{listing.status === "published" ? "공개중" : "임시저장"}</dd>
        <dt className="text-navy-800/50">마지막 확인일</dt>
        <dd>{formatDate(listing.lastVerifiedAt)}</dd>
        <dt className="text-navy-800/50">등록일 / 최근 수정일</dt>
        <dd>
          {formatDate(listing.registeredAt)} / {formatDate(listing.updatedAt)}
        </dd>
      </dl>

      {diffRows.length > 0 ? (
        <div className="mt-3 rounded-md border border-navy-900/10 bg-white p-3">
          <p className="text-xs font-semibold text-navy-800/60">
            업데이트 시 변경될 내용
          </p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {diffRows.map((row) => (
              <li key={row.label}>
                <strong>{row.label}</strong>: {row.before} → {row.after}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        mergedPreview && (
          <p className="mt-3 text-xs text-navy-800/50">
            달라진 항목은 없지만, 업데이트하면 마지막 확인일과 원문은 최신으로
            갱신됩니다.
          </p>
        )
      )}

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
