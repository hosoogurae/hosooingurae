-- 가져오기 시 unitType 자동 매칭을 공급면적+전용면적 둘 다 비교하도록
-- 개선하기 위해 공급면적 컬럼을 추가합니다. 기존 행은 값이 없어도 되며
-- (nullable), 값이 없는 평면도는 자동 매칭 비교 대상에서 제외됩니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table floor_plan_images add column if not exists supply_area numeric;
