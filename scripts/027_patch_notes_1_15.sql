-- 패치노트 v1.15.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.15.0', '2026-01-22', '영업현황 필터 개선'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.15.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏢 영업현황에 "회사" 필터 추가 (플루타/오코랩스/전체/미지정)', 1
FROM public.patch_notes WHERE version = '1.15.0';

-- 개선 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📝 니즈 축약 필터 개선 - 설정된 니즈 목록만 표시', 2
FROM public.patch_notes WHERE version = '1.15.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🔍 "미분류" 옵션 추가 - 설정에 없는 니즈를 가진 거래처 필터링', 3
FROM public.patch_notes WHERE version = '1.15.0';
