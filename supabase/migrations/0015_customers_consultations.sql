-- ⚠️ 번호 재배정 필요(보관 브랜치 wip/customers-consultations-2, 2026-09-03):
-- 이 파일은 main에 0016~0025가 이미 커밋·적용된 뒤에 저장된 것이라, 파일명의
-- "0015"는 실제 적용 순서와 맞지 않습니다. 이 작업을 이어서 실제로 적용하기
-- 전에, 그 시점 main의 마지막 마이그레이션 번호 다음 번호로 다시 매기세요
-- (지금 main 기준으로는 0025 다음이니 0026이 되지만, 재개 시점엔 더 커져
-- 있을 수 있습니다 — 그때 다시 확인).
--
-- 고객 CRM + 상담 기록(customers/consultations/consultation_transcripts/
-- consultation_extracted_fields/consultation_tasks)
--
-- 이번 단계는 음성/녹음 없는 "수동 상담 기록" 기능만 대상입니다. 다음
-- 단계(OpenAI Realtime 음성 상담)에서 같은 테이블을 그대로 재사용할 수
-- 있도록 컬럼을 미리 넉넉하게 잡아둡니다(예: consultations.mode에
-- 'free'/'openai'를 이미 포함, consultation_transcripts.speaker에
-- 화자 미확인 대응 포함). consultation_recordings, push_subscriptions,
-- notification_logs, offline_sync_queue는 이번 단계 범위가 아니므로
-- 만들지 않습니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.
-- (이 파일 자체는 리포에 커밋만 하고, 운영 DB에는 사용자가 직접 적용합니다.)

-- customers: 고객 CRM. 전화번호 없이도 고객을 먼저 등록하거나 상담을
-- 시작할 수 있어야 하므로 phone은 nullable입니다. 화면 표시는 phone(원본
-- 표기 그대로)을 쓰고, 중복 비교는 phone_normalized(숫자만, 하이픈 제거)
-- 로만 합니다 — 표기가 달라도(하이픈 유무 등) 같은 번호면 같은 값으로
-- 비교됩니다. 연락처가 아예 없으면 중복 검사 자체를 하지 않고, 이름만
-- 으로는 절대 자동 병합하지 않습니다(app/lib/customers.ts의
-- findCustomerByPhone 참고).
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  phone_normalized text,
  memo text,
  desired_transaction_type text check (desired_transaction_type in ('매매', '전세', '월세')),
  desired_area text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- phone_normalized가 있는 행끼리만 유일해야 합니다(둘 다 NULL인 행은
-- Postgres가 원래 서로 다른 값으로 취급하지만, 부분 인덱스로 의도를
-- 명시적으로 남깁니다).
create unique index if not exists customers_phone_normalized_key
  on customers (phone_normalized)
  where phone_normalized is not null;
create index if not exists customers_name_idx on customers (name);

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- consultations: 상담 1건. customer_id는 nullable — "고객 없이 시작"을
-- 허용하고(요청사항), 나중에 연락처가 확인되면 고객을 연결합니다.
-- mode는 이번 단계에서 항상 'manual'이지만, 다음 단계(음성 상담) 값도
-- 미리 체크 제약에 포함해 컬럼 변경 없이 확장할 수 있게 합니다.
create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  mode text not null default 'manual' check (mode in ('manual', 'free', 'openai')),
  status text not null default 'in_progress' check (status in ('in_progress', 'ended', 'discarded')),
  transcript text,
  corrected_transcript text,
  summary text,
  extracted_conditions jsonb not null default '{}'::jsonb,
  uncertain_fields jsonb not null default '[]'::jsonb,
  follow_up_tasks jsonb not null default '[]'::jsonb,
  sms_draft text,
  internal_memo text,
  -- 상담 종료 후 붙이는 자유 태그(예: 신혼부부/투자/급매/반려동물/재방문 등).
  -- 고정 enum이 아니라 자유 입력이며, 나중에 "태그로 고객/상담 검색"에
  -- text[]의 @>/&& 연산자를 그대로 활용할 수 있게 배열로 둡니다.
  tags text[] not null default '{}',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultations_customer_id_idx on consultations (customer_id);
create index if not exists consultations_status_idx on consultations (status);
create index if not exists consultations_started_at_idx on consultations (started_at desc);
create index if not exists consultations_tags_idx on consultations using gin (tags);

