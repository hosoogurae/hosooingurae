/**
 * app/data/complexes.ts, app/data/listings.ts에 코드로 박혀 있는 초기 데이터를
 * Supabase(complexes/listings/listing_images 테이블)로 옮기는 1회성 스크립트입니다.
 *
 * 이 스크립트는 자동으로 실행되지 않습니다. 아래 순서대로 준비가 끝난 뒤
 * 직접 실행해주세요.
 *
 *   1) supabase/migrations/0001_init.sql을 Supabase SQL Editor에서 먼저 실행
 *      (README의 "실행해야 하는 SQL" 섹션 참고)
 *   2) .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *      (또는 SUPABASE_SERVICE_ROLE_KEY)가 설정돼 있는지 확인
 *   3) npm run migrate:supabase
 *
 * service role/secret key로 RLS를 우회해 쓰기 때문에, 운영 데이터가 있는
 * 프로젝트에서는 신중하게 실행하세요. 이미 존재하는 id는 upsert로 덮어씁니다.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { complexes } from "../app/data/complexes";
import { listings } from "../app/data/listings";
import { getSupabaseAdminClient } from "../app/lib/supabase/client";
import {
  complexToInsert,
  listingToImageInserts,
  listingToInsert,
} from "../app/lib/supabase/mappers";

/**
 * Next.js는 .env.local을 자동으로 읽지만, 이 스크립트는 tsx로 직접 실행되므로
 * 여기서 직접 파싱해 process.env에 채워줍니다(이미 설정된 값은 덮어쓰지 않음).
 */
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

async function main() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.error(
      "[migrate] Supabase 관리자 클라이언트를 만들 수 없습니다. " +
        ".env.local의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY를 확인해주세요.",
    );
    process.exit(1);
  }

  console.log(`[migrate] complexes ${complexes.length}건 upsert 중...`);
  const { data: complexRows, error: complexError } = await supabase
    .from("complexes")
    .upsert(complexes.map(complexToInsert), { onConflict: "id" })
    .select("id");

  if (complexError) {
    console.error("[migrate] complexes upsert 실패:", complexError);
    process.exit(1);
  }

  console.log(`[migrate] listings ${listings.length}건 upsert 중...`);
  const { data: listingRows, error: listingError } = await supabase
    .from("listings")
    .upsert(listings.map(listingToInsert), { onConflict: "id" })
    .select("id");

  if (listingError) {
    console.error("[migrate] listings upsert 실패:", listingError);
    process.exit(1);
  }

  console.log("[migrate] listing_images 재생성 중...");
  for (const listing of listings) {
    const { error: deleteError } = await supabase
      .from("listing_images")
      .delete()
      .eq("listing_id", listing.id);

    if (deleteError) {
      console.error(`[migrate] ${listing.id} 기존 이미지 삭제 실패:`, deleteError);
      continue;
    }

    const imageRows = listingToImageInserts(listing);
    if (imageRows.length === 0) continue;

    const { error: imageError } = await supabase
      .from("listing_images")
      .insert(imageRows);

    if (imageError) {
      console.error(`[migrate] ${listing.id} 이미지 삽입 실패:`, imageError);
    }
  }

  console.log("[migrate] 완료.");
  console.log(`[migrate] 이전된 complexes: ${complexRows?.length ?? 0}개`);
  console.log(`[migrate] 이전된 listings: ${listingRows?.length ?? 0}개`);
}

main().catch((error) => {
  console.error("[migrate] 예기치 못한 오류:", error);
  process.exit(1);
});
