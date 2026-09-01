-- 단지 이름 중복 생성 재발 방지(2단계). name_normalized는 소문자화 +
-- 공백/특수문자 제거한 값을 자동 계산하는 generated column입니다
-- (app/lib/complexNameNormalize.ts의 normalizeComplexName과 동일한 규칙 —
-- 그 함수를 바꾸면 이 컬럼 정의도 함께 맞춰야 합니다). 이 컬럼에 unique
-- 인덱스를 걸어, 표기만 다르고(공백·괄호 등) 사실상 같은 이름의 단지가
-- 두 번 insert되면 DB가 최종적으로 막습니다.
--
-- 적용 전 기존 중복 9건(3그룹)을 정리했습니다(2026-09-01, complexes_backup_20260901
-- / listings_backup_20260901에 정리 전 스냅샷 보관) — 중복이 남아 있으면
-- 이 마이그레이션 자체가 실패합니다.

alter table complexes
  add column name_normalized text generated always as (
    regexp_replace(lower(name), '[^[:alnum:]]', '', 'g')
  ) stored;

create unique index complexes_name_normalized_key on complexes (name_normalized);
