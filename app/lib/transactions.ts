import {
  complexTransactions,
  type ComplexTransaction,
} from "../data/complexTransactions";
import { medianPrice, MIN_SAMPLE_SIZE } from "./sise";

const DEFAULT_RECENT_MONTHS = 12;

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
  /**
   * monthsWindow 기준 중앙값(만원). /sise 페이지와 같은 계산(app/lib/sise.ts의
   * medianPrice)을 재사용합니다 — 같은 단지·평형인데 평균/중앙값이 갈려서
   * 서로 다른 화면이 다른 숫자를 보여주는 걸 막기 위함(CLAUDE.md 1-3).
   * 표본이 MIN_SAMPLE_SIZE 미만이면 null(화면은 "거래가 적어 산출 어려움" 안내).
   */
  medianRecentPrice: number | null;
  /** 위 중앙값 계산에 쓰인 표본 수. 값이 null이어도(표본 부족) 그대로 노출해 안내문에 씁니다. */
  recentSampleSize: number;
}

/**
 * transactions는 이미 계약일 오름차순 정렬되어 있다고 가정합니다.
 * monthsWindow: 최고/최저/평균가를 집계할 최근 개월 수(기본 12개월). 매물
 * 상세 페이지는 기본값을 그대로 쓰고, 시세 확인 페이지는 6개월을 넘깁니다.
 */
export function getTransactionSummary(
  transactions: ComplexTransaction[],
  monthsWindow: number = DEFAULT_RECENT_MONTHS,
): TransactionSummary {
  if (transactions.length === 0) {
    return {
      latest: null,
      highestRecent: null,
      lowestRecent: null,
      medianRecentPrice: null,
      recentSampleSize: 0,
    };
  }

  const latest = transactions[transactions.length - 1];

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsWindow);
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
  const recentSampleSize = pool.length;
  const medianRecentPrice =
    recentSampleSize >= MIN_SAMPLE_SIZE
      ? medianPrice(pool.map((transaction) => transaction.price))
      : null;

  return { latest, highestRecent, lowestRecent, medianRecentPrice, recentSampleSize };
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

export interface ExclusiveAreaGroup {
  /** 그룹 내 전용면적 평균(㎡, 소수 첫째 자리 반올림). 평형 선택 버튼 라벨/차트 조회에 씁니다. */
  representativeArea: number;
  transactions: ComplexTransaction[];
}

/**
 * 실거래 목록을 전용면적 기준으로 묶어 "평형 선택" 후보를 만듭니다. 같은
 * 평형이라도 세대별 등록면적이 미세하게 달라(예: 84.87㎡/84.93㎡) tolerance(㎡)
 * 이내 값은 하나의 그룹으로 취급합니다. 그룹은 면적 오름차순으로 반환합니다.
 */
export function groupTransactionsByExclusiveArea(
  transactions: ComplexTransaction[],
  tolerance = 1,
): ExclusiveAreaGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => a.exclusiveArea - b.exclusiveArea,
  );

  const groups: ExclusiveAreaGroup[] = [];
  for (const transaction of sorted) {
    const currentGroup = groups[groups.length - 1];
    if (
      currentGroup &&
      transaction.exclusiveArea - currentGroup.representativeArea <= tolerance
    ) {
      currentGroup.transactions.push(transaction);
      const sum = currentGroup.transactions.reduce(
        (acc, item) => acc + item.exclusiveArea,
        0,
      );
      currentGroup.representativeArea =
        Math.round((sum / currentGroup.transactions.length) * 10) / 10;
    } else {
      groups.push({
        representativeArea: transaction.exclusiveArea,
        transactions: [transaction],
      });
    }
  }

  return groups;
}
