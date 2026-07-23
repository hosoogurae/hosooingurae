"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ComplexOption } from "../lib/naverImport";
import type { ComplexTransaction } from "../data/complexTransactions";
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

function buildSellHref(
  complexName: string,
  areaGroup: ExclusiveAreaGroup | null,
): string {
  const params = new URLSearchParams({ complexName });
  if (areaGroup) {
    params.set(
      "notes",
      `전용 ${areaGroup.representativeArea}㎡ 시세 확인 후 접수합니다.`,
    );
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

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const [allTransactions, setAllTransactions] = useState<
    ComplexTransaction[] | null
  >(null);
  const [source, setSource] = useState<"molit" | "mock" | null>(null);

  const [selectedAreaGroup, setSelectedAreaGroup] =
    useState<ExclusiveAreaGroup | null>(null);

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

  // 실거래 데이터가 국토부(molit) 기준으로 실제 존재할 때만 정상 결과로 취급합니다.
  // mock(사무실이 직접 입력해둔 임시 데이터)을 실제 시세처럼 보여주지 않기 위함입니다.
  const hasRealData =
    source === "molit" && (allTransactions?.length ?? 0) > 0;

  const areaGroups = useMemo(() => {
    if (!allTransactions || !hasRealData) return [];
    return groupTransactionsByExclusiveArea(allTransactions);
  }, [allTransactions, hasRealData]);

  async function handleSelectComplex(option: ComplexOption) {
    setSelectedComplex(option);
    setSelectedAreaGroup(null);
    setAllTransactions(null);
    setSource(null);
    setTransactionsError(null);
    setStep("area");
    setLoadingTransactions(true);

    try {
      const response = await fetch(
        `/api/transactions?complexId=${encodeURIComponent(option.id)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        setTransactionsError("실거래가 정보를 불러오지 못했습니다.");
        return;
      }
      setAllTransactions(data.transactions as ComplexTransaction[]);
      setSource((data.source as "molit" | "mock" | undefined) ?? null);
    } catch {
      setTransactionsError("네트워크 오류로 실거래가 정보를 불러오지 못했습니다.");
    } finally {
      setLoadingTransactions(false);
    }
  }

  function handleSelectArea(group: ExclusiveAreaGroup) {
    setSelectedAreaGroup(group);
    setStep("result");
  }

  function handleBackToComplex() {
    setStep("complex");
    setSelectedComplex(null);
    setSelectedAreaGroup(null);
    setAllTransactions(null);
    setSource(null);
  }

  function handleBackToArea() {
    setStep("area");
    setSelectedAreaGroup(null);
  }

  const filteredTransactions = selectedAreaGroup?.transactions ?? [];
  const summary = getTransactionSummary(filteredTransactions, 6);
  const recentFive = [...filteredTransactions]
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

            {loadingTransactions && (
              <p className="mt-8 text-sm text-navy-800/50">
                실거래가 정보를 불러오는 중...
              </p>
            )}

            {!loadingTransactions && transactionsError && (
              <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {transactionsError}
              </p>
            )}

            {!loadingTransactions && !transactionsError && !hasRealData && (
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

            {!loadingTransactions && !transactionsError && hasRealData && (
              <ul className="mt-6 flex flex-col gap-2">
                {areaGroups.map((group) => (
                  <li key={group.representativeArea}>
                    <button
                      type="button"
                      onClick={() => handleSelectArea(group)}
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

        {step === "result" && selectedComplex && selectedAreaGroup && (
          <div>
            <button
              type="button"
              onClick={handleBackToArea}
              className="text-sm font-medium text-navy-800/60 underline-offset-4 hover:text-gold-600 hover:underline"
            >
              ← 평형 다시 선택
            </button>

            <h2 className="mt-3 text-lg font-bold text-navy-950">
              {selectedComplex.name}
            </h2>
            <p className="mt-1 text-sm text-navy-800/60">
              전용 {selectedAreaGroup.representativeArea}㎡ 기준 실거래가
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-navy-900/10 p-4">
                <p className="text-sm font-semibold text-navy-800/50">
                  최근 거래가
                </p>
                <p className="mt-2 text-lg font-black text-navy-950">
                  {summary.latest ? formatPriceFull(summary.latest.price) : "-"}
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
                transactions={filteredTransactions}
                complexId={selectedComplex.id}
                exclusiveArea={selectedAreaGroup.representativeArea}
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

            <p className="mt-6 text-xs leading-relaxed text-navy-800/50">
              실제 매도 가능 가격은 동·층·향·내부상태 등에 따라 달라질 수
              있습니다.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={buildSellHref(selectedComplex.name, selectedAreaGroup)}
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
          </div>
        )}
      </section>
    </>
  );
}
