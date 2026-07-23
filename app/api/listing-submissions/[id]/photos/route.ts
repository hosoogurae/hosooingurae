import { NextRequest, NextResponse } from "next/server";
import { uploadListingSubmissionPhotos } from "../../../../lib/listingSubmissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 접수 완료 후 공개 사진 업로드 화면(/sell/photos/[id])에서 호출합니다.
 * multipart/form-data로 "files" 필드에 여러 장을 담아 보냅니다. 사진은
 * 선택사항이므로 일부 파일이 실패해도 500으로 막지 않고 파일별 결과를
 * 그대로 돌려줍니다.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const fileEntries = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (fileEntries.length === 0) {
    return NextResponse.json(
      { error: "업로드할 사진이 없습니다." },
      { status: 400 },
    );
  }

  const nonImage = fileEntries.find((file) => !file.type.startsWith("image/"));
  if (nonImage) {
    return NextResponse.json(
      { error: "이미지 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const files = await Promise.all(
    fileEntries.map(async (file) => ({
      fileName: file.name,
      contentType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );

  const { results, error } = await uploadListingSubmissionPhotos(id, files);

  if (error) {
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ results });
}
