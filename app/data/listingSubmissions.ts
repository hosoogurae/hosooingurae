export type ListingSubmissionStatus = "new" | "confirmed" | "converted";

export interface ListingSubmission {
  id: string;
  complexName: string;
  building?: string;
  floor?: number;
  transactionType: "매매" | "전세" | "월세";
  desiredPriceLabel: string;
  occupancyStatus?: string;
  interiorCondition?: string;
  moveOutDate?: string;
  viewingAvailability?: string;
  notes?: string;
  contactName: string;
  contactPhone: string;
  status: ListingSubmissionStatus;
  convertedListingId?: string;
  createdAt: string;
}

/** 공개 폼(app/sell)이 보내는 생성 입력값. id/status/시각은 서버가 채웁니다. */
export interface ListingSubmissionInput {
  complexName: string;
  building?: string;
  floor?: number;
  transactionType: "매매" | "전세" | "월세";
  desiredPriceLabel: string;
  occupancyStatus?: string;
  interiorCondition?: string;
  moveOutDate?: string;
  viewingAvailability?: string;
  notes?: string;
  contactName: string;
  contactPhone: string;
}
