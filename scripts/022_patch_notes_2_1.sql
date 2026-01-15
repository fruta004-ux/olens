-- 패치노트 v2.1 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '2.1', '2026-01-15', '모바일 반응형 & 종료 사유 다중선택'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '2.1');

-- 2. 변경사항 추가
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📱 전체 페이지 모바일 반응형 지원 (1280px 미만)', 1
FROM public.patch_notes WHERE version = '2.1';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '☰ 모바일에서 사이드바 햄버거 메뉴로 전환', 2
FROM public.patch_notes WHERE version = '2.1';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 딜 상세 페이지 좌/우 사이드바 슬라이드 패널', 3
FROM public.patch_notes WHERE version = '2.1';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '✅ 종료 사유(S6) 다중 선택 기능 추가', 4
FROM public.patch_notes WHERE version = '2.1';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📊 테이블 가로 스크롤 지원 (모바일)', 5
FROM public.patch_notes WHERE version = '2.1';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🎨 모바일 패딩/간격 최적화', 6
FROM public.patch_notes WHERE version = '2.1';
