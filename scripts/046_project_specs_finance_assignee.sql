-- project_specs 테이블에 재무 담당자 컬럼 추가
-- assigned_to (영업 담당자)는 이미 존재하므로 그대로 사용
-- finance_assigned_to: 재무/계산서 발행 담당자 (옵션, free text)

ALTER TABLE public.project_specs
  ADD COLUMN IF NOT EXISTS finance_assigned_to TEXT;

COMMENT ON COLUMN public.project_specs.finance_assigned_to
  IS '재무 담당자 (계산서 발행/입금 확인 담당, 추후 관리자 페이지에서 CRUD 예정)';

-- 필터링 성능을 위해 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_project_specs_finance_assigned_to
  ON public.project_specs (finance_assigned_to)
  WHERE finance_assigned_to IS NOT NULL;
