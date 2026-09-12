-- "지역 소식" 제목 필터(app/lib/noticeKeywords.ts)가 손님 관련 단어에
-- 걸렸는지 표시하는 컬럼입니다. 사무소가 보는 범위(matched)가 손님이
-- 보는 범위(customer_candidate)를 포함하므로, 저장된 글은 전부
-- matched=true인 것들이고 이 컬럼은 그중 손님 공개 후보만 추가로
-- 표시합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table notices
  add column if not exists customer_candidate boolean not null default false;
