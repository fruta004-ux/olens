-- tasks 테이블 생성
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT '보통' CHECK (priority IN ('높음', '보통', '낮음')),
  status TEXT DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '보류')),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- RLS 활성화
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 모든 접근 허용 정책
CREATE POLICY "Allow all access to tasks"
  ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 인덱스 생성
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX idx_tasks_account_id ON tasks(account_id);

-- 샘플 데이터 삽입
INSERT INTO tasks (title, description, assigned_to, due_date, priority, status, deal_id) VALUES
('제안서 작성', '신규 고객사 제안서 작성 및 검토', '오일환 대표', NOW() + INTERVAL '2 days', '높음', '진행중', (SELECT id FROM deals LIMIT 1)),
('후속 전화', '지난주 미팅 후 후속 전화 연락', '박상혁', NOW() + INTERVAL '1 day', '보통', '진행중', (SELECT id FROM deals OFFSET 1 LIMIT 1)),
('계약서 검토', '최종 계약서 검토 및 날인 준비', '윤경호 과장', NOW() + INTERVAL '3 days', '높음', '진행중', (SELECT id FROM deals OFFSET 2 LIMIT 1)),
('미팅 준비', '다음주 화요일 고객사 방문 미팅 자료 준비', '오일환 대표', NOW() + INTERVAL '5 days', '보통', '진행중', NULL),
('견적서 발송', '요청받은 견적서 작성 및 발송', '박상혁', NOW() - INTERVAL '1 day', '높음', '완료', (SELECT id FROM deals OFFSET 3 LIMIT 1));
