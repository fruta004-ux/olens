-- client_contracts에 계약 확정 전체 정보 JSONB 컬럼 및 연결 deal ID 추가

ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS contract_info JSONB;
COMMENT ON COLUMN public.client_contracts.contract_info IS '거래 확정 시 입력한 전체 계약 정보 (대상, 명칭, 현황, 니즈, 유입경로, 조건, 비용, 날짜, 결정사유, 비고 등)';

ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS linked_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.client_contracts.linked_deal_id IS '계약에 연결된 거래(deal) ID';

CREATE INDEX IF NOT EXISTS idx_client_contracts_linked_deal_id ON public.client_contracts(linked_deal_id);
