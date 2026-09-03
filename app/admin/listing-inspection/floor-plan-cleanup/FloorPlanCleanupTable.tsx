"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NO_FLOOR_PLAN_UNIT_TYPE } from "../../../data/listings";
import type {
  FloorPlanCleanupReason,
  FloorPlanCleanupRow,
} from "../../../lib/floorPlanCleanup";
import type { BulkFloorPlanResult } from "../../../api/admin/listings/bulk-floor-plan/route";

const REASON_LABELS: Record<FloorPlanCleanupReason, string> = {
  "no-floor-plans": "이 단지에 등록된 평면도가 없습니다",
  "floor-plans-missing-area": "평면도에 면적 정보가 없어 비교할 수 없습니다",
  "listing-area-unknown": "이 매물의 면적 정보가 없습니다",
  "no-area-match": "일치하는 평면도가 없습니다",
  ambiguous: "확인 필요",
};

interface RowState {
  checked: boolean;
  /** "" = 아직 선택 안 함. NO_FLOOR_PLAN_UNIT_TYPE = 명시적으로 "해당 없음". 그 외는 실제 타입명. */
  selectedUnitType: string;
}

type Phase = "review" | "confirm" | "applying" | "done";

function initialRowState(row: FloorPlanCleanupRow): RowState {
  return {
    checked: row.suggestedUnitType !== null,
    selectedUnitType: row.suggestedUnitType ?? "",
  };
}

