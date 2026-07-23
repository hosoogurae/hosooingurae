-- 매물 접수(listing_submissions)에 딸린 사진들. 접수 단계에서는 아직 실제
-- listings 매물이 아니므로 listing_images가 아니라 별도 테이블에 붙입니다.
-- 관리자가 "매물로 등록"할 때 이 사진들의 URL을 그대로 새 listing의
-- images로 넘겨서 재사용합니다(app/api/listings POST가 이미 images 배열을
-- 받아 listing_images에 넣어주는 로직을 그대로 씁니다).
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists listing_submission_images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references listing_submissions(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_submission_images_submission_id_idx
  on listing_submission_images (submission_id, sort_order);

-- listing_submissions와 동일한 이유로 RLS만 켜고 정책은 두지 않습니다: 업로드
-- (공개 /sell/photos 화면)도, 조회(관리자 화면)도 전부 서버 Route Handler가
-- service_role 키로 처리하므로 anon 정책이 필요 없습니다.
alter table listing_submission_images enable row level security;
