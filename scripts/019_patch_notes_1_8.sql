-- 패치노트 v1.8 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.8', '2026-01-12', '메모장 & UI 개선'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.8');

-- 2. 변경사항 추가 (patch_note_id는 서브쿼리로 가져옴)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📝 메모장 기능 추가 - 리치 텍스트 에디터 (글씨 크기, 볼드, 색상, 이미지 삽입 지원)', 1
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '💾 메모장 자동 저장 - 타이핑 후 1.5초 뒤 자동 저장', 2
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 커뮤니티 > 메모장 목록 페이지 추가', 3
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🎨 등급별 색상 표시 - S급(보라-핑크), A급(주황), B급(파랑), C급(회색), F급(어두운회색)', 4
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🔄 우선권 취소 기능 - "선택 안함"으로 우선권 해제 가능', 5
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📊 서비스별 파이프라인에 "미분류" 카테고리 추가', 6
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '👤 CRM 빠른등록 - 새 양식의 "담당자" 필드 파싱 지원', 7
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🔧 거래 예상 금액 직접 입력 칸 클릭 안되는 문제 수정', 8
FROM public.patch_notes WHERE version = '1.8';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🔧 서비스별 파이프라인 딜 목록 전체 표시 ("+N개 더" 제거)', 9
FROM public.patch_notes WHERE version = '1.8';