export default function FloorPlanCleanupTable({
  rows,
}: {
  rows: FloorPlanCleanupRow[];
}) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(rows.map((row) => [row.listingId, initialRowState(row)])),
  );
  const [phase, setPhase] = useState<Phase>("review");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkFloorPlanResult[]>([]);
  const [reverting, setReverting] = useState(false);
  const [reverted, setReverted] = useState(false);

  const rowByListingId = useMemo(
    () => new Map(rows.map((row) => [row.listingId, row])),
    [rows],
  );

  function updateRow(listingId: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [listingId]: { ...prev[listingId], ...patch } }));
  }

  const includedItems = rows
    .map((row) => ({ row, state: rowStates[row.listingId] }))
    .filter(({ state }) => state.checked && state.selectedUnitType !== "");

  async function submitItems(
    items: { listingId: string; unitType: string }[],
  ): Promise<BulkFloorPlanResult[]> {
    const response = await fetch("/api/admin/listings/bulk-floor-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0] ?? "적용에 실패했습니다.");
    }
    return data.results as BulkFloorPlanResult[];
  }

  async function handleConfirmApply() {
    setApplying(true);
    setApplyError(null);
    try {
      const applied = await submitItems(
        includedItems.map(({ row, state }) => ({
          listingId: row.listingId,
          unitType: state.selectedUnitType,
        })),
      );
      setResults(applied);
      setPhase("done");
    } catch (error) {
      setApplyError(
        error instanceof Error ? error.message : "네트워크 오류가 발생했습니다.",
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    try {
      const succeeded = results.filter((result) => result.success);
      await submitItems(
        succeeded.map((result) => ({
          listingId: result.listingId,
          unitType: result.previousUnitType ?? NO_FLOOR_PLAN_UNIT_TYPE,
        })),
      );
      setReverted(true);
    } catch (error) {
      setApplyError(
        error instanceof Error ? error.message : "되돌리기에 실패했습니다.",
      );
    } finally {
      setReverting(false);
    }
  }

  if (phase === "done") {
    const succeeded = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);

    return (
      <div>
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {succeeded.length}건을 연결했습니다
          {failed.length > 0 && ` (${failed.length}건 실패)`}.
        </p>

        <ul className="mt-4 flex flex-col divide-y divide-navy-900/10 rounded-xl border border-navy-900/10 bg-white">
          {results.map((result) => {
            const row = rowByListingId.get(result.listingId);
            return (
              <li key={result.listingId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-950">
                    {row?.priceLabel ?? result.listingId}
                  </p>
                  <p className="text-xs text-navy-800/50">{row?.complexName}</p>
                </div>
                {result.success ? (
                  <p className="text-navy-800/70">
                    {result.previousUnitType ?? "(없음)"} →{" "}
                    <span className="font-bold text-navy-950">
                      {result.newUnitType ?? "해당 없음"}
                    </span>
                  </p>
                ) : (
                  <p className="text-red-600">{result.error}</p>
                )}
              </li>
            );
          })}
        </ul>

        {applyError && (
          <p className="mt-3 text-sm text-red-600">{applyError}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {succeeded.length > 0 && !reverted && (
            <button
              type="button"
              onClick={handleRevert}
              disabled={reverting}
              className="rounded-md border border-red-300 px-5 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reverting ? "되돌리는 중..." : "방금 적용한 내용 되돌리기"}
            </button>
          )}
          {reverted && (
            <p className="text-sm font-semibold text-navy-800/60">되돌렸습니다.</p>
          )}
          <Link
            href="/admin/listing-inspection"
            className="rounded-md border border-navy-900/15 px-5 py-2 text-sm font-bold text-navy-800"
          >
            점검 센터로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-navy-900/10">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-navy-900/10 bg-navy-900/[0.02] text-left text-xs font-semibold text-navy-800/50">
              <th className="px-3 py-2">연결</th>
              <th className="px-3 py-2">매물</th>
              <th className="px-3 py-2">단지</th>
              <th className="px-3 py-2">전용/공급</th>
              <th className="px-3 py-2">평면도 타입</th>
              <th className="px-3 py-2">근거</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const state = rowStates[row.listingId];
              const hasOptions = row.dropdownOptions.length > 0;

              return (
                <tr key={row.listingId} className="border-b border-navy-900/5 last:border-0">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={state.checked}
                      disabled={!hasOptions}
                      onChange={(event) =>
                        updateRow(row.listingId, { checked: event.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/admin/listings/${row.listingId}/edit`}
                      className="font-semibold text-navy-950 hover:text-gold-600 hover:underline"
                    >
                      {row.priceLabel}
                    </Link>
                    <p className="text-xs text-navy-800/50">
                      {row.building || "동 정보 없음"} · {row.floor || "-"}층
                    </p>
                  </td>
                  <td className="px-3 py-2 align-top text-navy-800/70">{row.complexName}</td>
                  <td className="px-3 py-2 align-top text-navy-800/70">
                    {row.exclusiveArea > 0 ? `전용 ${row.exclusiveArea}` : "전용 확인 필요"}
                    <br />
                    {row.supplyArea > 0 ? `공급 ${row.supplyArea}` : "공급 확인 필요"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {hasOptions ? (
                      <select
                        value={state.selectedUnitType}
                        disabled={!hasOptions}
                        onChange={(event) =>
                          updateRow(row.listingId, {
                            selectedUnitType: event.target.value,
                            checked: event.target.value !== "",
                          })
                        }
                        className="rounded-md border border-navy-900/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-gold-500"
                      >
                        <option value="">선택 안 함</option>
                        <option value={NO_FLOOR_PLAN_UNIT_TYPE}>해당 없음 / 평면도 미등록</option>
                        {row.dropdownOptions.map((option) => (
                          <option key={option.unitType} value={option.unitType}>
                            {option.unitType}
                            {option.exclusiveArea !== undefined
                              ? ` (전용 ${option.exclusiveArea})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-navy-800/40">선택 불가</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    {row.reason === "ambiguous" ? (
                      <span className="font-semibold text-amber-700">
                        확인 필요(후보 {row.ambiguousCandidateCount}개)
                      </span>
                    ) : row.reason ? (
                      <span className="text-navy-800/50">{REASON_LABELS[row.reason]}</span>
                    ) : (
                      <span className="font-semibold text-green-700">
                        {row.suggestionReasonLabel}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setPhase("confirm")}
          disabled={includedItems.length === 0}
          className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          선택한 {includedItems.length}건 연결하기
        </button>
        <p className="text-xs text-navy-800/50">
          체크되고 타입이 선택된 매물만 적용됩니다.
        </p>
      </div>

      {phase === "confirm" && (
        <div className="mt-6 rounded-xl border border-gold-500/40 bg-gold-500/5 p-6">
          <h2 className="text-base font-bold text-navy-950">
            {includedItems.length}건을 연결합니다
          </h2>
          <ul className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-navy-800/70">
            {includedItems.map(({ row, state }) => (
              <li key={row.listingId}>
                {row.priceLabel} ({row.complexName}) →{" "}
                <span className="font-semibold text-navy-950">
                  {state.selectedUnitType === NO_FLOOR_PLAN_UNIT_TYPE
                    ? "해당 없음"
                    : state.selectedUnitType}
                </span>
              </li>
            ))}
          </ul>
          {applyError && <p className="mt-3 text-sm text-red-600">{applyError}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleConfirmApply}
              disabled={applying}
              className="rounded-md bg-navy-950 px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {applying ? "적용 중..." : "확정하고 적용"}
            </button>
            <button
              type="button"
              onClick={() => setPhase("review")}
              disabled={applying}
              className="rounded-md border border-navy-900/15 px-5 py-2 text-sm font-bold text-navy-800"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
