-- 이행 항목 상세 필드 추가
-- 프로젝트 상세 페이지에서 항목별 URL/내용을 적을 수 있도록 확장.
--   - link_url: 관련 링크(산출물 URL 등)
--   - content : 항목 상세 내용/메모

ALTER TABLE public.monthly_deliverable_items
  ADD COLUMN IF NOT EXISTS link_url TEXT;

ALTER TABLE public.monthly_deliverable_items
  ADD COLUMN IF NOT EXISTS content TEXT;
