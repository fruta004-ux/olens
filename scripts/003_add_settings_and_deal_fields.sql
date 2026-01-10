-- 설정 테이블 생성 (니즈 축약, 유입 경로, 문의 창구 항목 관리)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'needs', 'source', 'channel'
  value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- deals 테이블에 4개 컬럼 추가
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS needs_summary TEXT,
  ADD COLUMN IF NOT EXISTS inflow_source TEXT,
  ADD COLUMN IF NOT EXISTS inquiry_channel TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT;

-- settings 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_settings_category ON public.settings(category);

-- RLS 활성화
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 초기 데이터 (예시)
INSERT INTO public.settings (category, value, display_order) VALUES
  ('needs', '제품 문의', 1),
  ('needs', '서비스 문의', 2),
  ('needs', '파트너십', 3),
  ('source', '웹사이트', 1),
  ('source', '추천', 2),
  ('source', '광고', 3),
  ('channel', '전화', 1),
  ('channel', '이메일', 2),
  ('channel', '채팅', 3)
ON CONFLICT DO NOTHING;
