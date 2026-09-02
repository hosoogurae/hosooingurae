-- complexes.property_type이 listings.property_type과 다른 값 체계로 다시
-- 흩어지는 걸 막습니다. listings의 CHECK 제약과 완전히 동일한 값 목록을
-- 씁니다(app/data/listings.ts의 PropertyType과 동일 — 그 타입을 바꾸면 이
-- 제약도 함께 맞춰야 합니다).
--
-- 반드시 기존 '공동주택' 값을 정리(2026-09-02, hosumaeul-epyeonhansesang-2 →
-- '아파트')한 뒤에만 적용 가능합니다 — 정리 전에 걸면 이 마이그레이션 자체가
-- 실패합니다.
alter table complexes
  add constraint complexes_property_type_check
  check (property_type = any (array['아파트','오피스텔','상가','단독주택','기타']));
