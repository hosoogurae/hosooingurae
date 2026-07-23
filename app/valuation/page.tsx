"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ComplexOption } from "../lib/naverImport";
import type { ComplexTransaction } from "../data/complexTransactions";
import type { FloorPlanImage } from "../data/floorPlans";
import {
  type ExclusiveAreaGroup,
  formatContractDate,
  formatPriceFull,
  getTransactionSummary,
  groupTransactionsByExclusiveArea,
} from "../lib/transactions";
import TransactionPriceChart from "../components/TransactionPriceChart";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";

type Step = "complex" | "area" | "result";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "complex", label: "1. 단지 선택" },
  { key: "area", label: "2. 평형 선택" },
  { key: "result", label: "3. 결과" },
];

/** MOLIT 실거래 매칭에 쓰는 오차와 동일하게 맞춰, 타입 간 면적 겹침 여부를 판단합니다. */
const AREA_MATCH_TOLERANCE = 1;

interface UnitTypeOption {
  unitType: string;
  supplyArea?: number;
  exclusiveArea: number;
  thumbnailUrl?: string;
}

interface SelectedArea {
  /** 결과 화면 제목과 "우리 집 내놓기" 메모에 쓰는 표시용 라벨(타입명 또는 "전용 n㎡"). */
  label: string;
  exclusiveArea: number;
  supplyArea?: number;
  /** 같은 면적대에 다른 타입도 있어, MOLIT 결과가 이 타입만의 거래라고 단정할 수 없는 경우. */
  showTypeAmbiguityNotice: boolean;
}

/**
 * floor_plan_images를 평면 타입 카드용으로 정리합니다. 같은 타입에 이미지가
 * 여러 장이면 첫 장(sort_order 기준)만 대표로 씁니다. exclusiveArea가 없는
 * 타입은 국토부 실거래가와 매칭할 기준이 없어 후보에서 제외합니다(값을
 * 추측하지 않음).
 */
function buildUnitTypeOptions(images: FloorPlanImage[]): UnitTypeOption[] {
  const byType = new Map<string, FloorPlanImage>();
  for (const image of images) {
    if (image.exclusiveArea === undefined) continue;
    const existing = byType.get(image.unitType);
    if (!existing || image.sortOrder < existing.sortOrder) {
      byType.set(image.unitType, image);
    }
  }

  return Array.from(byType.values())
    .map((image) => ({
      unitType: image.unitType,
      supplyArea: image.supplyArea,
      exclusiveArea: image.exclusiveArea as number,
      thumbnailUrl: image.previewUrl ?? image.url,
    }))
    .sort((a, b) => a.exclusiveArea - b.exclusiveArea);
}

function buildSellHref(complexName: string, area: SelectedArea | null): string {
  const params = new URLSearchParams({ complexName });
  if (area) {
    params.set("notes", `${area.label} 시세 확인 후 접수합니다.`);
  }
  return `/sell?${params.toString()}`;
}

