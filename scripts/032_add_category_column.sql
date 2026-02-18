-- deals 테이블에 category (항목 분류) 컬럼 추가
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- clients 테이블에 category (항목 분류) 컬럼 추가
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_deals_category ON public.deals(category);
CREATE INDEX IF NOT EXISTS idx_clients_category ON public.clients(category);

-- settings에 category 초기 데이터 추가 (순서: 마케팅, 홈페이지, 디자인, 개발, 영상)
INSERT INTO public.settings (category, value, display_order) VALUES
  ('deal_category', '마케팅', 1),
  ('deal_category', '홈페이지', 2),
  ('deal_category', '디자인', 3),
  ('deal_category', '개발', 4),
  ('deal_category', '영상', 5)
ON CONFLICT DO NOTHING;
