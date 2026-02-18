-- quotations 테이블에 client_activity_id 컬럼 추가 (client_activities 연결용)
-- activities FK와 별도로 관리 (client_activities는 별도 테이블이므로 FK 없이)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_activity_id UUID;
CREATE INDEX IF NOT EXISTS idx_quotations_client_activity_id ON quotations(client_activity_id);
