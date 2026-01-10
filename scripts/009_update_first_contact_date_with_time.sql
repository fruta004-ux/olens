-- 첫 문의 날짜 컬럼을 timestamp로 변경하여 시간 정보 포함
ALTER TABLE deals 
ALTER COLUMN first_contact_date TYPE timestamp with time zone 
USING first_contact_date::timestamp with time zone;

COMMENT ON COLUMN deals.first_contact_date IS '첫 문의 날짜 및 시간';
