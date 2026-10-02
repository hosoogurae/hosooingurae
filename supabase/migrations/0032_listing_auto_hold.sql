-- 90일 자동 보류 기능 — auto_held_at
--
-- deal_status를 'hold'로 바꿀 수 있는 경로는 두 가지입니다: 관리자가 직접
-- 고르는 수동 보류, 그리고 90일 넘게 아무도 확인하지 않은 매물을 매일
-- cron(app/api/cron/auto-hold-stale-listings)이 자동으로 보류하는 경우.
-- 둘 다 deal_status 값만 보면 'hold'로 똑같아서 구분이 안 되므로, cron이
-- 보류시킨 시각만 별도로 남깁니다. 사람이 직접 보류했으면 이 값은 비어
-- 있습니다.
--
-- deal_status가 'hold'에서 'advertising'/'negotiating'으로 바뀌면(되살리기)
-- 이 값은 다시 null로 비워집니다(app/api/listings/[id]/route.ts 참고) —
-- last_verified_at도 그 시점에 함께 갱신되므로, 되살린 다음날 cron이 같은
-- 매물을 또 보류시키는 일은 없습니다.
--
-- 기존 데이터/컬럼은 전혀 건드리지 않는 add column만 사용합니다.
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings
  add column if not exists auto_held_at timestamptz;

create index if not exists listings_auto_held_at_idx on listings (auto_held_at);