drop trigger if exists consultations_set_updated_at on consultations;
create trigger consultations_set_updated_at
  before update on consultations
  for each row execute function set_updated_at();

-- consultation_transcripts: 상담 중 기록된 발화/메모를 순서대로 저장합니다.
-- 이번 단계(수동 상담)에서는 중개사가 직접 입력한 메모 한 줄이 한 행이
-- 되고(speaker='agent'), 다음 단계(음성 인식)에서는 음성 전사 결과가
-- 같은 구조로 들어옵니다. speaker='unknown'은 자동 화자분리 확신이
-- 낮을 때를 대비한 값(다음 단계 대비, 이번 단계에서는 미사용 가능).
create table if not exists consultation_transcripts (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  speaker text not null default 'agent' check (speaker in ('agent', 'customer', 'unknown')),
  text text not null,
  corrected_text text,
  sort_order integer not null default 0,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists consultation_transcripts_consultation_id_idx
  on consultation_transcripts (consultation_id, sort_order);

-- consultation_extracted_fields: 희망조건 등 구조화된 항목별 값 + 신뢰도.
-- field_value는 jsonb입니다 — 가격(숫자), 날짜, 배열(예: 옵션 여러 개),
-- 객체(예: 범위값 {min,max}) 등 다양한 형태를 문자열로 억지로 우겨넣지
-- 않고 그대로 저장하기 위함입니다. 이번 단계는 중개사가 직접 입력하므로
-- 기본 confidence는 'confirmed'이며, 확신이 없는 값은 화면에서
-- 'uncertain'으로 직접 표시할 수 있습니다(다음 단계의 AI 자동추출
-- 확신도 판정과 같은 컬럼을 그대로 재사용). (consultation_id, field_key)에
-- unique 제약을 둬서 "희망조건 입력" 화면이 항목별로 upsert(같은 키를
-- 다시 입력하면 값만 갱신)할 수 있게 합니다.
create table if not exists consultation_extracted_fields (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  field_key text not null,
  field_value jsonb not null,
  confidence text not null default 'confirmed' check (confidence in ('confirmed', 'uncertain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consultation_id, field_key)
);

-- consultation_id 단독 조회는 위 unique(consultation_id, field_key) 제약이
-- 만드는 인덱스(선두 컬럼 consultation_id)로 이미 커버되므로 별도 인덱스를
-- 두지 않습니다(중복 인덱스 방지).

drop trigger if exists consultation_extracted_fields_set_updated_at on consultation_extracted_fields;
create trigger consultation_extracted_fields_set_updated_at
  before update on consultation_extracted_fields
  for each row execute function set_updated_at();

-- consultation_tasks: 후속조치 체크리스트. 상담과 무관하게(고객만 있는)
-- 만들 수도 있어야 하므로 consultation_id도 nullable로 둡니다. customer_id는
-- consultations와 같은 정책으로 on delete set null을 씁니다 — 고객 레코드가
-- 삭제되더라도(현재는 삭제 API가 없지만) 이미 만들어둔 후속조치 자체가
-- 조용히 사라지면 안 되기 때문입니다(consultation_id 쪽은 상담 레코드에
-- 종속된 하위 항목이라 cascade가 맞습니다 — transcripts/extracted_fields와
-- 동일한 정책).
create table if not exists consultation_tasks (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references consultations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  task_type text not null default 'general',
  description text not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_tasks_consultation_id_idx on consultation_tasks (consultation_id);
create index if not exists consultation_tasks_customer_id_idx on consultation_tasks (customer_id);
create index if not exists consultation_tasks_status_idx on consultation_tasks (status);

drop trigger if exists consultation_tasks_set_updated_at on consultation_tasks;
create trigger consultation_tasks_set_updated_at
  before update on consultation_tasks
  for each row execute function set_updated_at();

-- RLS만 켜고 정책은 하나도 만들지 않습니다(listing_submissions/
-- admin_sms_templates와 동일한 설계): anon/authenticated는 select/insert
-- 모두 기본 차단되고, 관리자 API(service_role)로만 접근합니다. 연락처·
-- 상담 내용 전부 PII이므로 공개 select 정책을 절대 두지 않습니다.
alter table customers enable row level security;
alter table consultations enable row level security;
alter table consultation_transcripts enable row level security;
alter table consultation_extracted_fields enable row level security;
alter table consultation_tasks enable row level security;
