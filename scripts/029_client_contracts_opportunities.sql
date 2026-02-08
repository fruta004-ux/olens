-- 기존 거래처 계약 이력 테이블
CREATE TABLE IF NOT EXISTS public.client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type TEXT,
  contract_name TEXT NOT NULL,
  contract_amount TEXT,
  contract_date DATE,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '만료')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기존 거래처 영업 기회 테이블
CREATE TABLE IF NOT EXISTS public.client_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('업셀', '크로스셀', '재계약')),
  title TEXT NOT NULL,
  description TEXT,
  expected_amount TEXT,
  probability TEXT DEFAULT '중간' CHECK (probability IN ('높음', '중간', '낮음')),
  target_date DATE,
  status TEXT DEFAULT '발굴' CHECK (status IN ('발굴', '제안중', '협상중', '성사', '무산')),
  related_contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_client_contracts_client_id ON public.client_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_end_date ON public.client_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_client_opportunities_client_id ON public.client_opportunities(client_id);

-- RLS 활성화
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Allow all access to client_contracts" ON public.client_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_opportunities" ON public.client_opportunities FOR ALL USING (true) WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_client_contracts_updated_at BEFORE UPDATE ON public.client_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_opportunities_updated_at BEFORE UPDATE ON public.client_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- settings에 서비스 종류 초기 데이터 추가
INSERT INTO public.settings (category, value, display_order) VALUES
  ('service_type', '웹 개발', 1),
  ('service_type', '앱 개발', 2),
  ('service_type', '유지보수', 3),
  ('service_type', '컨설팅', 4),
  ('service_type', 'UI/UX 디자인', 5),
  ('service_type', '기타', 6)
ON CONFLICT DO NOTHING;
