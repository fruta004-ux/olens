-- settings 테이블의 니즈(needs) 항목에 서비스 타입 컬럼 추가
-- 마케팅, 홈페이지, ERP/커스텀 등 서비스 유형을 니즈별로 지정

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT NULL;

-- 인덱스 생성 (서비스 타입별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_settings_service_type ON public.settings(service_type);
