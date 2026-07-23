-- 매물 접수(listing_submissions): 집주인/자산가가 공개 폼(/sell)에서 직접
-- 제출한 매물 정보를 관리자가 검토하는 큐입니다.
--
-- listings와 달리 접수 단계에는 공급/전용면적, 방/욕실 수 같은 필수 정보가
-- 아직 없으므로 별도 테이블로 둡니다. 관리자가 "매물로 등록"할 때는 이
-- 정보를 참고해 기존 매물 등록 화면에서 나머지 값을 채워 넣습니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists listing_submissions (
  id uuid primary key default gen_random_uuid(),
  complex_name text not null,
  building text,
  floor integer,
  transaction_type text not null check (transaction_type in ('매매', '전세', '월세')),
  desired_price_label text not null,
  occupancy_status text,
  interior_condition text,
  move_out_date text,
  viewing_availability text,
  notes text,
  contact_name text not null,
  contact_phone text not null,
  status text not null default 'new' check (status in ('new', 'confirmed', 'converted')),
  converted_listing_id text references listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_submissions_status_idx on listing_submissions (status);

drop trigger if exists listing_submissions_set_updated_at on listing_submissions;
create trigger listing_submissions_set_updated_at
  before update on listing_submissions
  for each row execute function set_updated_at();

-- RLS만 켜고 정책은 하나도 만들지 않습니다: anon/authenticated는 select/insert
-- 모두 기본 차단됩니다. 공개 제출 폼(app/sell)도 서버 Route Handler가
-- service_role 키로 insert하므로 RLS를 우회할 필요가 없고, 연락처(PII)가
-- 담긴 테이블이라 다른 테이블처럼 공개 select 정책을 두지 않는 것이
-- 의도된 설계입니다.
alter table listing_submissions enable row level security;
