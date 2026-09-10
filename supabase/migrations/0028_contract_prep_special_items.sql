-- 특수계약(공동명의·대리계약·법인계약) 준비물 기본 항목을 채웁니다.
-- 0027에서 role 종류만 넓혀두고 항목은 비워뒀던 부분입니다.
--
-- 여기 넣는 목록은 일반적으로 통용되는 기준이며 실무 확인 전입니다.
-- 그래서 모든 항목을 default_checked = false로 넣습니다 — 특수계약은
-- 해당 계약에서만 쓰는 예외 항목이라, 기본으로 체크돼 있으면 오히려
-- 방해가 됩니다. 화면(항목 관리)에서 라벨 수정·삭제·순서변경·
-- default_checked 조정이 바로 반영되므로, 실무 확인 후에는 코드 수정 없이
-- 이 화면에서 고치면 됩니다.
--
-- 1) insert는 (role, label)이 이미 있으면 건너뜁니다 — 0026 시드가
--    두 번 실행돼 항목이 중복됐던 사고(0027에서 정리)가 이 마이그레이션이
--    실수로 두 번 적용돼도 재발하지 않도록 합니다.
-- 2) (role, label) unique 제약을 새로 겁니다. 적용 전 직접 조회해서
--    현재 데이터에 (role, label) 중복이 없는 것을 확인했습니다
--    (중복이 있으면 제약 생성이 실패하므로, 먼저 정리 → 그다음 제약
--    순서를 지킵니다). 이 제약이 생기면 항목 관리 화면에서 실수로
--    같은 이름을 두 번 추가하는 것도 DB 레벨에서 막힙니다.
--
-- 0027에서 만든 기존 8개 행(공통/매수인/매도인/임차인/임대인)은 건드리지
-- 않습니다 — 이 마이그레이션은 새 14개 행을 추가하는 것뿐입니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

insert into contract_prep_items (role, label, sort_order, default_checked)
select v.role, v.label, v.sort_order, v.default_checked
from (values
  ('공동명의', '공동명의자 전원의 신분증', 0, false),
  ('공동명의', '공동명의자 전원의 도장', 1, false),
  ('공동명의', '불참자가 있는 경우 위임장과 인감증명서', 2, false),

  ('대리계약', '위임장 (인감 날인)', 0, false),
  ('대리계약', '위임인 인감증명서 (3개월 이내)', 1, false),
  ('대리계약', '위임인 신분증 사본', 2, false),
  ('대리계약', '대리인 신분증', 3, false),
  ('대리계약', '대리인 도장', 4, false),

  ('법인계약', '법인등기부등본', 0, false),
  ('법인계약', '법인인감증명서', 1, false),
  ('법인계약', '법인인감도장', 2, false),
  ('법인계약', '사업자등록증 사본', 3, false),
  ('법인계약', '대표이사 신분증', 4, false),
  ('법인계약', '대리인이 오는 경우 위임장', 5, false)
) as v(role, label, sort_order, default_checked)
where not exists (
  select 1 from contract_prep_items existing
  where existing.role = v.role and existing.label = v.label
);

alter table contract_prep_items
  add constraint contract_prep_items_role_label_key unique (role, label);
