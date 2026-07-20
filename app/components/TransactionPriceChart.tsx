"use client";

import { useEffect, useState } from "react";
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

function SummaryCard({
  label,
  transaction,
}: {
  label: string;
  transaction: ComplexTransaction | null;
}) {
  return (
    <div className="rounded-xl border border-navy-900/10 p-4 sm:p-5">
      <p className="text-xs font-semibold text-navy-800/50">{label}</p>
      <p className="mt-2 text-lg font-black text-navy-950 sm:text-xl">
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
          transactions?: ComplexTransaction[];
        };

        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
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

  const { latest, highestRecent, lowestRecent } =
    getTransactionSummary(transactions);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="최근 거래가" transaction={latest} />
        <SummaryCard label="최근 3년 최고가" transaction={highestRecent} />
        <SummaryCard label="최근 3년 최저가" transaction={lowestRecent} />
      </div>

      <figure className="mt-6">
        <figcaption className="sr-only">
          계약일별 매매 실거래가 추이를 보여주는 선 차트입니다. 총{" "}
          {transactions.length}건의 거래가 등록되어 있습니다.
        </figcaption>
        <div className="h-72 w-full rounded-xl border border-navy-900/10 p-4 sm:p-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transactions}
              margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
            >
              <CartesianGrid stroke={NAVY_900} strokeOpacity={0.08} />
              <XAxis
                dataKey="contractDate"
                tickFormatter={formatContractDate}
                tick={{ fill: NAVY_900, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: NAVY_900, strokeOpacity: 0.15 }}
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
                dot={{ r: 5, fill: GOLD, stroke: "#ffffff", strokeWidth: 2 }}
                activeDot={{ r: 7 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
