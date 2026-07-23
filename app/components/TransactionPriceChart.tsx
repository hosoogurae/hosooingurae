"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
import {
  formatContractDate,
  formatPriceFull,
  formatPriceShort,
  getTransactionSummary,
} from "../lib/transactions";

const GOLD = "#c9a24b";
const NAVY_900 = "#0b1a33";
const MOBILE_QUERY = "(max-width: 639px)";

function formatContractDateMonth(dateStr: string) {
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
    <div className="rounded-xl border border-navy-900/10 p-3 sm:p-5">
      <p className="text-xs font-semibold text-navy-800/50">{label}</p>
      <p className="mt-1.5 whitespace-nowrap text-2xl font-black text-navy-950 sm:mt-2 sm:text-xl">
        {transaction ? formatPriceFull(transaction.price) : "-"}
      </p>
      {transaction && (
        <p className="mt-1 text-xs text-navy-800/50">
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

export default function TransactionPriceChart({
  transactions: initialTransactions,
  complexId,
  exclusiveArea,
}: {
  transactions: ComplexTransaction[];
  complexId: string;
  exclusiveArea?: number;
}) {
  // 서버에서 내려준 mock 데이터로 먼저 그리고, 국토부 실거래가 API 응답이
  // 도착하면 조용히 교체합니다. 실패 시에는 초기 데이터를 그대로 유지합니다.
  const [transactions, setTransactions] = useState(initialTransactions);
  const [source, setSource] = useState<"molit" | "mock" | null>(null);
  const isMobile = useSyncExternalStore(
    subscribeToMobileBreakpoint,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadLiveTransactions() {
      try {
        const params = new URLSearchParams({ complexId });
        if (exclusiveArea !== undefined) {
          params.set("exclusiveArea", String(exclusiveArea));
        }

        const response = await fetch(`/api/transactions?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          source?: "molit" | "mock";
          transactions?: ComplexTransaction[];
        };

        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
          setSource(data.source ?? null);
        }
      } catch {
        // 네트워크 오류 등은 무시하고 초기 데이터를 그대로 사용합니다.
      }
    }

    loadLiveTransactions();

    return () => controller.abort();
  }, [complexId, exclusiveArea]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-navy-900/10 bg-navy-900/[0.02] px-6 py-16 text-center text-sm text-navy-800/50">
        등록된 실거래가 정보가 없습니다.
      </div>
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

  return (
    <div>
      {source === "molit" && (
        <p className="mb-4 text-xs font-medium text-navy-800/50">
          국토교통부 실거래가 공개시스템 기준 · 최근 12개월 {transactions.length}건
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        <SummaryCard label="최근 거래가" transaction={latest} />
        <SummaryCard label="최근 12개월 최고가" transaction={highestRecent} />
        <SummaryCard label="최근 12개월 최저가" transaction={lowestRecent} />
        <div className="rounded-xl border border-navy-900/10 p-3 sm:p-5">
          <p className="text-xs font-semibold text-navy-800/50">
            최근 12개월 평균가
          </p>
          <p className="mt-1.5 whitespace-nowrap text-2xl font-black text-navy-950 sm:mt-2 sm:text-xl">
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
