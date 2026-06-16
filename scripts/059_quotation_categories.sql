-- 견적서/프리셋 카테고리 지원
-- 1) 카테고리 마스터 테이블 (빈 카테고리 생성/이름 관리 가능)
CREATE TABLE IF NOT EXISTS public.quotation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화 (아래 정책으로 anon/authenticated 키 접근 허용)
ALTER TABLE public.quotation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON public.quotation_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.quotation_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.quotation_categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.quotation_categories FOR DELETE USING (true);

-- 2) 프리셋/견적서에 카테고리 이름(텍스트) 컬럼 추가
ALTER TABLE quotation_presets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_quotation_presets_category ON quotation_presets(category);
CREATE INDEX IF NOT EXISTS idx_quotations_category ON quotations(category);
