-- 메모 테이블 생성
CREATE TABLE IF NOT EXISTS public.memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '새 메모',
  content TEXT DEFAULT '',
  created_by TEXT DEFAULT '미정',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON public.memos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memos_updated_at ON public.memos(updated_at DESC);

-- RLS 정책 (필요시)
-- ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
