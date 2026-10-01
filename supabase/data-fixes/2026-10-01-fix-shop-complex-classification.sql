-- "단지내상가 단지상가1층" 단지와 그 매물이 아파트로 잘못 분류되어
-- 손님용 "아파트" 드롭다운에 상가가 섞여 나오던 문제를 바로잡습니다.
-- (2026-10-01 조사 기준, 조사 결과는 대화 기록 참고)
--
-- 스키마 변경 아님(값만 정정) — supabase/migrations/에는 안 넣었습니다.
-- Supabase 대시보드 > SQL Editor에서 위에서부터 순서대로 실행하세요.

-- ============================================================
-- 1) 확정 수정 2건 — 단지내상가 단지상가1층(단지 + 매물)
-- ============================================================

update listings set property_type = '상가'
  where id = '4-000-230-mu6smv4c' and property_type = '아파트';

update complexes set property_type = '상가'
  where id = '1-mu6smuyz' and property_type = '아파트';

-- 확인용 조회
select id, name, property_type from complexes where id = '1-mu6smuyz';
select id, complex_id, property_type, price_label from listings where id = '4-000-230-mu6smv4c';

-- ============================================================
-- 2) 유령 단지 "단지내상가1층"(id=1-mu4y4jge) 삭제
--    "단지내상가 단지상가1층"과 사실상 중복, 매물 0건.
-- ============================================================

-- 2-1) 삭제 전 확인: 이 단지에 매달린 것이 정말 아무것도 없는지
--      (listings는 FK가 RESTRICT라 뭔가 있으면 아래 DELETE 자체가
--      거부되지만, 사진/평면도는 CASCADE라 조용히 같이 지워지므로
--      미리 눈으로 확인합니다. 전부 0이어야 안전합니다.)
select count(*) as listings_count from listings where complex_id = '1-mu4y4jge';
select count(*) as floor_plan_images_count from floor_plan_images where complex_id = '1-mu4y4jge';
select count(*) as complex_images_count from complex_images where complex_id = '1-mu4y4jge';
select count(*) as unit_type_images_count from unit_type_images where complex_id = '1-mu4y4jge';

-- 2-2) 위 4개 조회가 전부 0건으로 나온 것을 확인한 뒤에만 아래를 실행하세요.
delete from complexes where id = '1-mu4y4jge';

-- 2-3) 삭제 확인(행이 없어야 정상)
select id, name, property_type from complexes where id = '1-mu4y4jge';
