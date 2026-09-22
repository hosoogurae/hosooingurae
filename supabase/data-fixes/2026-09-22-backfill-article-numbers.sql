-- 매물번호(article_number) 소급 채우기 — 원문(raw_source_text)에는 이미 있는데
-- article_number 컬럼이 비어 있던 8건만 대상입니다. 값은 각 매물의
-- raw_source_text에서 "매물번호" 라벨 뒤 숫자를 그대로 옮긴 것이고,
-- 지어낸 값은 없습니다(2026-09-22 조사 기준).
--
-- 스키마 변경 아님(컬럼은 이미 존재) — 데이터 한 번만 정정하는 스크립트라
-- supabase/migrations/에 넣지 않았습니다. Supabase 대시보드 > SQL Editor에
-- 붙여넣고 실행하세요.
--
-- 각 UPDATE에 article_number IS NULL 조건을 같이 걸어서, 혹시 그 사이에
-- 다른 경로로 값이 채워졌다면 덮어쓰지 않습니다.

update listings set article_number = '2638604402'
  where id = '102-1-mrunh4cp' and article_number is null;

update listings set article_number = '2638547195'
  where id = 'e-2-209-3-mrulnjry' and article_number is null;

update listings set article_number = '2639425509'
  where id = 'e-2-204-9-mrvvn07y' and article_number is null;

update listings set article_number = '2639373746'
  where id = 'e-2-203-18-mrvvc1b5' and article_number is null;

update listings set article_number = '2640443261'
  where id = '4-2-500-ms5zrr6m' and article_number is null;

update listings set article_number = '2638580191'
  where id = '304-14-mrun8fc2' and article_number is null;

update listings set article_number = '2640537591'
  where id = '4-1-193-ms5ztp63' and article_number is null;

update listings set article_number = '2640666264'
  where id = '4-6-000-ms5wawuc' and article_number is null;

-- 실행 후 확인용 조회 — 위 8건의 id·단지명·동·article_number가
-- 전부 의도한 값으로 채워졌는지 눈으로 확인하세요.
select
  l.id,
  c.name as complex_name,
  l.building,
  l.article_number
from listings l
join complexes c on c.id = l.complex_id
where l.id in (
  '102-1-mrunh4cp',
  'e-2-209-3-mrulnjry',
  'e-2-204-9-mrvvn07y',
  'e-2-203-18-mrvvc1b5',
  '4-2-500-ms5zrr6m',
  '304-14-mrun8fc2',
  '4-1-193-ms5ztp63',
  '4-6-000-ms5wawuc'
)
order by l.id;
