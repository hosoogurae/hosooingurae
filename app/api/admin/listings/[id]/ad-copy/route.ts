import { NextRequest, NextResponse } from "next/server";
import { buildAllAdCopyFormats, type AdCopyListingInput } from "../../../../../lib/adCopy";
import { getListingById } from "../../../../../lib/listings";
import { buildAbsoluteUrl } from "../../../../../lib/requestUrl";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 확인된 매물 필드만으로 광고문구 4종(문자/블로그/SNS/일반)을 한 번에
 * 계산해 돌려줍니다. DB에 저장하지 않고 매 요청마다 새로 생성합니다.
 * 서버 API로 둔 이유: 나중에 모바일 관리자 앱도 이 엔드포인트를 그대로
 * 호출해 같은 기능을 재사용할 수 있게 하기 위함(app/api/admin/sms-templates
 * 와 같은 패턴).
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const listing = await getListingById(id, { includeDrafts: true });

  if (!listing) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
  }

  const pageUrl = await buildAbsoluteUrl(`/listings/${listing.id}`);

  const input: AdCopyListingInput = {
    id: listing.id,
    complexName: listing.complex.name,
    complexAddress: listing.complex.address,
    transactionType: listing.transactionType,
    priceLabel: listing.priceLabel,
    building: listing.building,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    supplyArea: listing.supplyArea,
    exclusiveArea: listing.exclusiveArea,
    unitType: listing.unitType,
    direction: listing.direction,
    roomCount: listing.roomCount,
    bathroomCount: listing.bathroomCount,
    moveInDate: listing.moveInDate,
    maintenanceFee: listing.maintenanceFee,
    shortDescription: listing.shortDescription,
    features: listing.features,
    hasPhoto: Boolean(listing.image),
    pageUrl,
  };

  return NextResponse.json({ formats: buildAllAdCopyFormats(input) });
}
