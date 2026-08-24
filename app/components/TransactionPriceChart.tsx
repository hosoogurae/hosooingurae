"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { ComplexTransaction } from "../data/complexTransactions";
import type { TransactionsResponse } from "../api/transactions/route";
import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import {
  formatContractDate,
  formatPriceFull,
  formatPriceShort,
  getTransactionSummary,
} from "../lib/transactions";

const GOLD = "#c9a24b";
const NAVY_900 = "#0b1a33";
const MOBILE_QUERY = "(max-width: 639px)";

type ChartStatus = "loading" | "molit" | "mock" | "empty" | "error" | "noExclusiveArea";

function formatContractDateMonth(dateStr: string) {
  return dateStr.slice(0, 7).replaceAll("-", ".");
}

/** "2026-07-20" -> "2026.07" (수동 확인 자료 캡션은 일 단위까지는 노출하지 않습니다). */
function formatVerifiedMonth(dateStr: string) {
  return dateStr.slice(0, 7).replaceAll("-", ".");
}

// 뷰포트가 모바일 폭인지 판별합니다. 서버에서는 알 수 없으니 데스크톱 기준으로
// 먼저 그리고, 마운트된 클라이언트에서 실제 값으로 보정합니다.
function subscribeToMobileBreakpoint(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function getIsMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}
function getIsMobileServerSnapshot() {
  return false;
}

