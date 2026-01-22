-- 패치노트 v1.13.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.13.0', '2026-01-21', '활동 관리 및 UX 개선'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.13.0');

-- 2. 변경사항 추가

-- 개선사항 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📝 활동 타임라인 - 같은 날짜 내 메모 우선 표시', 1
FROM public.patch_notes WHERE version = '1.13.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🚫 관리자 활동 기록에서 메모 제외', 2
FROM public.patch_notes WHERE version = '1.13.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '⏳ 활동 저장 시 로딩 표시 및 중복 제출 방지', 3
FROM public.patch_notes WHERE version = '1.13.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📜 영업현황 목록 스크롤 위치 복원 (뒤로가기 시)', 4
FROM public.patch_notes WHERE version = '1.13.0';
