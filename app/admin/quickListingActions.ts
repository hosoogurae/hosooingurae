import type { Listing } from "../data/listings";
import type { ListingWithComplex } from "../lib/listings";

/**
 * 매물 목록/점검 화면에서 필드 하나만 바꿔 전체 객체를 그대로
 * PATCH /api/listings/[id]에 재전송하는 공용 헬퍼입니다(수정 화면과 동일한
 * 전체 재저장 패턴 — 새 API 없이 "오늘 확인"/빠른 상태변경 둘 다 이 함수로
 * 처리합니다).
 */
export async function patchListingFields(
  listing: ListingWithComplex,
  patch: Partial<
    Pick<Listing, "dealStatus" | "lastVerifiedAt" | "suspectedMatchAcknowledgedAt">
  >,
): Promise<{ listing?: Listing; errors?: string[] }> {
  try {
    const response = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...listing, ...patch }),
    });
    const data = await response.json();

    if (!response.ok) {
      return { errors: data.errors ?? ["처리에 실패했습니다."] };
    }
    return { listing: data.listing as Listing };
  } catch {
    return { errors: ["네트워크 오류가 발생했습니다."] };
  }
}
