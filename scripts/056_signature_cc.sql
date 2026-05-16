-- ============================================================================
-- 056_signature_cc.sql
-- ----------------------------------------------------------------------------
-- signature_requests 에 참조(CC) 수신자 목록 컬럼 추가.
-- 발송 시점에 누구에게 같이 보냈는지 감사 로그용으로 보관.
-- ============================================================================

ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS cc_emails JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.signature_requests.cc_emails IS '참조(CC) 수신자 이메일 배열';
