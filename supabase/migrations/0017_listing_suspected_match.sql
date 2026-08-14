-- 매물 거래 의심 감지 — 확인 상태 저장용 컬럼
--
-- 실제 매칭 결과(어떤 실거래와 매칭됐는지, 날짜/금액/층)는 저장하지 않고
-- 매번 국토교통부 API에서 다시 계산합니다(app/lib/molit.ts가 이미 1시간
-- 캐시를 두고 있어 반복 호출 부담이 적습니다). 이 컬럼은 "관리자가 마지막으로
-- 확인한 시각"만 기록합니다 — 그 이후 날짜의 새 실거래가 나타나면 확인 상태가
-- 자동으로 풀리고 배지가 다시 뜹니다(app/lib/suspectedTransactionMatch.ts 참고).
--
-- 적용 방법: Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table listings
  add column if not exists suspected_match_acknowledged_at timestamptz;
