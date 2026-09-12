-- "지역 소식" 자동 수집(1단계): 국토부 보도자료 RSS + 김포시 고시공고
-- 목록을 매일 가져와 쌓아두는 테이블입니다. 이번 단계에서는 손님에게
-- 보여주는 공개 페이지를 만들지 않습니다(2단계) — 관리자가 확인해서
-- 공개로 바꾼 것만 나중에 손님에게 보입니다.
--
-- 저장 범위: 제목 / 원문 링크 / 게시일 / 출처 뿐입니다. 본문은 저작권
-- 문제가 있어 절대 저장하지 않습니다(app/lib/noticeSources.ts도 본문을
-- 가져오지 않도록 만들었습니다).
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('molit', 'gimpo')),
  title text not null,
  source_url text not null,
  published_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  unique (source, source_url)
);

alter table notices enable row level security;

-- 주의: 이 프로젝트의 다른 "공개 읽기" 정책(listings 등)은 using (true)로
-- 열어두고 draft/published 구분을 앱 코드가 처리합니다. 이 테이블은
-- 일부러 다르게 갑니다 — 김포시 고시공고에는 도로·축제·쓰레기 등 부동산과
-- 무관한 글이 훨씬 많아서, "새로 수집된 글"이 실수로라도 손님에게 보이면
-- 안 됩니다. 그래서 RLS 정책 자체가 status='published'을 강제합니다
-- (앱 코드 필터링에만 의존하지 않는 이중 안전장치).
--
-- 이 정책 때문에 anon/publishable 키로 조회하면 "신규" 상태 글은 아예
-- 안 보입니다 — 관리자 화면(app/lib/notices.ts)과 수집 크론은 그래서
-- service_role 키로 접근합니다(앱 코드에 그 이유를 다시 적어뒀습니다).
create policy "published notices are publicly readable"
  on notices for select
  using (status = 'published');

-- insert/update/delete 정책은 만들지 않습니다 — service_role(수집 크론,
-- 관리자 API)만 쓸 수 있습니다(admin_sms_templates·contract_prep_items와
-- 동일 원칙).
