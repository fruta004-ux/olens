-- ============================================================================
-- 055_signature_requests.sql
-- ----------------------------------------------------------------------------
-- 자체 전자서명 시스템 Phase 1 — 계약서 서명 요청 + 거래처 도장 업로드
--
-- 흐름:
--   1. 영업이 계약서 상세에서 "서명 요청 보내기" 클릭
--   2. signature_requests 에 토큰 생성 (7일 만료) → 거래처 이메일로 링크 발송
--   3. 거래처가 /sign/[token] 접속 → 도장 업로드 → 서명 완료
--   4. contracts.client_seal_url 저장 + signature_requests.status='signed'
--   5. inquiry_inbox 에 알림 INSERT (CRM 헤더 종에 표시)
-- ============================================================================

-- 1. signature_requests 테이블
CREATE TABLE IF NOT EXISTS public.signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,

  -- 수신자
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- 토큰 (공개 URL 에 노출됨. UUID v4 무작위)
  token TEXT NOT NULL UNIQUE,

  -- 영업이 함께 보낼 메시지
  message TEXT,

  -- 상태: pending(발송 후 대기) / signed(서명 완료) / expired(만료) / cancelled(취소)
  status TEXT NOT NULL DEFAULT 'pending',

  -- 시간 추적
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,                 -- 거래처가 처음 열어본 시각
  signed_at TIMESTAMPTZ,                 -- 서명 완료 시각

  -- 감사 로그 (분쟁 대비)
  signer_ip TEXT,
  signer_user_agent TEXT,
  signature_image_url TEXT,              -- 업로드된 도장 이미지 URL

  -- 메타
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sig_req_token ON public.signature_requests(token);
CREATE INDEX IF NOT EXISTS idx_sig_req_contract ON public.signature_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_sig_req_status_expires ON public.signature_requests(status, expires_at);

COMMENT ON TABLE public.signature_requests IS '계약서 전자서명 요청 (자체 시스템)';
COMMENT ON COLUMN public.signature_requests.token IS '공개 URL 토큰 — UUID v4';
COMMENT ON COLUMN public.signature_requests.status IS 'pending / signed / expired / cancelled';

-- 2. contracts 테이블에 갑(거래처) 측 서명 정보 컬럼 추가
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_seal_url TEXT,
  ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_signature_request_id UUID REFERENCES public.signature_requests(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contracts.client_seal_url IS '갑(거래처) 측 서명/도장 이미지 URL';

-- 3. RLS — signature_requests 는 인증된 사용자만 접근 (외부 토큰 검증은 service_role 로 처리)
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select" ON public.signature_requests;
DROP POLICY IF EXISTS "authenticated_insert" ON public.signature_requests;
DROP POLICY IF EXISTS "authenticated_update" ON public.signature_requests;
DROP POLICY IF EXISTS "authenticated_delete" ON public.signature_requests;

CREATE POLICY "authenticated_select" ON public.signature_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.signature_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.signature_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.signature_requests
  FOR DELETE TO authenticated USING (true);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sig_req_updated_at ON public.signature_requests;
CREATE TRIGGER trg_sig_req_updated_at
  BEFORE UPDATE ON public.signature_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_signature_requests_updated_at();

-- ============================================================================
-- 5. Storage 버킷 — 'signature-uploads' (수동 생성 필요)
-- ----------------------------------------------------------------------------
-- 대시보드에서 'signature-uploads' (Public bucket) 을 만들어 주세요.
-- 그 후 아래 정책을 SQL Editor 에서 실행 — 공개 페이지에서 anon 도 업로드 가능해야 함.
-- (토큰 검증은 API 서버에서 service_role 로 처리하므로, anon 의 random INSERT 는 의미 없음)
-- ============================================================================

-- signature-uploads 버킷용 정책 (서명 페이지는 미인증 anon 으로 접근하므로 anon INSERT 허용)
DROP POLICY IF EXISTS "signature_uploads_insert" ON storage.objects;
CREATE POLICY "signature_uploads_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'signature-uploads');

-- 조회는 누구나 (이미지 URL 로 보임)
DROP POLICY IF EXISTS "signature_uploads_select" ON storage.objects;
CREATE POLICY "signature_uploads_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'signature-uploads');

-- ============================================================================
-- 검증 쿼리
-- ----------------------------------------------------------------------------
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'signature_requests';
-- SELECT * FROM signature_requests ORDER BY created_at DESC LIMIT 5;
-- ============================================================================
