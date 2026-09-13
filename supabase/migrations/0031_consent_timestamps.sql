-- contact_requests·listing_submissions에 동의 시각을 기록합니다. 지금까지
-- 두 API는 동의 여부를 확인만 하고 버렸는데, 나중에 손님이 "동의한 적
-- 없다"고 하면 입증할 방법이 없었습니다 — 동의받은 사실의 입증 책임은
-- 사업자에게 있습니다.
--
-- 기존 행은 값을 비워둡니다(null) — 실제로 언제 동의했는지 알 수 없는
-- 과거 기록에 지어낸 시각을 채우지 않습니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table contact_requests
  add column if not exists consented_at timestamptz;

alter table listing_submissions
  add column if not exists consented_at timestamptz;
