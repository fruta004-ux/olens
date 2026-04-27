-- accounts 테이블에 사업자등록증 관련 컬럼 추가
-- OCR로 자동 채워지며 사용자가 수동 검증/수정 가능

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS corporate_number TEXT;
COMMENT ON COLUMN public.accounts.corporate_number IS '법인등록번호 (사업자등록증)';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS opening_date DATE;
COMMENT ON COLUMN public.accounts.opening_date IS '개업일자 (사업자등록증)';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS business_type TEXT;
COMMENT ON COLUMN public.accounts.business_type IS '업태 (사업자등록증)';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS business_item TEXT;
COMMENT ON COLUMN public.accounts.business_item IS '종목 (사업자등록증)';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS head_office_address TEXT;
COMMENT ON COLUMN public.accounts.head_office_address IS '본점 소재지 (사업자등록증)';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS issue_date DATE;
COMMENT ON COLUMN public.accounts.issue_date IS '사업자등록증 발급일';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tax_type TEXT;
COMMENT ON COLUMN public.accounts.tax_type IS '과세 유형 (예: 일반과세자, 간이과세자, 면세사업자, 법인사업자)';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS business_registration_url TEXT;
COMMENT ON COLUMN public.accounts.business_registration_url IS '업로드된 사업자등록증 이미지 Public URL';

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS business_registration_ocr JSONB;
COMMENT ON COLUMN public.accounts.business_registration_ocr IS 'OCR 원본 결과 (검증/디버깅용)';

-- ============================================================
-- 수동 적용 안내
-- ============================================================
-- Supabase Storage 콘솔에서 'business-registrations' 버킷을 생성해야 합니다.
--   1) Dashboard → Storage → New bucket
--   2) name: business-registrations
--   3) public: ON (Public bucket - 이미지 미리보기용)
--   4) RLS는 anon에게도 read/insert 가능하도록 정책 추가 (또는 public 모드)
-- ============================================================
