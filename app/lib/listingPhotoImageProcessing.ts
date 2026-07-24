import sharp from "sharp";

/** 긴 변 기준 최대 픽셀. 원본이 이보다 작으면 확대하지 않습니다. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;

/**
 * 매물 사진 원본을 그대로 서비스하지 않고, 웹 표시에 적합한 크기로 리사이즈 +
 * JPEG로 재압축합니다. EXIF 방향 정보를 반영해 회전을 바로잡고(rotate()),
 * 긴 변 기준 MAX_DIMENSION을 넘지 않게 축소만 합니다(withoutEnlargement) —
 * 이미 작은 사진을 억지로 키우지 않습니다.
 */
export async function resizeListingPhoto(
  input: Buffer | Uint8Array,
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const resized = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // 평면도 크롭과 동일하게, 저장하기 전에 실제로 다시 디코딩되는지 확인해서
  // 손상된 결과를 조용히 업로드하지 않게 합니다.
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
