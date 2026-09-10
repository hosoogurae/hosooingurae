-- contract_prep_items 개편: "계약 전날 안내 문자" 화면을 역할별 고정
-- 문구가 아니라 체크한 준비물만 반영하는 방식으로 바꾸면서 필요해진
-- 스키마 확장입니다.
--
-- 1) 공동명의·대리계약·법인계약 특수계약 준비물도 이 표에서 관리합니다
--    (새 테이블을 안 만들고 role 값 공간을 넓혀 재사용).
-- 2) default_checked: 항목마다 "기본으로 체크해 둘지"를 관리자가 직접
--    정할 수 있게 합니다. 지금까지는 "무조건 전체 체크"가 화면 코드에
--    박혀 있었습니다.
-- 3) OTP 문구·통장 사본을 없애고, 계좌 관련 안내 문구로 교체합니다.
-- 4) 등기권리증(등기필증)·인감도장·인감증명서(매도인), 등기권리증(임대인)을
--    제거합니다 — 이 화면은 "계약 전날" 전용이고, 이 서류들은 잔금·
--    소유권이전 단계 서류라 여기 기본 준비물에 섞으면 안 됩니다(추후
--    별도의 "잔금 안내 문자" 기능에서 새로 관리할 예정). 계약 이력과
--    연결된 데이터가 아니라 항목 마스터일 뿐이라 지워도 안전합니다.
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table contract_prep_items drop constraint if exists contract_prep_items_role_check;
alter table contract_prep_items add constraint contract_prep_items_role_check
  check (role in (
    '공통', '매수인', '매도인', '임차인', '임대인',
    '공동명의', '대리계약', '법인계약'
  ));

alter table contract_prep_items
  add column if not exists default_checked boolean not null default true;

-- OTP 문구 제거, 통장 사본 제거
delete from contract_prep_items where role = '공통' and label = '통장 사본';
delete from contract_prep_items where role = '매수인' and label = '계약금 이체 가능한 카드나 OTP';

-- 잔금·소유권이전 서류 제거(이 화면 범위 아님)
delete from contract_prep_items where role = '매도인' and label in ('등기권리증(등기필증)', '인감도장', '인감증명서');
delete from contract_prep_items where role = '임대인' and label = '등기권리증';

-- 계좌 관련 안내 문구 추가
insert into contract_prep_items (role, label, sort_order, default_checked) values
  ('매수인', '계좌이체 한도 확인', 1, true),
  ('임차인', '계좌이체 한도 확인', 1, true),
  ('매도인', '계약금을 수령할 본인 명의 계좌번호', 0, true),
  ('임대인', '계약금을 수령할 본인 명의 계좌번호', 0, true);

-- 이 마이그레이션과 무관하게 기존 데이터에 이미 있던 문제도 함께
-- 정리했습니다: 0026 시드가 과거에 두 번 실행된 흔적으로 신분증·도장·
-- 계약금(매수인)·계약금(임차인)이 각각 2행씩 있었습니다(생성 시각이
-- 21분 차이 남). 화면은 라벨 기준으로 중복 제거해서 보여주므로 겉으로는
-- 안 보였지만, 항목 관리(추가/수정/삭제/순서)에는 그대로 두 줄로 보여
-- 관리가 헷갈리는 문제가 있어 나중에 생성된 쪽을 지웠습니다.
delete from contract_prep_items a using contract_prep_items b
where a.role = b.role
  and a.label = b.label
  and a.created_at > b.created_at;
