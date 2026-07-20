export type ComplexTransactionType = "매매";

export interface ComplexTransaction {
  id: string;
  complexId: string;
  contractDate: string;
  /** 만원 단위 거래가격 */
  price: number;
  priceLabel: string;
  floor: number;
  exclusiveArea: number;
  transactionType: ComplexTransactionType;
}

/**
 * 국토교통부 실거래가 공개시스템(molit.go.kr) 기준으로 표시합니다.
 * 현재 데이터는 외부 API 연동 전, 화면 확인을 통해 직접 입력한 초기 데이터입니다.
 * 추후 공공데이터포털 실거래가 API 연동 시 이 파일 대신 API 응답으로 대체될 수 있습니다.
 */
export const complexTransactions: ComplexTransaction[] = [
  {
    id: "hosumaeul-2-txn-20251115",
    complexId: "hosumaeul-epyeonhansesang-2",
    contractDate: "2025-11-15",
    price: 40800,
    priceLabel: "4억 800만원",
    floor: 15,
    exclusiveArea: 84.87,
    transactionType: "매매",
  },
  {
    id: "hosumaeul-2-txn-20260312",
    complexId: "hosumaeul-epyeonhansesang-2",
    contractDate: "2026-03-12",
    price: 40500,
    priceLabel: "4억 500만원",
    floor: 12,
    exclusiveArea: 84.87,
    transactionType: "매매",
  },
  {
    id: "hosumaeul-2-txn-20260318",
    complexId: "hosumaeul-epyeonhansesang-2",
    contractDate: "2026-03-18",
    price: 36000,
    priceLabel: "3억 6,000만원",
    floor: 4,
    exclusiveArea: 84.87,
    transactionType: "매매",
  },
];
