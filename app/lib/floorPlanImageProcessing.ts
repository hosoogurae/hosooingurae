import sharp from "sharp";

/**
 * 업로드되는 평면도 이미지는 상단 정보 배너(면적배지/key map/면적표)와 탭
 * 메뉴까지 포함한 전체 캡처 템플릿입니다(실측 확인: 여러 장 모두 동일 비율).
 * 그 부분을 제외하면 실제 3D 도면 + 하단 워터마크만 남습니다. 원본 자체를
 * 수정하지 않고, 카드/썸네일 표시에만 쓸 미리보기 이미지를 이 비율로 잘라
 * 만듭니다.
 */
const HEADER_CROP_RATIO = 0.28;

/**
 * 평면도 썸네일 미리보기 생성: 위쪽 HEADER_CROP_RATIO만큼 잘라내고 나머지
 * (3D 도면 + 워터마크)를 그대로 반환합니다. 확대 보기에는 쓰지 않고 원본을
 * 그대로 보여줍니다.
 */
export async function cropFloorPlanPreview(
  input: Buffer | Uint8Array,
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const metadata = await sharp(buffer).metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width === 0 || height === 0) {
    throw new Error("이미지 크기를 확인할 수 없습니다.");
  }

  const top = Math.round(height * HEADER_CROP_RATIO);

  return sharp(buffer)
    .extract({ left: 0, top, width, height: height - top })
    .toBuffer();
}
