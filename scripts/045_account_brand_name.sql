-- accounts 테이블에 브랜드명 추가
-- 사업상 통용되는 명칭 (상호와 다를 수 있음)
-- 보통 거래처명(상호) 보다 브랜드명으로 호명되는 경우가 많아서, "거래처명 (브랜드명)" 형태로 함께 표시

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS brand_name TEXT;
COMMENT ON COLUMN public.accounts.brand_name IS '브랜드명 (상호와 별개로 통용되는 사업상 명칭, 옵션)';

-- 검색 성능을 위해 인덱스 추가 (대소문자 무시 LIKE 검색용)
CREATE INDEX IF NOT EXISTS idx_accounts_brand_name_lower
  ON public.accounts (LOWER(brand_name))
  WHERE brand_name IS NOT NULL AND brand_name <> '';

-- (선택) 기존 company_name 도 검색 인덱스가 없으면 함께 추가
CREATE INDEX IF NOT EXISTS idx_accounts_company_name_lower
  ON public.accounts (LOWER(company_name));
