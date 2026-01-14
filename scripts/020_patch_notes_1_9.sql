-- 패치노트 v1.9 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.9', '2026-01-14', '딜 상세 페이지 & 견적서 개선'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.9');

-- 2. 변경사항 추가
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📊 딜 상세 페이지 사이드바 레이아웃 개선 - 단계/담당자, 등급/우선권 한 줄에 표시', 1
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📎 딜 상세 페이지 오른쪽 사이드바에 견적서/첨부파일 목록 섹션 추가', 2
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📅 첫 문의 날짜를 왼쪽 사이드바(고정 정보)로 이동', 3
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📄 견적서 모달 크기 최적화 - 견적서 크기에 맞게 조정', 4
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏢 견적서에 회사 로고 추가 (플루타/오코랩스)', 5
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🖨️ 견적서 A4 인쇄 최적화 - 행 수 및 행 높이 조정', 6
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '✏️ 견적서 수정 기능 추가 - 견적서 관리 페이지에서 기존 견적서 편집 가능', 7
FROM public.patch_notes WHERE version = '1.9';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🔧 플로팅 피드백 버튼 클릭 영역 문제 수정', 8
FROM public.patch_notes WHERE version = '1.9';
