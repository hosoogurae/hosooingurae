-- admin_sms_templates: 관리자 앱의 "내 문자양식" — 부모님 두 분이 함께
-- 쓰는 커스텀 문자 템플릿입니다. 순수 관리자 전용 데이터라 공개 select
-- 정책 없이 서버 관리자 API(service_role)로만 접근합니다
-- (listing_submissions와 동일한 설계 원칙).
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists admin_sms_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_sms_templates_set_updated_at on admin_sms_templates;
create trigger admin_sms_templates_set_updated_at
  before update on admin_sms_templates
  for each row execute function set_updated_at();

-- RLS만 켜고 정책은 하나도 만들지 않습니다: anon/authenticated는 select/insert
-- 모두 기본 차단됩니다. 관리자 API가 service_role 키로 접근하므로 RLS를
-- 우회할 필요가 없습니다.
alter table admin_sms_templates enable row level security;
