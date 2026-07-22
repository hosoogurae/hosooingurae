-- 평면도(floor_plan_images)에 전용면적을 추가해, 매물 원문에서 파싱된
-- 전용면적과 자동으로 매칭할 수 있게 합니다.
--
-- 기존에 올린 평면도에는 값이 없으므로 nullable로 추가합니다. 값이 없는
-- 평면도는 자동 매칭 대상에서 제외되고(있는 값끼리만 비교), 관리자가
-- /admin/floor-plans에서 나중에 채워 넣을 수 있습니다. 기존 행을 지우거나
-- 건드리지 않습니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table floor_plan_images add column if not exists exclusive_area numeric;
