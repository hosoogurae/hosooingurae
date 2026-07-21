-- 호수공인중개사사무소 CMS 초기 스키마
-- complexes(단지) / listings(매물) / listing_images(매물 이미지)
--
-- 적용 방법:
--   1) Supabase 대시보드 > SQL Editor에 이 파일 내용을 붙여넣고 실행하거나,
--   2) Supabase CLI가 설치돼 있다면: supabase db push
--
-- 이 파일은 스키마만 정의합니다. 실제 데이터 이전은 scripts/migrate-to-supabase.ts
-- 를 별도로 실행해서 진행합니다(README 참고).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- complexes: 단지 공통 정보
-- ---------------------------------------------------------------------------
create table if not exists complexes (
  id text primary key,
  name text not null,
  address text not null,
  property_type text not null,
  approval_date date not null,
  total_households integer not null,
  buildings integer not null,
  parking_count integer not null,
  parking_per_household numeric not null,
  heating text not null,
  hallway_type text not null,
  builder text not null,
  nearby_schools text[] not null default '{}',
  subway text,
  subway_distance text,
  buses text[] not null default '{}',
  features text[] not null default '{}',
  -- 국토교통부 실거래가 API 연동 정보 (app/lib/molit.ts)
  molit_lawd_code text,
  molit_apt_seq text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- listings: 개별 매물 정보 (단지에 종속)
-- ---------------------------------------------------------------------------
create table if not exists listings (
  id text primary key,
  complex_id text not null references complexes(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('매매', '전세', '월세')),
  -- 만원 단위. 매매가/보증금 기준.
  price integer not null,
  price_label text not null,
  building text not null default '',
  floor integer not null,
  total_floors integer not null,
  supply_area numeric not null,
  exclusive_area numeric not null,
  room_count integer not null,
  bathroom_count integer not null,
  direction text not null,
  move_in_date text not null,
  maintenance_fee text,
  short_description text not null,
  features text[] not null default '{}',
  naver_url text,
  -- 네이버 화면에 표시된 매물번호. naver_url의 articleNo와 다를 수 있어 별도 보관.
  article_number text,
  verified_date date,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_complex_id_idx on listings (complex_id);
create index if not exists listings_is_featured_idx on listings (is_featured) where is_featured = true;

-- ---------------------------------------------------------------------------
-- listing_images: 매물 이미지 (1:N, 정렬 가능)
-- ---------------------------------------------------------------------------
create table if not exists listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references listings(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_id_idx on listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- updated_at 자동 갱신 트리거
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists complexes_set_updated_at on complexes;
create trigger complexes_set_updated_at
  before update on complexes
  for each row execute function set_updated_at();

drop trigger if exists listings_set_updated_at on listings;
create trigger listings_set_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: 누구나 읽기 가능(공개 매물 정보), 쓰기는 service_role(관리자 API)만 가능.
-- anon/authenticated 키로는 insert/update/delete가 불가능합니다.
-- ---------------------------------------------------------------------------
alter table complexes enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;

drop policy if exists "complexes are publicly readable" on complexes;
create policy "complexes are publicly readable"
  on complexes for select
  using (true);

drop policy if exists "listings are publicly readable" on listings;
create policy "listings are publicly readable"
  on listings for select
  using (true);

drop policy if exists "listing_images are publicly readable" on listing_images;
create policy "listing_images are publicly readable"
  on listing_images for select
  using (true);

-- insert/update/delete 정책을 별도로 만들지 않으면 RLS가 기본적으로 모두 차단합니다.
-- 관리자 API(app/api/listings)는 secret key(구 명칭 service_role key)로 접속하므로
-- RLS 자체를 우회하여 항상 쓰기가 가능합니다.
