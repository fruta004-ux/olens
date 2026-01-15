-- 패치노트 v2.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '2.0', '2026-01-15', '재접촉 기능 & 견적서 수정'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '2.0');

-- 2. 변경사항 추가
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🔄 S7_재접촉 단계 추가 - 재접촉 예정일/사유 설정 가능', 1
FROM public.patch_notes WHERE version = '2.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 영업 리포트에 "재접촉 대기" 탭 추가 - 재접촉 예정 딜 목록 확인', 2
FROM public.patch_notes WHERE version = '2.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🏷️ 영업현황 다음 연락일에 재접촉 배지 표시', 3
FROM public.patch_notes WHERE version = '2.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '✏️ 견적서 수정 기능 추가 - 견적서 관리 페이지에서 기존 견적서 편집 가능', 4
FROM public.patch_notes WHERE version = '2.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🔧 딜 상세페이지 상호명 수정 시 목록 반영 안되는 버그 수정', 5
FROM public.patch_notes WHERE version = '2.0';
