-- 패치노트 v1.12.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.12.0', '2026-01-21', 'AI 견적 & 데모 생성 기능'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.12.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🤖 AI 견적서 자동 생성 (Gemini API)', 1
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🎨 v0 데모 생성 & CodeSandbox 배포', 2
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '💰 내부용 인력/공수/원가 산정 표시', 3
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '✉️ 이메일 템플릿 자동 생성', 4
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏢 통계 페이지 회사별(오코랩스/플루타) 필터', 5
FROM public.patch_notes WHERE version = '1.12.0';

-- 개선사항 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📊 대시보드 단계 분석 개선 (S0~S4 합산 100%)', 6
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📋 견적서 페이지 상세 뷰 개선', 7
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🚫 관리자 활동 기록에서 메모 제외', 8
FROM public.patch_notes WHERE version = '1.12.0';

-- 버그 수정 (fix)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 기존(clients) 페이지 견적서 저장 오류 수정', 9
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 CRM 등록 시 오후 24시간 형식 시간 파싱 오류 수정', 10
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 딜 상세 페이지 사이드바 입력 시 포커스 유실 수정', 11
FROM public.patch_notes WHERE version = '1.12.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 페이지 Hydration 오류 수정', 12
FROM public.patch_notes WHERE version = '1.12.0';
