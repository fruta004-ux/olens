-- deals 테이블에 거래 유형(건별/월정액) 관련 컬럼 추가
-- 기존 amount_range 컬럼은 그대로 유지 (총 금액 저장용으로 계속 사용)

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_type TEXT NOT NULL DEFAULT 'one_time';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS monthly_amount TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS duration_months INTEGER;

COMMENT ON COLUMN public.deals.deal_type IS '거래 유형: one_time(건별), recurring(월정액)';
COMMENT ON COLUMN public.deals.monthly_amount IS '월정액일 때 월 금액 (숫자 문자열, 콤마 포함 가능)';
COMMENT ON COLUMN public.deals.duration_months IS '월정액일 때 계약 개월 수';

-- clients 테이블에도 동일 컬럼 추가
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deal_type TEXT NOT NULL DEFAULT 'one_time';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS monthly_amount TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS duration_months INTEGER;
