-- 활동 테이블에 담당자와 첨부파일 필드 추가
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100),
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 활동 날짜 컬럼 추가 (기존에 없다면)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS activity_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN activities.assigned_to IS '활동 담당자 (오일환, 박상혁, 윤경호)';
COMMENT ON COLUMN activities.attachment_url IS '첨부파일 URL';
COMMENT ON COLUMN activities.activity_date IS '활동 날짜';
