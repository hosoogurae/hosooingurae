-- 매물 융자 정보(has_loan, loan_amount)
--
-- has_loan: 융자 유무. 기존 매물은 전부 false로 마이그레이션합니다.
-- loan_amount: 융자금 원문 문자열 그대로 보관합니다(숫자로 변환하지 않음 —
--   네이버 표기가 "1억 5,000만원", "1.5억", "없음" 등 제각각이라 숫자 변환은
--   파싱 실패 위험이 큽니다). has_loan이 false면 항상 null입니다.
--
-- 기존 데이터/컬럼은 전혀 건드리지 않는 add column만 사용합니다.
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings
  add column if not exists has_loan boolean not null default false;

alter table listings
  add column if not exists loan_amount text;
