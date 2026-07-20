import {
  complexTransactions,
  type ComplexTransaction,
} from "../data/complexTransactions";

const RECENT_YEARS = 3;

export function getTransactionsByComplexId(
  complexId: string,
): ComplexTransaction[] {
  return complexTransactions
    .filter((transaction) => transaction.complexId === complexId)
    .slice()
    .sort((a, b) => a.contractDate.localeCompare(b.contractDate));
}

export interface TransactionSummary {
  latest: ComplexTransaction | null;
  highestRecent: ComplexTransaction | null;
  lowestRecent: ComplexTransaction | null;
}

/** transactions는 이미 계약일 오름차순 정렬되어 있다고 가정합니다. */
export function getTransactionSummary(
  transactions: ComplexTransaction[],
): TransactionSummary {
  if (transactions.length === 0) {
    return { latest: null, highestRecent: null, lowestRecent: null };
  }

  const latest = transactions[transactions.length - 1];

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RECENT_YEARS);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const recentTransactions = transactions.filter(
    (transaction) => transaction.contractDate >= cutoffDate,
  );
  const pool = recentTransactions.length > 0 ? recentTransactions : transactions;

  const highestRecent = pool.reduce((max, transaction) =>
    transaction.price > max.price ? transaction : max,
  );
  const lowestRecent = pool.reduce((min, transaction) =>
    transaction.price < min.price ? transaction : min,
  );

  return { latest, highestRecent, lowestRecent };
}

/** 만원 단위 가격을 "4억 800만원" 형태의 한국식 금액 문자열로 변환합니다. */
export function formatPriceFull(priceInManwon: number): string {
  const eok = Math.floor(priceInManwon / 10000);
  const remainder = priceInManwon % 10000;

  if (eok > 0 && remainder > 0) {
    return `${eok}억 ${remainder.toLocaleString()}만원`;
  }
  if (eok > 0) {
    return `${eok}억원`;
  }
  return `${remainder.toLocaleString()}만원`;
}

/** 차트 축처럼 좁은 공간에 쓰는 축약형(예: "4.08억") */
export function formatPriceShort(priceInManwon: number): string {
  const eok = Math.round((priceInManwon / 10000) * 100) / 100;
  return `${eok}억`;
}

export function formatContractDate(dateStr: string): string {
  return dateStr.replaceAll("-", ".");
}
