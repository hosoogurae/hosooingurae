import sharp from "sharp";

/** 카드/썸네일 표시용 미리보기의 긴 변 기준 최대 픽셀. 원본이 이보다 작으면 확대하지 않습니다. */
const MAX_DIMENSION = 1600;

/**
 * 평면도 미리보기 생성: 잘라내지 않고 비율을 유지한 채 축소만 합니다
 * (resizeListingPhoto와 동일한 방식 — fit: "inside" + withoutEnlargement).
 * 평면도는 어느 부분이든 잘리면 방 이름·구조선 같은 정보가 사라지므로,
 * 상단에 면적배지 등 배너가 딸려 있어도 그대로 둡니다 — 잘려서 정보를
 * 잃는 것보다 배너가 보이는 편이 낫습니다. 이 리사이즈는 카드/썸네일
 * 용량을 줄이기 위한 것일 뿐이고, 확대 보기는 이 함수를 거치지 않은
 * 원본을 그대로 보여줍니다.
 */
export async function resizeFloorPlanPreview(
  input: Buffer | Uint8Array,
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const resized = await sharp(buffer)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  // sharp/libvips가 드물게 손상된 결과를 조용히 반환하는 경우가 있어(예외 없이
  // 헤더만 깨진 파일), 업로드하기 전에 실제로 다시 디코딩되는지 확인합니다.
  // 확인에 실패하면 깨진 이미지를 저장/노출하지 않도록 에러를 던집니다.
  try {
    const verifyMetadata = await sharp(resized).metadata();
    if (!verifyMetadata.width || !verifyMetadata.height) {
      throw new Error("검증 결과 크기 정보가 없습니다.");
    }
  } catch (verifyError) {
    throw new Error(
      `리사이즈된 이미지가 손상되어 검증에 실패했습니다: ${
        verifyError instanceof Error ? verifyError.message : String(verifyError)
      }`,
    );
  }

  return resized;
}
