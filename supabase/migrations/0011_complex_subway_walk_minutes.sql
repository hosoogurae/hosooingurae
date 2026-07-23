-- 지하철역까지 도보 시간(분)을 정수로 저장합니다. 기존 subway/subway_distance
-- 텍스트 컬럼은 표시용으로 그대로 두고, 이 컬럼만 "역 가까움" 추천 판정에 씁니다.
-- 값이 없으면(NULL) 절대 추측하지 않고 "모름"으로 처리합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table complexes add column if not exists subway_walk_minutes integer;

-- 기존 subway_distance 텍스트에서 이미 확인한 도보 분 수를 그대로 백필합니다.
update complexes set subway_walk_minutes = 12 where id = 'hosumaeul-epyeonhansesang-2';   -- "약 664m, 도보 약 12분"
update complexes set subway_walk_minutes = 13 where id = 'complex-mrun7fdl';               -- 김포한강아이파크, "도보 약 13분"
update complexes set subway_walk_minutes = 11 where id = 'complex-mrunguw2';               -- 레이크에일린의뜰, "도보 약 11분"
update complexes set subway_walk_minutes = 17 where id = 'complex-mrvvxx69';               -- 한강힐스테이트, "도보 약 17분"
-- 호수마을3단지(e-3-mrvvu1cx)는 원래 지하철 정보 자체가 없어 NULL(모름)로 둡니다.

NOTIFY pgrst, 'reload schema';
