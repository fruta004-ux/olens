-- activities 테이블에 원본 첨부파일명 컬럼 추가
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

COMMENT ON COLUMN public.activities.attachment_name IS '원본 첨부파일명';
