-- 패치노트 v1.14.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.14.0', '2026-01-21', 'BDTA 등급 가이드 기능'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.14.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📊 BDTA 등급 가이드 다이얼로그 추가', 1
FROM public.patch_notes WHERE version = '1.14.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '✅ BDTA 다중 선택으로 등급 자동 계산 (0개=C, 1개=B, 2~3개=A, 4개=S)', 2
FROM public.patch_notes WHERE version = '1.14.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🆕 신규 거래처 등록 시 초기 등급 "추정불가"로 설정', 3
FROM public.patch_notes WHERE version = '1.14.0';
