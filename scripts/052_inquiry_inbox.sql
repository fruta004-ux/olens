-- 외부(아임웹 카톡 알림 → MacroDroid → webhook) 수신함 테이블
-- 자동 CRM 등록은 하지 않고, 알림으로만 표시. 사용자가 검토 후 빠른 등록 등으로 처리.

CREATE TABLE IF NOT EXISTS public.inquiry_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 어디서 왔는지
  source TEXT NOT NULL DEFAULT 'kakao_imweb',  -- 향후 'kakao_etc', 'email', 'web' 등 확장 가능
  app_package TEXT,                             -- 예: com.kakao.talk

  -- 원본
  raw_title TEXT,
  raw_text TEXT NOT NULL,

  -- 파싱된 필드 (best-effort, 실패해도 원본은 보존)
  parsed_email TEXT,
  parsed_phone TEXT,
  parsed_field TEXT,    -- 문의 분야 (예: 웹사이트)
  parsed_budget TEXT,   -- 견적 범위 (예: 100~200만원)

  -- 상태
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by TEXT,

  -- 부가
  meta JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_inbox_received_at ON public.inquiry_inbox (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiry_inbox_unread     ON public.inquiry_inbox (is_read) WHERE is_read = FALSE;

ALTER TABLE public.inquiry_inbox ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자(또는 anon) 접근 허용 — 운영 정책 따라 조정 가능
CREATE POLICY "Allow all access to inquiry_inbox"
  ON public.inquiry_inbox FOR ALL
  USING (true) WITH CHECK (true);

COMMENT ON TABLE  public.inquiry_inbox       IS '외부 채널(카톡 등)에서 들어온 문의 알림 수신함';
COMMENT ON COLUMN public.inquiry_inbox.source         IS '수신 채널: kakao_imweb 등';
COMMENT ON COLUMN public.inquiry_inbox.raw_text       IS '카톡 알림 본문 원본';
COMMENT ON COLUMN public.inquiry_inbox.parsed_email   IS '본문에서 추출한 이메일 (실패 가능)';
COMMENT ON COLUMN public.inquiry_inbox.parsed_phone   IS '본문에서 추출한 전화번호 (실패 가능)';
COMMENT ON COLUMN public.inquiry_inbox.parsed_field   IS '본문에서 추출한 문의 분야';
COMMENT ON COLUMN public.inquiry_inbox.parsed_budget  IS '본문에서 추출한 견적 범위';
COMMENT ON COLUMN public.inquiry_inbox.is_read        IS '운영자 확인 여부';
COMMENT ON COLUMN public.inquiry_inbox.meta           IS '원본 JSON 페이로드 (디버깅용)';
