import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSupabaseAdminClient } from "../../../../lib/supabase/client";

/**
 * 임시 진단용 — 실제 저장된 평면도 원본을 단계별로(다운로드 → 크롭 → 재검증)
 * 처리하면서 각 단계의 버퍼 길이와 앞부분 바이트를 그대로 반환해, 어느
 * 단계에서 손상이 생기는지 정확히 확인합니다.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 미설정" }, { status: 500 });
    }

    const path =
      "hosumaeul-epyeonhansesang-2/109c/1784710973183-109c.jpg";

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("floor-plans")
      .download(path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { stage: "download", error: downloadError?.message },
        { status: 500 },
      );
    }

    const originalBuffer = Buffer.from(await fileData.arrayBuffer());
    const originalFirstBytes = originalBuffer.subarray(0, 16).toString("hex");
    const originalValidSoi =
      originalBuffer[0] === 0xff && originalBuffer[1] === 0xd8;

    const originalMeta = await sharp(originalBuffer).metadata();

    const top = Math.round((originalMeta.height ?? 0) * 0.28);
    const croppedBuffer = await sharp(originalBuffer)
      .extract({
        left: 0,
        top,
        width: originalMeta.width ?? 0,
        height: (originalMeta.height ?? 0) - top,
      })
      .toBuffer();

    const croppedFirstBytes = croppedBuffer.subarray(0, 16).toString("hex");
    const croppedValidSoi =
      croppedBuffer[0] === 0xff && croppedBuffer[1] === 0xd8;

    let croppedMetaOk = false;
    let croppedMetaError: string | undefined;
    try {
      const m = await sharp(croppedBuffer).metadata();
      croppedMetaOk = Boolean(m.width && m.height);
    } catch (e) {
      croppedMetaError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      downloadedBytes: originalBuffer.length,
      originalFirstBytes,
      originalValidSoi,
      originalMeta: {
        width: originalMeta.width,
        height: originalMeta.height,
        format: originalMeta.format,
      },
      croppedBytes: croppedBuffer.length,
      croppedFirstBytes,
      croppedValidSoi,
      croppedMetaOk,
      croppedMetaError,
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
