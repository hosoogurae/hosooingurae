-- 단지 삭제 시 매물이 소리 없이 함께 삭제되는 사고를 막습니다. 현재 관리자
-- 화면에 단지를 지우는 기능 자체가 없어 이 변경은 기존 동작에 영향이 없고,
-- 수동/SQL 삭제 실수에 대한 안전장치로만 작동합니다. 매물이 남아있는 단지를
-- 지우려 하면 이제 DB가 즉시 에러를 냅니다(먼저 매물을 다른 단지로 옮기거나
-- 지운 뒤에만 단지를 지울 수 있음).
alter table listings drop constraint listings_complex_id_fkey;
alter table listings
  add constraint listings_complex_id_fkey
  foreign key (complex_id) references complexes(id) on delete restrict;
