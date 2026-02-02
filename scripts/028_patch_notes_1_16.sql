-- v1.16.0 패치노트
DO $$
DECLARE
  patch_note_id UUID;
BEGIN
  INSERT INTO patch_notes (version, release_date, summary)
  VALUES ('1.16.0', CURRENT_DATE, '영업현황 테이블 개선 및 버그 수정')
  RETURNING id INTO patch_note_id;

  INSERT INTO patch_note_changes (patch_note_id, type, description, display_order)
  VALUES
    (patch_note_id, 'feature', '📋 영업현황 테이블에 순번(No.) 컬럼 추가 - 목록 순서를 한눈에 파악 가능', 1),
    (patch_note_id, 'feature', '📊 영업현황 목록 개수 표시 기능 추가 - 전체 개수 및 필터링된 개수 확인 가능', 2),
    (patch_note_id, 'feature', '🔄 단계 필터에 "재접촉" 단계 추가', 3),
    (patch_note_id, 'feature', '📝 종료 사유에 "C10 시장조사" 항목 추가', 4),
    (patch_note_id, 'fix', '🐛 상세페이지 단계 표시 오류 수정 - 레거시 단계값 호환성 개선', 5),
    (patch_note_id, 'improvement', '🎨 영업현황 테이블 여백 최적화로 UI 개선', 6);
END $$;
