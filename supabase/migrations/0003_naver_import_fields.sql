-- 네이버 매물 텍스트 붙여넣기 가져오기 기능을 위한 컬럼 추가
--
-- source_type: 매물 정보의 출처 구분('naver' 등). 수동 등록 매물은 null.
-- source_article_id: 네이버 매물 URL의 articleNo. URL을 입력하고 거기서
--   articleNo를 추출할 수 있었던 경우에만 값이 채워집니다. 텍스트만 붙여넣었거나
--   URL 형식이 달라 추출하지 못한 경우에는 null로 남겨두며, null은 여러 건
--   허용됩니다(중복 검사는 값이 있는 경우에만 의미가 있으므로).
-- raw_source_text: 관리자가 붙여넣은 원문 전체 보관용. 관리자 화면에서만
--   노출되며, 공개 API·홈페이지 응답에는 애플리케이션 코드에서 제외합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings add column if not exists source_type text;
alter table listings add column if not exists source_article_id text;
alter table listings add column if not exists raw_source_text text;

-- source_article_id가 있는 행끼리만 유일해야 하고, null은 여러 개 허용합니다
-- (partial unique index: null 값인 행은 인덱스에 아예 포함되지 않음).
create unique index if not exists listings_source_article_id_unique
  on listings (source_article_id)
  where source_article_id is not null;
