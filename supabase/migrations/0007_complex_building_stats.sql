-- 단지정보 상세 항목(최고층/용적률/건폐율) 추가.
-- 기존 컬럼(approval_date, total_households, buildings, parking_count 등)만으로는
-- 부족해서 관리자가 실제 확인한 값을 채워 넣을 수 있도록 컬럼을 늘립니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table complexes add column if not exists max_floor integer;
alter table complexes add column if not exists floor_area_ratio numeric;
alter table complexes add column if not exists building_coverage_ratio numeric;

NOTIFY pgrst, 'reload schema';
