import type {
  ListingSubmission,
  ListingSubmissionInput,
  ListingSubmissionStatus,
} from "../data/listingSubmissions";
import { getSupabaseAdminClient } from "./supabase/client";
import type { ListingSubmissionRow } from "./supabase/database.types";

const PHOTOS_BUCKET = "listing-submission-photos";

/**
 * listing_submissions(및 딸린 사진)는 접수 단계에서만 쓰는 테이블이라 공개
 * select 정책이 없습니다(연락처 PII 보호). 그래서 모든 함수가 service_role
 * 클라이언트만 씁니다 — 공개 제출/사진 업로드(app/sell)도 서버 Route
 * Handler를 거쳐 이 함수로 들어옵니다.
 */

function rowToListingSubmission(
  row: ListingSubmissionRow,
  photos: string[] = [],
): ListingSubmission {
  return {
    id: row.id,
    complexName: row.complex_name,
    building: row.building ?? undefined,
    floor: row.floor ?? undefined,
    transactionType: row.transaction_type,
    desiredPriceLabel: row.desired_price_label,
    occupancyStatus: row.occupancy_status ?? undefined,
    interiorCondition: row.interior_condition ?? undefined,
    moveOutDate: row.move_out_date ?? undefined,
    viewingAvailability: row.viewing_availability ?? undefined,
    notes: row.notes ?? undefined,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    status: row.status,
    convertedListingId: row.converted_listing_id ?? undefined,
    createdAt: row.created_at,
    photos,
  };
}

/** 여러 접수 건의 사진을 한 번에 조회해 submission_id별로 묶습니다(N+1 방지). */
async function fetchPhotosBySubmissionId(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  submissionIds: string[],
): Promise<Map<string, string[]>> {
  if (submissionIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("listing_submission_images")
    .select("submission_id, url, sort_order")
    .in("submission_id", submissionIds)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[listingSubmissions] 사진 조회 실패", error);
    return new Map();
  }

  const grouped = new Map<string, string[]>();
  for (const image of data) {
    const urls = grouped.get(image.submission_id) ?? [];
    urls.push(image.url);
    grouped.set(image.submission_id, urls);
  }
  return grouped;
}

/** 공개 제출 폼(app/sell)에서 호출합니다. */
export async function createListingSubmission(
  input: ListingSubmissionInput,
): Promise<{ submission?: ListingSubmission; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data, error } = await supabase
    .from("listing_submissions")
    .insert({
      complex_name: input.complexName,
      building: input.building?.trim() || null,
      floor: input.floor ?? null,
      transaction_type: input.transactionType,
      desired_price_label: input.desiredPriceLabel,
      occupancy_status: input.occupancyStatus?.trim() || null,
      interior_condition: input.interiorCondition?.trim() || null,
      move_out_date: input.moveOutDate?.trim() || null,
      viewing_availability: input.viewingAvailability?.trim() || null,
      notes: input.notes?.trim() || null,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[listingSubmissions] 접수 저장 실패", error);
    return { error: "접수 저장에 실패했습니다." };
  }

  return { submission: rowToListingSubmission(data) };
}

/** "매물로 등록" 화면(/admin/listings/new?submissionId=...)에서 미리 채울 값을 가져올 때 씁니다. */
export async function getListingSubmissionById(
  id: string,
): Promise<ListingSubmission | undefined> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("listing_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[listingSubmissions] 단건 조회 실패", error);
    return undefined;
  }
  if (!data) return undefined;

  const photosByid = await fetchPhotosBySubmissionId(supabase, [id]);
  return rowToListingSubmission(data, photosByid.get(id) ?? []);
}

/** 관리자 화면(/admin/listing-submissions) 전용. 신규 건이 먼저 보이도록 정렬합니다. */
export async function getAllListingSubmissions(): Promise<ListingSubmission[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listing_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[listingSubmissions] 목록 조회 실패", error);
    return [];
  }

  // 신규 건이 가장 먼저 보이도록 정렬합니다(같은 상태끼리는 최신순 유지).
  const statusPriority: Record<string, number> = {
    new: 0,
    confirmed: 1,
    converted: 2,
  };
  const sorted = [...data].sort(
    (a, b) => statusPriority[a.status] - statusPriority[b.status],
  );

  const photosBySubmissionId = await fetchPhotosBySubmissionId(
    supabase,
    sorted.map((row) => row.id),
  );

  return sorted.map((row) =>
    rowToListingSubmission(row, photosBySubmissionId.get(row.id) ?? []),
  );
}

