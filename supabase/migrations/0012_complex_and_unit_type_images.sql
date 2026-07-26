-- 단지 공통 사진 / 타입 공통 사진 (3단계 매물 사진 관리)
--
-- 지금까지는 매물 개별 사진(listing_images)만 있어서, 같은 단지·같은
-- 타입(예: 109A) 매물마다 단지 외관·조경·놀이터 같은 공통 사진과 그 타입의
-- 실내 사진을 매번 새로 올려야 했습니다. 이 두 테이블은 그런 사진을
-- complex_id(+unit_type) 단위로 한 번만 저장해두고, 매물 상세/카드에서는
-- 읽는 시점에 조인해서 보여줍니다(listing_images에 복제 저장하지 않음).
--
-- floor_plan_images를 확장하지 않고 별도 테이블로 만드는 이유: 그 테이블은
-- 평면도 "도면" 전용(면적 자동매칭, 배너 크롭 미리보기)이라, 실내 촬영
-- 사진을 섞으면 기존에 잘 동작하는 기능을 건드릴 위험이 있습니다. 두 테이블
-- 모두 listing_images와 동일하게 단순한 구조(순서=sort_order, 대표사진=
-- 0번째, updated_at 불필요)로 둡니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists complex_images (
  id uuid primary key default gen_random_uuid(),
  complex_id text not null references complexes(id) on delete cascade,
  category text not null check (category in
    ('exterior', 'entrance', 'landscape', 'playground', 'parking', 'community', 'other')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists complex_images_complex_idx
  on complex_images (complex_id, sort_order);

create table if not exists unit_type_images (
  id uuid primary key default gen_random_uuid(),
  complex_id text not null references complexes(id) on delete cascade,
  unit_type text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists unit_type_images_complex_unit_idx
  on unit_type_images (complex_id, unit_type, sort_order);

-- RLS: 기존 관례와 동일 — 누구나 읽기 가능, 쓰기는 service_role(관리자 API)만.
alter table complex_images enable row level security;

drop policy if exists "complex_images are publicly readable" on complex_images;
create policy "complex_images are publicly readable"
  on complex_images for select
  using (true);

alter table unit_type_images enable row level security;

drop policy if exists "unit_type_images are publicly readable" on unit_type_images;
create policy "unit_type_images are publicly readable"
  on unit_type_images for select
  using (true);
