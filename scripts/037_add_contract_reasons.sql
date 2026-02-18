-- 계약 확정 결정 사유 초기 데이터 추가
INSERT INTO public.settings (category, value, display_order) VALUES
  ('contract_reason', '적극 응대', 1),
  ('contract_reason', '가까운 위치', 2),
  ('contract_reason', '전문성 어필', 3),
  ('contract_reason', '단가 적합', 4),
  ('contract_reason', '응대자 역량 수주 추가 확보', 5)
ON CONFLICT DO NOTHING;
