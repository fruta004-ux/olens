-- 회차 시작일 컬럼 신설
-- payment_day 는 "매월 입금 예정일"이라 회차(업무 사이클) 시작일과 다르다.
-- (예: 로이스테일러 — 입금 31일, 회차는 01일~31일)
-- 월별 업무 현황의 회차 계산은 cycle_start_day → 계약시작일의 일자 → payment_day 순으로 폴백.

ALTER TABLE public.recurring_projects
  ADD COLUMN IF NOT EXISTS cycle_start_day INT CHECK (cycle_start_day BETWEEN 1 AND 31);
