-- 동일한 매물·국토부 거래 조합의 알림/확인 상태를 보존합니다.
-- 기존 listings 및 거래 데이터는 변경하거나 삭제하지 않습니다.
create table if not exists public.listing_suspected_match_events (
  match_key text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  status text not null default 'notified' check (status in ('notified', 'acknowledged')),
  notified_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_suspected_match_events_listing_id_idx
  on public.listing_suspected_match_events(listing_id);

alter table public.listing_suspected_match_events enable row level security;
