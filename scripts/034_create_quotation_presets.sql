-- 견적서 프리셋 테이블
CREATE TABLE IF NOT EXISTS public.quotation_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '플루타',
  title TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_presets_name ON quotation_presets(name);

ALTER TABLE quotation_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON quotation_presets FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON quotation_presets FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON quotation_presets FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON quotation_presets FOR DELETE USING (true);
