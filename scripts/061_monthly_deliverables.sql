-- 월별 업무 완수 체크 시스템
-- 정기 프로젝트(recurring_projects)를 기준으로, 매월 이행해야 할 업무 항목과
-- 완수 여부(목표/완료 수량·상태·이월·사유)를 추적한다.
-- 프로젝트의 월 상태(정상/이월/지연/붕괴 등)는 항목 진행도로 자동 산출하되,
-- 필요 시 monthly_project_status.status_override 로 수동 지정한다.

-- ── 1) 월별 이행 항목 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_deliverable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_project_id UUID NOT NULL REFERENCES public.recurring_projects(id) ON DELETE CASCADE,
  month TEXT NOT NULL,                          -- 'yyyy-MM'
  item_name TEXT NOT NULL,                      -- 이행 항목명 (예: 숏폼 영상 제작 A급)
  target_qty INTEGER,                           -- 목표 수량 (NULL = 수량 개념 없는 항목)
  done_qty INTEGER NOT NULL DEFAULT 0,          -- 완료 수량
  status TEXT NOT NULL DEFAULT '대기',          -- 대기 | 진행중 | 완료 | 이월
  carried_over BOOLEAN NOT NULL DEFAULT false,  -- 전월에서 이월된 항목인지
  reason TEXT,                                   -- 지연/이월 사유
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mdi_project_month
  ON public.monthly_deliverable_items(recurring_project_id, month);

-- ── 2) 프로젝트 월별 상태(override + 비고) ──────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_project_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_project_id UUID NOT NULL REFERENCES public.recurring_projects(id) ON DELETE CASCADE,
  month TEXT NOT NULL,                           -- 'yyyy-MM'
  status_override TEXT,                          -- NULL = 자동 산출. 값: 정상 진행 | 일부 이월 진행 | 50% 이상 지연 | 일부 지연 | 사이클 붕괴 | 대기
  note TEXT,                                     -- 비고 (지연 사유 요약 등)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (recurring_project_id, month)
);

-- ── RLS (053 보안 정책과 동일: authenticated 만 허용) ───────────
ALTER TABLE public.monthly_deliverable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_project_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mdi_all ON public.monthly_deliverable_items;
CREATE POLICY mdi_all ON public.monthly_deliverable_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mps_all ON public.monthly_project_status;
CREATE POLICY mps_all ON public.monthly_project_status
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
