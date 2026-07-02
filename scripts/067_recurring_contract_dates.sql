-- 정기 프로젝트에 계약 시작일/종료일 추가
-- 월별 업무 현황 목록에서 계약 시작/종료를 표기하기 위함.
-- (회차 진행 날짜는 payment_day 로부터 파생 표시)

ALTER TABLE public.recurring_projects
  ADD COLUMN IF NOT EXISTS contract_start_date DATE;

ALTER TABLE public.recurring_projects
  ADD COLUMN IF NOT EXISTS contract_end_date DATE;
