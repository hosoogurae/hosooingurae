-- 상가 매물은 주거 단지에 속하지 않아도 등록할 수 있습니다.
-- 기존 행과 외래키는 유지하고 complex_id의 NOT NULL 제약만 완화합니다.
alter table listings alter column complex_id drop not null;
