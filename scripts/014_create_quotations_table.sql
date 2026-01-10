-- quotations 테이블 생성
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  quotation_number TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL DEFAULT '플루타', -- 플루타 / 오코랩스
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- [{name, quantity, unit_price, amount}, ...]
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  supply_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 공급가액
  vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- 부가세
  valid_until DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT '작성중', -- 작성중/발송완료/승인/거절
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_quotations_deal_id ON quotations(deal_id);
CREATE INDEX idx_quotations_activity_id ON quotations(activity_id);
CREATE INDEX idx_quotations_company ON quotations(company);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotations_updated_at
BEFORE UPDATE ON quotations
FOR EACH ROW
EXECUTE FUNCTION update_quotations_updated_at();

-- RLS 활성화
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 읽기/쓰기 가능 (인증 필요)
CREATE POLICY "Enable read access for all users" ON quotations
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON quotations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON quotations
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON quotations
  FOR DELETE USING (true);
