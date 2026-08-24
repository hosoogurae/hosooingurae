-- 연락받기(contact_requests): 매물 상세페이지의 "연락받기" 폼에서 손님이
-- 이름·연락처·희망 상담시간대를 남기면 저장되는 큐입니다. 상담원이 검토 후
-- 연락합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references listings(id) on delete cascade,
  name text not null,
  phone text not null,
  preferred_time text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists contact_requests_status_idx on contact_requests (status);
create index if not exists contact_requests_listing_id_idx on contact_requests (listing_id);

-- RLS만 켜고 정책은 하나도 만들지 않습니다: anon/authenticated는 select/insert
-- 모두 기본 차단됩니다. 공개 제출 폼(매물 상세 "연락받기")도 서버 Route
-- Handler가 service_role 키로 insert하므로 RLS를 우회할 필요가 없고,
-- 연락처(PII)가 담긴 테이블이라 공개 select/insert 정책을 두지 않는 것이
-- 의도된 설계입니다(listing_submissions와 동일한 패턴).
alter table contact_requests enable row level security;
