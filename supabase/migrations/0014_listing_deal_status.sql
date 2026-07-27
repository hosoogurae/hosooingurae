-- 매물 거래 진행 상태(deal_status) + 마지막 확인일(last_verified_at)
--
-- deal_status는 기존 status(draft/published, "공개 여부")와 이름이 겹치지
-- 않도록 별도로 둡니다 — 이 매물의 실제 거래 진행 상태(광고중/계약진행/
-- 계약완료/보류)를 나타냅니다. completed/hold는 공개 API 조회 시
-- status와 무관하게 항상 제외됩니다(app/lib/listings.ts 참고) — 관리자가
-- status를 따로 안 바꿔도 계약완료/보류 매물이 계속 광고되는 사고를
-- 코드 레벨에서 막기 위함입니다.
--
-- last_verified_at은 네이버 가져오기 시점에 자동으로 채워지는 기존
-- verified_date(date, 고객에게 보이는 "확인매물" 신뢰 배지)와는 다른
-- 필드입니다 — 관리자가 "오늘 확인" 버튼으로 직접 갱신하는 운영 관리용
-- 값이며, 날짜+시간을 모두 기록하고 공개 API에는 노출하지 않습니다.
--
-- 기존 데이터/컬럼은 전혀 건드리지 않는 add column만 사용합니다.
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings
  add column if not exists deal_status text not null default 'advertising'
    check (deal_status in ('advertising', 'negotiating', 'completed', 'hold'));

alter table listings
  add column if not exists last_verified_at timestamptz;

create index if not exists listings_deal_status_idx on listings (deal_status);
create index if not exists listings_last_verified_at_idx on listings (last_verified_at);
