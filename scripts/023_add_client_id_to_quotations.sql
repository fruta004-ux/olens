-- quotations 테이블에 client_id 컬럼 추가
-- 기존 영업(clients)에서도 견적서 저장 가능하도록

-- client_id 컬럼 추가 (nullable)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_id UUID;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);

-- deal_id도 nullable로 변경 (client_id만 있는 경우를 위해)
ALTER TABLE quotations ALTER COLUMN deal_id DROP NOT NULL;
