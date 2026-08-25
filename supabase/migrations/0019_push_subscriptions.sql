-- 웹 푸시 구독(push_subscriptions): 관리자가 "이 기기에서 알림 받기"를 켠
-- 기기(브라우저)마다 하나씩 저장됩니다. 로그인 계정이 하나뿐인 구조라
-- 사용자 FK 없이 기기 단위로만 관리하며, 새 문의가 들어오면 저장된
-- 구독 전체에 푸시를 발송합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- RLS만 켜고 정책은 하나도 만들지 않습니다: anon/authenticated는 select/insert
-- 모두 기본 차단됩니다. 구독 등록/해제/발송 전부 서버 Route Handler가
-- service_role 키로 처리하므로 RLS를 우회할 필요가 없습니다
-- (contact_requests와 동일한 패턴).
alter table push_subscriptions enable row level security;