export async function updateListingSubmissionStatus(
  id: string,
  status: ListingSubmissionStatus,
  convertedListingId?: string,
): Promise<{ submission?: ListingSubmission; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { error: "Supabase가 설정되어 있지 않습니다." };
  }

  const patch: { status: ListingSubmissionStatus; converted_listing_id?: string } = {
    status,
  };
  if (convertedListingId) {
    patch.converted_listing_id = convertedListingId;
  }

  const { data, error } = await supabase
    .from("listing_submissions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[listingSubmissions] 상태 변경 실패", error);
    return { error: "상태 변경에 실패했습니다." };
  }
  if (!data) {
    return { error: "접수 건을 찾을 수 없습니다." };
  }

  return { submission: rowToListingSubmission(data) };
}

export async function deleteListingSubmission(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase가 설정되어 있지 않습니다." };
  }

  // DB 행(listing_submission_images)은 cascade로 같이 지워지지만, Storage
  // 파일 자체는 남으므로 고아 파일이 쌓이지 않게 먼저 정리합니다.
  const { data: files } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(id);
  if (files && files.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(files.map((file) => `${id}/${file.name}`));
    if (removeError) {
      console.error("[listingSubmissions] 사진 파일 삭제 실패", removeError);
    }
  }

  const { error } = await supabase
    .from("listing_submissions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[listingSubmissions] 삭제 실패", error);
    return { success: false, error: "삭제에 실패했습니다." };
  }

  return { success: true };
}

function slugifyForPath(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file"
  );
}

async function ensurePhotosBucket(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
) {
  const { data: existing } = await supabase.storage.getBucket(PHOTOS_BUCKET);
  if (existing) return;

  const { error } = await supabase.storage.createBucket(PHOTOS_BUCKET, {
    public: true,
  });
  if (error && !/already exists/i.test(error.message)) {
    console.error("[listingSubmissions] 사진 버킷 생성 실패", error);
  }
}

export interface SubmissionPhotoUploadResult {
  fileName: string;
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * 공개 사진 업로드 화면(/sell/photos/[id])에서 호출합니다. 접수 건이 실제로
 * 존재하는지 먼저 확인하고, 각 파일을 Storage에 올린 뒤
 * listing_submission_images에 행을 추가합니다. 파일 하나가 실패해도 나머지는
 * 계속 진행합니다(사진은 선택사항이라 부분 성공도 유효합니다).
 */
export async function uploadListingSubmissionPhotos(
  submissionId: string,
  files: { fileName: string; contentType: string; bytes: Uint8Array }[],
): Promise<{ results: SubmissionPhotoUploadResult[]; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { results: [], error: "Supabase가 설정되어 있지 않습니다." };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("listing_submissions")
    .select("id")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    return { results: [], error: "접수 건을 찾을 수 없습니다." };
  }

  await ensurePhotosBucket(supabase);

  const { data: existingMax } = await supabase
    .from("listing_submission_images")
    .select("sort_order")
    .eq("submission_id", submissionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSortOrder = (existingMax?.sort_order ?? -1) + 1;
  const results: SubmissionPhotoUploadResult[] = [];

  for (const file of files) {
    const path = `${submissionId}/${Date.now()}-${slugifyForPath(file.fileName)}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, file.bytes, {
        contentType: file.contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[listingSubmissions] 사진 업로드 실패", uploadError);
      results.push({
        fileName: file.fileName,
        success: false,
        error: "업로드에 실패했습니다.",
      });
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);

    const { error: insertError } = await supabase
      .from("listing_submission_images")
      .insert({
        submission_id: submissionId,
        url: publicUrl,
        sort_order: nextSortOrder,
      });

    if (insertError) {
      console.error("[listingSubmissions] 사진 정보 저장 실패", insertError);
      // 스토리지에는 올라갔지만 행 저장에 실패한 경우, 고아 파일이 남지
      // 않도록 방금 올린 파일을 정리합니다.
      await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
      results.push({
        fileName: file.fileName,
        success: false,
        error: "사진 정보 저장에 실패했습니다.",
      });
      continue;
    }

    nextSortOrder += 1;
    results.push({ fileName: file.fileName, success: true, url: publicUrl });
  }

  return { results };
}
