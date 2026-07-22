import { NextResponse } from "next/server";
import sharp from "sharp";

/** 임시 진단용 — Vercel 서버리스 환경에서 sharp가 정상 동작하는지 직접 확인합니다. */
export async function GET() {
  try {
    const testImage = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const cropped = await sharp(testImage)
      .extract({ left: 0, top: 50, width: 200, height: 150 })
      .toBuffer();

    const metadata = await sharp(cropped).metadata();
    const isValidJpeg =
      cropped[0] === 0xff && cropped[1] === 0xd8 && cropped[2] === 0xff;

    return NextResponse.json({
      sharpVersions: sharp.versions,
      originalBytes: testImage.length,
      croppedBytes: cropped.length,
      croppedFirstBytesHex: Buffer.from(cropped.subarray(0, 16)).toString(
        "hex",
      ),
      isValidJpeg,
      metadata: { width: metadata.width, height: metadata.height, format: metadata.format },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
