-- 패치노트 v1.16.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.16.0', '2026-02-02', '영업현황 테이블 개선 및 버그 수정'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.16.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 영업현황 테이블에 순번(No.) 컬럼 추가 - 목록 순서를 한눈에 파악 가능', 1
FROM public.patch_notes WHERE version = '1.16.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📊 영업현황 목록 개수 표시 기능 추가 - 전체 개수 및 필터링된 개수 확인 가능', 2
FROM public.patch_notes WHERE version = '1.16.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🔄 단계 필터에 "재접촉" 단계 추가', 3
FROM public.patch_notes WHERE version = '1.16.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📝 종료 사유에 "C10 시장조사" 항목 추가', 4
FROM public.patch_notes WHERE version = '1.16.0';

-- 버그 수정 (fix)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 상세페이지 단계 표시 오류 수정 - 레거시 단계값 호환성 개선', 5
FROM public.patch_notes WHERE version = '1.16.0';

-- 개선 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🎨 영업현황 테이블 여백 최적화로 UI 개선', 6
FROM public.patch_notes WHERE version = '1.16.0';
