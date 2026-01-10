-- deals 테이블에 등급(grade) 컬럼 추가
ALTER TABLE deals ADD COLUMN IF NOT EXISTS grade TEXT;

-- 등급 설정 데이터 예시 추가
INSERT INTO settings (category, value, display_order)
VALUES 
  ('grade', 'VIP', 1),
  ('grade', 'A', 2),
  ('grade', 'B', 3),
  ('grade', 'C', 4)
ON CONFLICT DO NOTHING;
