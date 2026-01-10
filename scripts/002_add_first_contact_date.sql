-- 거래 테이블에 첫 문의 날짜 컬럼 추가
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS first_contact_date DATE;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deals_first_contact_date ON public.deals(first_contact_date);
