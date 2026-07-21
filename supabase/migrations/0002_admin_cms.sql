-- /admin을 실제 운영용 매물 등록 관리 화면으로 만들기 위한 스키마 변경
--
-- 1) listings.property_type(매물종류): 아파트/오피스텔/상가 등, 거래유형과 별개로
--    "무엇을 파는지"를 나타내는 값. 기존 complexes.property_type("공동주택" 같은
--    법정 건축물 용도)과는 다른 개념이라 listings에 별도로 둡니다.
-- 2) listings.status: 임시저장(draft) / 공개(published). 관리자가 저장 시점에
--    바로 공개할지, 나중에 검토 후 공개할지 선택할 수 있게 합니다.
-- 3) complexes의 세부 정보(사용승인일, 세대수, 주차, 난방 등)를 nullable로 완화합니다.
--    관리자가 매물을 등록하며 "새 단지 추가"를 선택했을 때 단지명·주소만으로도
--    바로 등록할 수 있어야 하기 때문입니다(나머지는 나중에 보완 가능).
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings
  add column if not exists property_type text not null default '아파트'
    check (property_type in ('아파트', '오피스텔', '상가', '단독주택', '기타'));

alter table listings
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'published'));

create index if not exists listings_status_idx on listings (status);

alter table complexes alter column approval_date drop not null;
alter table complexes alter column total_households drop not null;
alter table complexes alter column buildings drop not null;
alter table complexes alter column parking_count drop not null;
alter table complexes alter column parking_per_household drop not null;
alter table complexes alter column heating drop not null;
alter table complexes alter column hallway_type drop not null;
alter table complexes alter column builder drop not null;
