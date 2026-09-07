-- contract_prep_items: 계약 준비물 안내 문자 화면에서 역할별로 보여줄
-- 체크박스 항목입니다. admin_sms_templates(0013)와는 완전히 별개의
-- 새 테이블/새 API로만 접근합니다 — 관리자 앱(admin_sms_templates 사용)의
-- 스키마·엔드포인트에는 영향이 없습니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists contract_prep_items (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('공통', '매수인', '매도인', '임차인', '임대인')),
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists contract_prep_items_set_updated_at on contract_prep_items;
create trigger contract_prep_items_set_updated_at
  before update on contract_prep_items
  for each row execute function set_updated_at();

-- RLS만 켜고 정책은 하나도 만들지 않습니다: anon/authenticated는 select/insert
-- 모두 기본 차단됩니다. 관리자 API가 service_role 키로 접근하므로 RLS를
-- 우회할 필요가 없습니다(admin_sms_templates와 동일 원칙).
alter table contract_prep_items enable row level security;

insert into contract_prep_items (role, label, sort_order) values
  ('공통', '신분증', 0),
  ('공통', '도장', 1),
  ('공통', '통장 사본', 2),
  ('매수인', '계약금', 0),
  ('매수인', '계약금 이체 가능한 카드나 OTP', 1),
  ('매도인', '등기권리증(등기필증)', 0),
  ('매도인', '인감도장', 1),
  ('매도인', '인감증명서', 2),
  ('임대인', '등기권리증', 0),
  ('임차인', '계약금', 0);
