-- 패치노트 v1.19.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.19.0', '2026-03-16', '파이프라인 대시보드 개편, 거래정보별 파이프라인, 스냅샷 정합성 수정'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.19.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📊 거래정보별 파이프라인 추가 - 거래 정보 항목(마케팅/홈페이지/디자인/개발/영상)별 건수·금액 집계, deals.category 필드 기준', 1
FROM public.patch_notes WHERE version = '1.19.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏷️ 종합 거래정보별 카드 - S1~S4 전체 합산을 거래정보 항목별로 한눈에 확인, 건수·금액 표시', 2
FROM public.patch_notes WHERE version = '1.19.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 S1~S4 단계별 거래정보 카드 - 각 단계마다 거래정보 항목별 건수·금액 분류, 클릭 시 해당 딜 목록 펼침', 3
FROM public.patch_notes WHERE version = '1.19.0';

-- 개선 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🎯 파이프라인 상단 카드 정리 - S0/S1/S2 카드 제거, 전체 파이프라인 + S3(제안발송)/S4(결정대기)/S5(계약완료)만 표시', 4
FROM public.patch_notes WHERE version = '1.19.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '💰 금액 포맷 개선 - "1.8억" → "1억 8,452만" 식으로 만 단위까지 정확하게 표시', 5
FROM public.patch_notes WHERE version = '1.19.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🗂️ 거래정보별 카드 레이아웃 - 종합 카드를 상단에 크게 배치, S1~S4는 4열 1줄로 정렬', 6
FROM public.patch_notes WHERE version = '1.19.0';

-- 버그 수정 (fix)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 파이프라인 스냅샷 중복 집계 수정 - DB 함수(pg_cron)가 원본 stage(S3_proposal)로, API가 정규화 stage(S3)로 저장하여 같은 날 2행 생성 → 합산 오류 발생. DB 함수에 stage 정규화 추가', 7
FROM public.patch_notes WHERE version = '1.19.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 대시보드 hydration mismatch 수정 - Tabs 컴포넌트에 고정 ID 부여하여 서버/클라이언트 ID 불일치 해결', 8
FROM public.patch_notes WHERE version = '1.19.0';
