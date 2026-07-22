-- 평면도 썸네일용 미리보기 이미지 URL 추가.
--
-- 업로드된 평면도 원본은 상단 정보 배너(면적배지/key map/면적표)와 탭 메뉴까지
-- 포함한 전체 캡처라, 실제 3D 도면은 이미지의 아래쪽 일부만 차지합니다. 원본은
-- 그대로 보존하고(확대 시 원본 전체를 보여줌), 카드/썸네일에는 상단 배너를
-- 잘라낸 미리보기 이미지를 따로 만들어 저장합니다. 미리보기가 없으면(과거
-- 데이터 등) 원본을 그대로 씁니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table floor_plan_images add column if not exists preview_url text;

NOTIFY pgrst, 'reload schema';