export default function ValuationPage() {
  const [step, setStep] = useState<Step>("complex");

  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [complexFilter, setComplexFilter] = useState("");
  const [complexLoadError, setComplexLoadError] = useState<string | null>(
    null,
  );

  const [selectedComplex, setSelectedComplex] = useState<ComplexOption | null>(
    null,
  );

  // 2단계: 평면 타입(우선) 또는 실거래 전용면적 그룹(평면도가 없을 때 대체).
  const [loadingAreaOptions, setLoadingAreaOptions] = useState(false);
  const [areaOptionsError, setAreaOptionsError] = useState<string | null>(
    null,
  );
  const [unitTypeOptions, setUnitTypeOptions] = useState<
    UnitTypeOption[] | null
  >(null);
  const [fallbackAreaGroups, setFallbackAreaGroups] = useState<
    ExclusiveAreaGroup[] | null
  >(null);
  const [fallbackSource, setFallbackSource] = useState<
    "molit" | "mock" | null
  >(null);

  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);

  // 3단계: 선택한 평형(전용면적) 기준으로 새로 조회한 실거래가.
  const [loadingResult, setLoadingResult] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultTransactions, setResultTransactions] = useState<
    ComplexTransaction[] | null
  >(null);
  const [resultSource, setResultSource] = useState<"molit" | "mock" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadComplexes() {
      try {
        const response = await fetch("/api/complexes");
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setComplexLoadError("단지 목록을 불러오지 못했습니다.");
          }
          return;
        }
        if (!cancelled) {
          setComplexOptions(data.complexOptions as ComplexOption[]);
        }
      } catch {
        if (!cancelled) {
          setComplexLoadError("네트워크 오류로 단지 목록을 불러오지 못했습니다.");
        }
      }
    }

    loadComplexes();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredComplexOptions = useMemo(() => {
    const target = complexFilter.trim().toLowerCase();
    if (!target) return complexOptions;
    return complexOptions.filter((option) =>
      option.name.toLowerCase().includes(target),
    );
  }, [complexOptions, complexFilter]);

  const usingFloorPlanTypes = (unitTypeOptions?.length ?? 0) > 0;
  const hasAnyAreaOptions =
    usingFloorPlanTypes ||
    (fallbackSource === "molit" && (fallbackAreaGroups?.length ?? 0) > 0);

  async function handleSelectComplex(option: ComplexOption) {
    setSelectedComplex(option);
    setStep("area");
    setSelectedArea(null);
    setUnitTypeOptions(null);
    setFallbackAreaGroups(null);
    setFallbackSource(null);
    setAreaOptionsError(null);
    setLoadingAreaOptions(true);

    try {
      const floorPlanResponse = await fetch(
        `/api/floor-plans?complexId=${encodeURIComponent(option.id)}`,
      );
      const floorPlanData = await floorPlanResponse.json();
      if (!floorPlanResponse.ok) {
        setAreaOptionsError("평면도 정보를 불러오지 못했습니다.");
        return;
      }

      const options = buildUnitTypeOptions(
        floorPlanData.images as FloorPlanImage[],
      );

      if (options.length > 0) {
        setUnitTypeOptions(options);
        return;
      }
      setUnitTypeOptions([]);

      // 등록된 평면 타입이 없는 단지는 실거래 전용면적만으로 후보를 만듭니다.
      const txResponse = await fetch(
        `/api/transactions?complexId=${encodeURIComponent(option.id)}`,
      );
      const txData = await txResponse.json();
      if (!txResponse.ok) {
        setAreaOptionsError("실거래가 정보를 불러오지 못했습니다.");
        return;
      }

      const txSource = (txData.source as "molit" | "mock" | undefined) ?? null;
      setFallbackSource(txSource);
      setFallbackAreaGroups(
        txSource === "molit"
          ? groupTransactionsByExclusiveArea(
              txData.transactions as ComplexTransaction[],
            )
          : [],
      );
    } catch {
      setAreaOptionsError("네트워크 오류로 정보를 불러오지 못했습니다.");
    } finally {
      setLoadingAreaOptions(false);
    }
  }

  function handleSelectUnitType(option: UnitTypeOption) {
    const overlapCount = (unitTypeOptions ?? []).filter(
      (candidate) =>
        Math.abs(candidate.exclusiveArea - option.exclusiveArea) <=
        AREA_MATCH_TOLERANCE,
    ).length;

    setSelectedArea({
      label: option.unitType,
      exclusiveArea: option.exclusiveArea,
      supplyArea: option.supplyArea,
      showTypeAmbiguityNotice: overlapCount > 1,
    });
    setStep("result");
  }

  function handleSelectFallbackGroup(group: ExclusiveAreaGroup) {
    setSelectedArea({
      label: `전용 ${group.representativeArea}㎡`,
      exclusiveArea: group.representativeArea,
      showTypeAmbiguityNotice: false,
    });
    setStep("result");
  }

  function handleBackToComplex() {
    setStep("complex");
    setSelectedComplex(null);
    setSelectedArea(null);
    setUnitTypeOptions(null);
    setFallbackAreaGroups(null);
    setFallbackSource(null);
  }

  function handleBackToArea() {
    setStep("area");
    setSelectedArea(null);
    setResultTransactions(null);
    setResultSource(null);
    setResultError(null);
  }

  useEffect(() => {
    if (step !== "result" || !selectedComplex || !selectedArea) return;

    let cancelled = false;

    async function loadResultTransactions() {
      setLoadingResult(true);
      setResultError(null);
      try {
        const params = new URLSearchParams({
          complexId: selectedComplex!.id,
          exclusiveArea: String(selectedArea!.exclusiveArea),
        });
        const response = await fetch(`/api/transactions?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) {
            setResultError("실거래가 정보를 불러오지 못했습니다.");
          }
          return;
        }
        if (!cancelled) {
          setResultTransactions(data.transactions as ComplexTransaction[]);
          setResultSource((data.source as "molit" | "mock" | undefined) ?? null);
        }
      } catch {
        if (!cancelled) {
          setResultError("네트워크 오류로 실거래가 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoadingResult(false);
      }
    }

    loadResultTransactions();
    return () => {
      cancelled = true;
    };
  }, [step, selectedComplex, selectedArea]);

  const hasResultData =
    resultSource === "molit" && (resultTransactions?.length ?? 0) > 0;
  const resultTransactionList = resultTransactions ?? [];
  const summary = getTransactionSummary(resultTransactionList, 6);
  const recentFive = [...resultTransactionList]
    .sort((a, b) => b.contractDate.localeCompare(a.contractDate))
    .slice(0, 5);

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          VALUATION
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          우리 집 시세 확인
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          국토교통부 실거래가 공개시스템 데이터를 기준으로, 우리 단지·평형의
          최근 실제 거래가격을 바로 확인할 수 있어요.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-navy-800/50 sm:text-sm">
          {STEP_LABELS.map((item, index) => (
            <span key={item.key} className="flex items-center gap-2">
              <span
                className={
                  item.key === step
                    ? "rounded-full bg-navy-950 px-3 py-1 text-white"
                    : "px-3 py-1"
                }
              >
                {item.label}
              </span>
              {index < STEP_LABELS.length - 1 && (
                <span className="text-navy-800/20">→</span>
              )}
            </span>
          ))}
        </div>

        {step === "complex" && (
          <div>
            <h2 className="text-lg font-bold text-navy-950">
              어느 단지에 살고 계신가요?
            </h2>
            <input
              value={complexFilter}
              onChange={(event) => setComplexFilter(event.target.value)}
              placeholder="단지명 검색"
              className="mt-4 w-full rounded-md border border-navy-900/15 bg-white px-4 py-3 text-base text-navy-900 outline-none focus:border-gold-500"
            />

            {complexLoadError && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {complexLoadError}
              </p>
            )}

            <ul className="mt-6 flex flex-col gap-2">
              {filteredComplexOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectComplex(option)}
                    className="w-full rounded-lg border border-navy-900/15 px-5 py-4 text-left transition-colors hover:border-gold-500 hover:bg-gold-500/5"
                  >
                    <p className="text-base font-bold text-navy-950">
                      {option.name}
                    </p>
                    {option.address && (
                      <p className="mt-1 text-sm text-navy-800/60">
                        {option.address}
                      </p>
                    )}
                  </button>
                </li>
              ))}
              {complexOptions.length > 0 && filteredComplexOptions.length === 0 && (
                <p className="rounded-xl border border-navy-900/10 px-6 py-12 text-center text-sm text-navy-800/50">
                  검색 결과가 없습니다.
                </p>
              )}
            </ul>
          </div>
        )}

        {step === "area" && selectedComplex && (
          <div>
            <button
              type="button"
              onClick={handleBackToComplex}
              className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
            >
              ← 단지 다시 선택
            </button>

            <h2 className="mt-3 text-lg font-bold text-navy-950">
              {selectedComplex.name}
            </h2>
            <p className="mt-1 text-sm text-navy-800/60">
              평형(전용면적)을 선택해주세요.
            </p>

            {loadingAreaOptions && (
              <p className="mt-8 text-sm text-navy-800/50">불러오는 중...</p>
            )}

            {!loadingAreaOptions && areaOptionsError && (
              <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {areaOptionsError}
              </p>
            )}

            {!loadingAreaOptions && !areaOptionsError && !hasAnyAreaOptions && (
              <div className="mt-8 rounded-xl border border-navy-900/10 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-navy-950">
                  현재 확인 가능한 실거래 데이터가 없습니다.
                </p>
                <p className="mt-2 text-sm text-navy-800/60">
                  대신 담당자가 직접 확인해드릴 수 있어요.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href={buildSellHref(selectedComplex.name, null)}
                    className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
                  >
                    우리 집 내놓기
                  </Link>
                  <a
                    href={PHONE_HREF}
                    className="rounded-md border border-navy-900/15 px-6 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                  >
                    전화 문의 {PHONE_NUMBER}
                  </a>
                </div>
              </div>
            )}

            {!loadingAreaOptions && !areaOptionsError && usingFloorPlanTypes && (
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(unitTypeOptions ?? []).map((option) => (
                  <li key={option.unitType}>
                    <button
                      type="button"
                      onClick={() => handleSelectUnitType(option)}
                      className="flex w-full items-center gap-3 rounded-lg border border-navy-900/15 p-3 text-left transition-colors hover:border-gold-500 hover:bg-gold-500/5"
                    >
                      {option.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={option.thumbnailUrl}
                          alt={`${option.unitType} 평면도`}
                          className="h-16 w-16 shrink-0 rounded-md border border-navy-900/10 object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded-md border border-navy-900/10 bg-navy-900/[0.03]" />
                      )}
                      <div className="min-w-0">
                        <p className="text-base font-bold text-navy-950">
                          {option.unitType}
                        </p>
                        <p className="mt-1 text-xs text-navy-800/60">
                          {option.supplyArea !== undefined
                            ? `공급 ${option.supplyArea}㎡`
                            : "공급면적 미등록"}
                        </p>
                        <p className="text-xs text-navy-800/60">
                          전용 {option.exclusiveArea}㎡
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!loadingAreaOptions &&
              !areaOptionsError &&
              !usingFloorPlanTypes &&
              fallbackSource === "molit" &&
              (fallbackAreaGroups?.length ?? 0) > 0 && (
                <ul className="mt-6 flex flex-col gap-2">
                  {(fallbackAreaGroups ?? []).map((group) => (
                    <li key={group.representativeArea}>
                      <button
                        type="button"
                        onClick={() => handleSelectFallbackGroup(group)}
                        className="w-full rounded-lg border border-navy-900/15 px-5 py-4 text-left transition-colors hover:border-gold-500 hover:bg-gold-500/5"
                      >
                        <p className="text-base font-bold text-navy-950">
                          전용 {group.representativeArea}㎡
                        </p>
                        <p className="mt-1 text-sm text-navy-800/60">
                          최근 거래 {group.transactions.length}건
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {step === "result" && selectedComplex && selectedArea && (
          <div>
            <button
              type="button"
              onClick={handleBackToArea}
              className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
            >
              ← 평형 다시 선택
            </button>

            <h2 className="mt-3 text-lg font-bold text-navy-950">
              {selectedComplex.name} · {selectedArea.label}
            </h2>
            <p className="mt-1 text-sm text-navy-800/60">
              {selectedArea.supplyArea !== undefined
                ? `공급 ${selectedArea.supplyArea}㎡ / `
                : ""}
              전용 {selectedArea.exclusiveArea}㎡ 기준 실거래가
            </p>

            {loadingResult && (
              <p className="mt-8 text-sm text-navy-800/50">
                실거래가 정보를 불러오는 중...
              </p>
            )}

            {!loadingResult && resultError && (
              <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {resultError}
              </p>
            )}

            {!loadingResult && !resultError && !hasResultData && (
              <div className="mt-8 rounded-xl border border-navy-900/10 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-navy-950">
                  현재 확인 가능한 실거래 데이터가 없습니다.
                </p>
                <p className="mt-2 text-sm text-navy-800/60">
                  대신 담당자가 직접 확인해드릴 수 있어요.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href={buildSellHref(selectedComplex.name, selectedArea)}
                    className="rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
                  >
                    우리 집 내놓기
                  </Link>
                  <a
                    href={PHONE_HREF}
                    className="rounded-md border border-navy-900/15 px-6 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                  >
                    전화 문의 {PHONE_NUMBER}
                  </a>
                </div>
              </div>
            )}

            {!loadingResult && !resultError && hasResultData && (
              <>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-navy-900/10 p-4">
                    <p className="text-sm font-semibold text-navy-800/50">
                      최근 거래가
                    </p>
                    <p className="mt-2 text-lg font-black text-navy-950">
                      {summary.latest
                        ? formatPriceFull(summary.latest.price)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-navy-900/10 p-4">
                    <p className="text-sm font-semibold text-navy-800/50">
                      최근 6개월 최고가
                    </p>
                    <p className="mt-2 text-lg font-black text-navy-950">
                      {summary.highestRecent
                        ? formatPriceFull(summary.highestRecent.price)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-navy-900/10 p-4">
                    <p className="text-sm font-semibold text-navy-800/50">
                      최근 6개월 최저가
                    </p>
                    <p className="mt-2 text-lg font-black text-navy-950">
                      {summary.lowestRecent
                        ? formatPriceFull(summary.lowestRecent.price)
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <TransactionPriceChart
                    transactions={resultTransactionList}
                    complexId={selectedComplex.id}
                    exclusiveArea={selectedArea.exclusiveArea}
                  />
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold text-navy-950">
                    최근 거래 내역 {Math.min(5, recentFive.length)}건
                  </h3>
                  <ul className="mt-3 flex flex-col divide-y divide-navy-900/10 rounded-xl border border-navy-900/10">
                    {recentFive.map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="text-sm text-navy-800/60">
                          {formatContractDate(transaction.contractDate)}
                        </span>
                        <span className="text-sm font-bold text-navy-950">
                          {formatPriceFull(transaction.price)}
                        </span>
                        <span className="text-sm text-navy-800/60">
                          {transaction.floor}층
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedArea.showTypeAmbiguityNotice && (
                  <p className="mt-6 rounded-md border border-navy-900/10 bg-navy-900/[0.03] px-3 py-2 text-xs leading-relaxed text-navy-800/60">
                    국토부 실거래가는 전용면적 기준으로 제공되며, 동일 면적의
                    여러 타입 거래가 함께 포함될 수 있습니다.
                  </p>
                )}

                <p className="mt-6 text-xs leading-relaxed text-navy-800/50">
                  실제 매도 가능 가격은 동·층·향·내부상태 등에 따라 달라질 수
                  있습니다.
                </p>

                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href={buildSellHref(selectedComplex.name, selectedArea)}
                    className="w-full rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3 text-center text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 sm:w-auto"
                  >
                    우리 집 내놓기
                  </Link>
                  <a
                    href={PHONE_HREF}
                    className="w-full rounded-md border border-navy-900/15 px-6 py-3 text-center text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600 sm:w-auto"
                  >
                    문의하기
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}
