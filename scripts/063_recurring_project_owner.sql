-- PO(프로젝트 책임자) 분리
-- 영업담당자(recurring_projects.assigned_to, TEXT 이름)와 별개로
-- PO 를 멤버(user_profiles) 참조로 저장한다.
--   - assigned_to     : 영업담당자 (기존, 이름 텍스트 유지)
--   - project_owner_id: PO (신규, user_profiles FK)
-- (project_specs / deals 에도 필요해지면 같은 방식으로 추후 추가)

ALTER TABLE public.recurring_projects
  ADD COLUMN IF NOT EXISTS project_owner_id UUID REFERENCES public.user_profiles(id);

CREATE INDEX IF NOT EXISTS idx_recurring_projects_po
  ON public.recurring_projects(project_owner_id);
