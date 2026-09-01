-- 네이버 단지정보에서 확인한 관리사무소 및 관리비 정보.
-- 관리비는 원문을 보존하고 숫자 변환값과 기준연월을 별도로 저장합니다.
alter table complexes
  add column if not exists management_office_phone text,
  add column if not exists management_fee_won integer,
  add column if not exists management_fee_raw text,
  add column if not exists management_fee_as_of text;
