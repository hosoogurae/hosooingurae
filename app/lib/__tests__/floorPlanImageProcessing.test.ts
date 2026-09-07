import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { resizeFloorPlanPreview } from "../floorPlanImageProcessing";

/**
 * 예전엔 상단 28%를 sharp .extract()로 하드 크롭해서 헤더 배너 없는
 * 평면도의 방 라벨이 통째로 잘려나가는 사고가 있었습니다(한강힐스테이트
 * 110.45G 등 — "침실" 라벨이 미리보기에서 사라짐). 지금은 비율 유지
 * 축소만 하므로, 원본 맨 위에 있던 내용이 미리보기에도 그대로 남아있어야
 * 합니다. 크롭이 다시 들어오면 이 테스트가 실패해야 합니다.
 */

const RED = { r: 220, g: 30, b: 30 };
const BLUE = { r: 30, g: 60, b: 220 };

/** 세로로 긴 이미지: 맨 위 얇은 띠는 빨강, 나머지는 파랑으로 채웁니다. */
async function buildImageWithTopMarker(
  width: number,
  height: number,
  markerHeight: number,
): Promise<Buffer> {
  const background = sharp({
    create: { width, height, channels: 3, background: BLUE },
  });
  const marker = await sharp({
    create: { width, height: markerHeight, channels: 3, background: RED },
  })
    .png()
    .toBuffer();

  return background
    .composite([{ input: marker, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

describe("resizeFloorPlanPreview — 잘라내지 않고 비율만 유지해 축소", () => {
  it("맨 위 내용을 잘라내지 않는다(크롭 재발 방지)", async () => {
    const original = await buildImageWithTopMarker(2000, 2500, 100);
    const preview = await resizeFloorPlanPreview(original);

    const meta = await sharp(preview).metadata();
    expect(meta.width).toBeTruthy();
    expect(meta.height).toBeTruthy();

    // 맨 위(0,0) 픽셀이 여전히 빨간 마커여야 합니다. 예전 방식(상단 28%
    // 하드 크롭)이었다면 이 자리는 파란 배경으로 바뀌어 테스트가 실패합니다.
    const { data, info } = await sharp(preview)
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.channels).toBeGreaterThanOrEqual(3);
    expect(data[0]).toBeGreaterThan(150); // R
    expect(data[1]).toBeLessThan(100); // G
    expect(data[2]).toBeLessThan(100); // B
  });

  it("가로세로 비율을 원본과 동일하게 유지한다(잘라내지 않았다는 뜻)", async () => {
    const original = await buildImageWithTopMarker(2000, 2500, 100);
    const preview = await resizeFloorPlanPreview(original);
    const meta = await sharp(preview).metadata();

    const originalRatio = 2500 / 2000;
    const previewRatio = meta.height! / meta.width!;
    // 정수 반올림 오차만 허용합니다. 크롭이 섞이면 이 비율이 눈에 띄게 달라집니다.
    expect(previewRatio).toBeCloseTo(originalRatio, 2);
  });

  it("긴 변이 최대 크기를 넘으면 축소한다", async () => {
    const original = await buildImageWithTopMarker(2000, 2500, 100);
    const preview = await resizeFloorPlanPreview(original);
    const meta = await sharp(preview).metadata();

    expect(meta.height).toBeLessThanOrEqual(1600);
    expect(meta.width).toBeLessThanOrEqual(1600);
  });

  it("원본이 이미 작으면 확대하지 않는다", async () => {
    const original = await buildImageWithTopMarker(400, 500, 50);
    const preview = await resizeFloorPlanPreview(original);
    const meta = await sharp(preview).metadata();

    expect(meta.width).toBe(400);
    expect(meta.height).toBe(500);
  });
});
