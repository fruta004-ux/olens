-- 프로젝트 명세서 요청서 테이블
-- S5 계약완료 시 자동 생성되며, 사용자가 수동으로 수정/추가 가능

CREATE TABLE IF NOT EXISTS public.project_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 거래처 / 계약 / 거래 연결
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  linked_contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  linked_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,

  -- 명세서 본문
  category TEXT CHECK (category IN ('마케팅', '홈페이지', '개발', '그 외')) DEFAULT '그 외',
  project_name TEXT,
  cost_type TEXT CHECK (cost_type IN ('계약금', '중도금', '완납금', '일괄 완납금', '월 대행비')) DEFAULT '일괄 완납금',
  amount NUMERIC(15, 0),
  payment_due_date DATE,
  progress_status TEXT CHECK (progress_status IN ('작성대기', '작성필요', '작성완료')) DEFAULT '작성필요',
  invoice_issue_date DATE,
  invoice_status TEXT CHECK (invoice_status IN ('발행필요', '발행대기', '발행완료', '카드결제')) DEFAULT '발행필요',
  notes TEXT,
  assigned_to TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_specs_client_id ON public.project_specs(client_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_account_id ON public.project_specs(account_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_linked_contract_id ON public.project_specs(linked_contract_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_linked_deal_id ON public.project_specs(linked_deal_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_payment_due_date ON public.project_specs(payment_due_date);
CREATE INDEX IF NOT EXISTS idx_project_specs_invoice_status ON public.project_specs(invoice_status);

ALTER TABLE public.project_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to project_specs" ON public.project_specs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_project_specs_updated_at BEFORE UPDATE ON public.project_specs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.project_specs IS '프로젝트 명세서 요청서 - 계약완료 시점에 자동 생성되며 비용 종류별로 행이 분리됨';
COMMENT ON COLUMN public.project_specs.category IS '카테고리: 마케팅, 홈페이지, 개발, 그 외';
COMMENT ON COLUMN public.project_specs.cost_type IS '비용 종류: 계약금, 중도금, 완납금, 일괄 완납금, 월 대행비';
COMMENT ON COLUMN public.project_specs.amount IS '금액(VAT 별도)';
COMMENT ON COLUMN public.project_specs.progress_status IS '진행상황: 작성대기, 작성필요, 작성완료';
COMMENT ON COLUMN public.project_specs.invoice_status IS '계산서: 발행필요, 발행대기, 발행완료, 카드결제';
