-- 첨부파일을 여러 개 저장할 수 있도록 JSONB 타입으로 변경
ALTER TABLE activities 
  DROP COLUMN IF EXISTS attachment_url,
  DROP COLUMN IF EXISTS attachment_name,
  ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN activities.attachments IS 'Array of attachment objects with url and name: [{"url": "...", "name": "..."}]';