function SummaryCard({
  label,
  transaction,
}: {
  label: string;
  transaction: ComplexTransaction | null;
}) {
  return (
    <div className="rounded-xl border border-navy-900/10 p-4 sm:p-5">
      <p className="text-sm font-semibold text-navy-800/50">{label}</p>
      <p className="mt-2 whitespace-nowrap tracking-tight text-lg font-black text-navy-950 sm:text-xl">
        {transaction ? formatPriceFull(transaction.price) : "-"}
      </p>
      {transaction && (
        <p className="mt-1 text-sm text-navy-800/50">
          {formatContractDate(transaction.contractDate)} · {transaction.floor}층
        </p>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const transaction = payload[0].payload as ComplexTransaction;

  return (
    <div className="rounded-lg border border-navy-900/10 bg-white px-4 py-3 text-xs shadow-lg">
      <p className="font-semibold text-navy-950">
        {formatContractDate(transaction.contractDate)}
      </p>
      <p className="mt-1 font-bold text-gold-600">
        {formatPriceFull(transaction.price)}
      </p>
      <p className="mt-1 text-navy-800/60">
        {transaction.floor}층 · 전용 {transaction.exclusiveArea}㎡
      </p>
    </div>
  );
}

/** 로딩 중에는 "정보 없음"도, 가짜 수치도 보여주지 않습니다 — 모양만 흉내 낸 스켈레톤만 표시합니다. */
function ChartSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="mb-4 text-xs font-medium text-navy-800/40">
        실거래가 정보를 불러오는 중…
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-navy-900/10 p-4 sm:p-5"
          >
            <div className="h-3.5 w-16 rounded bg-navy-900/10" />
            <div className="mt-3 h-5 w-20 rounded bg-navy-900/10" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-[280px] w-full animate-pulse rounded-xl border border-navy-900/10 sm:h-72" />
    </div>
  );
}

function NoticeBox({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-6 py-16 text-center">
      <p className="text-sm font-semibold text-navy-800/70">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-navy-800/50">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function TransactionPriceChart({
  complexId,
  exclusiveArea,
}: {
  complexId: string;
  exclusiveArea?: number;
}) {
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [transactions, setTransactions] = useState<ComplexTransaction[]>([]);
  const [months, setMonths] = useState<number | undefined>(undefined);
  const [retryCount, setRetryCount] = useState(0);
  const isMobile = useSyncExternalStore(
    subscribeToMobileBreakpoint,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ complexId });
        if (exclusiveArea !== undefined) {
          params.set("exclusiveArea", String(exclusiveArea));
        }

        const response = await fetch(`/api/transactions?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setStatus("error");
          return;
        }

        const data = (await response.json()) as TransactionsResponse;
        setTransactions(data.transactions ?? []);
        setMonths(data.months);
        setStatus(data.source);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setStatus("error");
      }
    }

    load();

    return () => controller.abort();
  }, [complexId, exclusiveArea, retryCount]);

  if (status === "loading") {
    return <ChartSkeleton />;
  }

  if (status === "error") {
    return (
      <NoticeBox
        title="실거래 정보를 일시적으로 불러올 수 없습니다"
        action={
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-navy-900/15 px-5 py-2 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            다시 시도
          </button>
        }
      />
    );
  }

  if (status === "noExclusiveArea") {
    // "내역 없음"이 아니라 "무엇과 비교할지 모른다"입니다 — 실거래는
    // 존재할 수 있으니 사실과 다른 안내를 하지 않습니다.
    return (
      <NoticeBox
        title="전용면적 정보가 등록되지 않아 실거래가를 불러올 수 없습니다."
        description="전화로 문의해 주세요."
        action={
          <a
            href={PHONE_HREF}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.03]"
          >
            전화 상담 {PHONE_NUMBER}
          </a>
        }
      />
    );
  }

  if (status === "empty" || transactions.length === 0) {
    return (
      <NoticeBox
        title="최근 실거래 내역 없음"
        description="정확한 시세는 전화로 문의해 주세요."
        action={
          <a
            href={PHONE_HREF}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.03]"
          >
            전화 상담 {PHONE_NUMBER}
          </a>
        }
      />
    );
  }

  const { latest, highestRecent, lowestRecent, averageRecentPrice } =
    getTransactionSummary(transactions);

  // 모바일 X축은 겹치지 않게 처음/중간/마지막, 최대 3개만 표시합니다.
  const mobileTicks =
    transactions.length <= 3
      ? transactions.map((t) => t.contractDate)
      : [
          transactions[0].contractDate,
          transactions[Math.floor((transactions.length - 1) / 2)].contractDate,
          transactions[transactions.length - 1].contractDate,
        ];

  const latestVerifiedAt = transactions
    .map((t) => t.verifiedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div>
      {status === "molit" && (
        <p className="mb-4 text-xs font-medium text-navy-800/50">
          국토교통부 실거래가 공개시스템 · 최근 {months ?? 12}개월 {transactions.length}건
        </p>
      )}
      {status === "mock" && (
        <p className="mb-4 text-xs font-medium text-gold-600">
          수동 확인 자료
          {latestVerifiedAt && ` · 최종 확인 ${formatVerifiedMonth(latestVerifiedAt)}`}
          {" "}· 국토부 최신 자료와 다를 수 있습니다
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="최근 거래가" transaction={latest} />
        <SummaryCard label="최근 12개월 최고가" transaction={highestRecent} />
        <SummaryCard label="최근 12개월 최저가" transaction={lowestRecent} />
        <div className="rounded-xl border border-navy-900/10 p-4 sm:p-5">
          <p className="text-sm font-semibold text-navy-800/50">
            최근 12개월 평균가
          </p>
          <p className="mt-2 whitespace-nowrap tracking-tight text-lg font-black text-navy-950 sm:text-xl">
            {averageRecentPrice !== null
              ? formatPriceFull(averageRecentPrice)
              : "-"}
          </p>
        </div>
      </div>

      <figure className="mt-6">
        <figcaption className="sr-only">
          계약일별 매매 실거래가 추이를 보여주는 선 차트입니다. 총{" "}
          {transactions.length}건의 거래가 등록되어 있습니다.
        </figcaption>
        <div className="h-[280px] w-full rounded-xl border border-navy-900/10 p-4 sm:h-72 sm:p-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transactions}
              margin={{
                top: 8,
                right: isMobile ? 16 : 12,
                left: isMobile ? 8 : 4,
                bottom: 8,
              }}
            >
              <CartesianGrid stroke={NAVY_900} strokeOpacity={0.08} />
              <XAxis
                dataKey="contractDate"
                ticks={isMobile ? mobileTicks : undefined}
                tickFormatter={
                  isMobile ? formatContractDateMonth : formatContractDate
                }
                tick={{ fill: NAVY_900, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: NAVY_900, strokeOpacity: 0.15 }}
                interval={isMobile ? 0 : "preserveStartEnd"}
              />
              <YAxis
                dataKey="price"
                tickFormatter={formatPriceShort}
                tick={{ fill: NAVY_900, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={ChartTooltip} />
              <Line
                type="monotone"
                dataKey="price"
                stroke={GOLD}
                strokeWidth={2.5}
                dot={{
                  r: isMobile ? 3.5 : 5,
                  fill: GOLD,
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                activeDot={{ r: isMobile ? 5 : 7 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
