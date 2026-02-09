-- 파이프라인 스냅샷 테이블
CREATE TABLE IF NOT EXISTS public.pipeline_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  stage TEXT NOT NULL,
  deal_count INTEGER NOT NULL DEFAULT 0,
  total_amount TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(snapshot_date, stage)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pipeline_snapshots_date ON public.pipeline_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_snapshots_date_stage ON public.pipeline_snapshots(snapshot_date, stage);

-- RLS
ALTER TABLE public.pipeline_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pipeline_snapshots" ON public.pipeline_snapshots FOR ALL USING (true) WITH CHECK (true);

-- 스냅샷 수집 함수
CREATE OR REPLACE FUNCTION take_pipeline_snapshot()
RETURNS void AS $$
BEGIN
  INSERT INTO pipeline_snapshots (snapshot_date, stage, deal_count)
  SELECT CURRENT_DATE, stage, COUNT(*)
  FROM deals
  WHERE stage IS NOT NULL
  GROUP BY stage
  ON CONFLICT (snapshot_date, stage)
  DO UPDATE SET deal_count = EXCLUDED.deal_count, created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 최초 스냅샷 실행 (현재 시점 데이터 기록)
SELECT take_pipeline_snapshot();

-- ============================================================
-- [별도 실행] pg_cron 자동 스케줄
-- ============================================================
-- 1. Supabase Dashboard > Database > Extensions > pg_cron 검색 후 활성화
-- 2. 활성화 완료 후 아래 SQL을 별도로 실행하세요:
--
-- SELECT cron.schedule(
--   'daily-pipeline-snapshot',
--   '0 15 * * *',
--   'SELECT take_pipeline_snapshot()'
-- );
--
-- UTC 15:00 = KST 00:00 (매일 한국 시간 자정에 실행됨)
