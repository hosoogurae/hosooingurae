export type ContactRequestStatus = "new" | "contacted" | "closed";

export interface ContactRequest {
  id: string;
  listingId: string;
  name: string;
  phone: string;
  preferredTime?: string;
  status: ContactRequestStatus;
  createdAt: string;
}

/** 매물 상세 "연락받기" 폼이 보내는 생성 입력값. id/status/시각은 서버가 채웁니다. */
export interface ContactRequestInput {
  listingId: string;
  name: string;
  phone: string;
  preferredTime?: string;
}
