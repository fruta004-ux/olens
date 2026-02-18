-- 기존 거래처 CRM 고도화: 스키마 변경

-- 1. deals 테이블에 linked_client_id 추가
-- 거래 완료(S5) 시 어떤 기존 거래처에 연결되었는지 기록
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS linked_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.deals.linked_client_id IS '계약완료 시 연결된 기존 거래처 ID';

-- 2. client_opportunities 테이블에 converted_deal_id 추가
-- 영업 기회가 성사되어 신규 거래로 전환된 경우 연결
ALTER TABLE public.client_opportunities ADD COLUMN IF NOT EXISTS converted_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.client_opportunities.converted_deal_id IS '성사되어 전환된 거래 ID';

-- 3. client_activities 테이블에 opportunity_id 추가
-- 활동을 특정 영업 기회에 연결 (선택적)
ALTER TABLE public.client_activities ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.client_opportunities(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.client_activities.opportunity_id IS '연결된 영업 기회 ID (선택적)';

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_deals_linked_client_id ON public.deals(linked_client_id);
CREATE INDEX IF NOT EXISTS idx_deals_account_id ON public.deals(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_account_id ON public.clients(account_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_opportunity_id ON public.client_activities(opportunity_id);
