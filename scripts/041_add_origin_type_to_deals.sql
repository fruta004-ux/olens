-- deals 테이블에 origin_type 추가 (업셀/크로스셀/재계약 등 전환 유형)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS origin_type TEXT;
COMMENT ON COLUMN public.deals.origin_type IS '거래 유래 유형: 업셀, 크로스셀, 재계약 (영업기회에서 전환 시 자동 설정)';
