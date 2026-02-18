-- 패치노트 v1.17.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.17.0', '2026-02-02', '기존 거래처 고도화, 파이프라인 스냅샷, 견적서 개선'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.17.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📄 기존 거래처 상세페이지에 "계약 이력" 탭 추가 - 계약 추가/수정/삭제, 만료 임박(30일) 강조 표시', 1
FROM public.patch_notes WHERE version = '1.17.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📈 기존 거래처 상세페이지에 "영업 기회" 탭 추가 - 업셀/크로스셀/재계약 기회 추적 (CRUD)', 2
FROM public.patch_notes WHERE version = '1.17.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '⚠️ 기존 거래처 목록에 계약 만료 임박 배지 표시 - 상호명 옆에 노란색 "만료임박" 배지', 3
FROM public.patch_notes WHERE version = '1.17.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📊 파이프라인 스냅샷 시스템 추가 - 매일 자정 자동으로 단계별 현황 기록 (pg_cron)', 4
FROM public.patch_notes WHERE version = '1.17.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📉 대시보드 파이프라인 탭에 추이 차트/테이블 추가 - 일별/주간/월간 단계별 건수 변화 시각화', 5
FROM public.patch_notes WHERE version = '1.17.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '➖ 견적서 마이너스 금액 지원 - 단가에 음수 입력 가능, 자동 차감 계산, 인쇄 시 "-" 표시', 6
FROM public.patch_notes WHERE version = '1.17.0';

-- 개선 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🖥️ 견적서 작성 다이얼로그 너비 2배 확대 - 항목 입력 시 더 넓은 화면 제공', 7
FROM public.patch_notes WHERE version = '1.17.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🗂️ 기존 거래처 상세페이지 탭 구조 개편 - 활동 | 계약 이력 | 영업 기회 | 정보', 8
FROM public.patch_notes WHERE version = '1.17.0';
