-- ─────────────────────────────────────────────────────────────
-- 계산서 발행 예정일 도입 (필터/소속월의 새 기준)
-- ─────────────────────────────────────────────────────────────
-- 배경: 명세서 요청서의 본질은 "이 달에 발행해야 하는 세금계산서 목록".
--   ex) 4월에 발행해야 하지만 입금 예정일은 5월 4일인 케이스 등이 자주 발생.
--   따라서 입금 예정일과 분리된 "계산서 발행 예정일"을 도입하고,
--   필터/소속월 기준을 이 컬럼으로 전환한다.

-- 1) project_specs: 계산서 발행 예정일 컬럼 추가
ALTER TABLE public.project_specs
  ADD COLUMN IF NOT EXISTS invoice_issue_due_date DATE;

CREATE INDEX IF NOT EXISTS idx_project_specs_invoice_issue_due_date
  ON public.project_specs(invoice_issue_due_date);

COMMENT ON COLUMN public.project_specs.invoice_issue_due_date
  IS '계산서 발행 예정일 (필터/소속월의 기준). 실제 발행한 날짜는 invoice_issue_date.';

-- 2) 기존 행 마이그레이션: 비어있으면 입금 예정일을 그대로 복사
UPDATE public.project_specs
SET    invoice_issue_due_date = payment_due_date
WHERE  invoice_issue_due_date IS NULL
  AND  payment_due_date IS NOT NULL;

-- 3) recurring_projects: 정기 마스터에 발행일/입금 시점 추가
--    - invoice_issue_day: 매월 계산서 발행일 (1~31)
--    - payment_offset_months: 입금 시점 — 0=당월, 1=익월
ALTER TABLE public.recurring_projects
  ADD COLUMN IF NOT EXISTS invoice_issue_day INT CHECK (invoice_issue_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS payment_offset_months INT NOT NULL DEFAULT 0
    CHECK (payment_offset_months IN (0, 1));

COMMENT ON COLUMN public.recurring_projects.invoice_issue_day
  IS '매월 계산서 발행일 (1~31). 그 달에 그 일자가 없으면 말일로 보정.';
COMMENT ON COLUMN public.recurring_projects.payment_offset_months
  IS '입금 시점: 0=발행 당월, 1=발행 익월. (대부분 0=당월)';
