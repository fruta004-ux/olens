-- deals 테이블에 계약 확정 정보 컬럼 추가
-- JSONB로 저장: { target, name, status, needs, inflow_source, conditions, cost, invoice_date, contract_date, work_start_date, notes }
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS contract_info JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_info JSONB;
