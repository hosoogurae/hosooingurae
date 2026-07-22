-- 단지별 평면도(타입별) 이미지 저장 기능
--
-- listings.unit_type: 매물의 평형 타입("84A" 등). 관리자가 매물 등록/수정 시
--   입력합니다. 값이 있으면 매물 상세페이지에서 같은 단지·같은 타입의 평면도를
--   자동으로 보여주는 데 씁니다. 없어도 되는 값이라 nullable입니다.
--
-- floor_plan_images: complex_id + unit_type 조합으로 저장하며, 같은 조합에
--   여러 장(예: 기본형/확장형)이 있을 수 있어 1:N입니다. 매물 자체가 아니라
--   "단지의 이 타입" 단위로 저장되므로, 같은 타입인 여러 매물이 이 이미지를
--   공용으로 재사용합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings add column if not exists unit_type text;

create table if not exists floor_plan_images (
  id uuid primary key default gen_random_uuid(),
  complex_id text not null references complexes(id) on delete cascade,
  unit_type text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists floor_plan_images_complex_unit_idx
  on floor_plan_images (complex_id, unit_type, sort_order);

drop trigger if exists floor_plan_images_set_updated_at on floor_plan_images;
create trigger floor_plan_images_set_updated_at
  before update on floor_plan_images
  for each row execute function set_updated_at();

-- RLS: 기존 관례와 동일 — 누구나 읽기 가능, 쓰기는 service_role(관리자 API)만.
alter table floor_plan_images enable row level security;

drop policy if exists "floor_plan_images are publicly readable" on floor_plan_images;
create policy "floor_plan_images are publicly readable"
  on floor_plan_images for select
  using (true);
