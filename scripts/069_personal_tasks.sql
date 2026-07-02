-- 실험실: 개인 업무 페이지 (PO 워크스페이스)
-- 1) deliverable_unit_checks: 이행 항목을 "숏폼 제작 1/2/3…" 단위로 쪼개 체크.
--    행 존재 = 해당 단위 완료. done_qty 는 체크 수와 동기화한다.
-- 2) personal_daily_tasks: 금일 업무 목록.
--    - 프로젝트 항목 단위에서 "오늘 업무로 보내기" (source_item_id + unit_index)
--    - 직접 타이핑한 개인 업무 (source 없음)
--    항목이 삭제(상세 페이지 재저장 등)돼도 금일 업무는 텍스트로 남도록 SET NULL.

CREATE TABLE IF NOT EXISTS public.deliverable_unit_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.monthly_deliverable_items(id) ON DELETE CASCADE,
  unit_index INT NOT NULL,               -- 0부터 (숏폼 제작 1 = 0)
  done_at TIMESTAMPTZ DEFAULT now(),
  done_by UUID REFERENCES public.user_profiles(id),
  UNIQUE (item_id, unit_index)
);
CREATE INDEX IF NOT EXISTS idx_duc_item ON public.deliverable_unit_checks(item_id);

CREATE TABLE IF NOT EXISTS public.personal_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  source_item_id UUID REFERENCES public.monthly_deliverable_items(id) ON DELETE SET NULL,
  unit_index INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdt_member_date ON public.personal_daily_tasks(member_id, task_date);

-- RLS (053 정책과 동일: authenticated 만)
ALTER TABLE public.deliverable_unit_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS duc_all ON public.deliverable_unit_checks;
CREATE POLICY duc_all ON public.deliverable_unit_checks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pdt_all ON public.personal_daily_tasks;
CREATE POLICY pdt_all ON public.personal_daily_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
