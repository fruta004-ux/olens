-- 패치노트 v1.18.0 추가

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.18.0', '2026-02-02', '기존 거래처 CRM 고도화, 계약 확정 시스템 개선, 거래처 목록 리디자인'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.18.0');

-- 2. 변경사항 추가

-- 신규 기능 (feature)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📝 계약 확정 시스템 추가 - 거래 완료(S5) 시 계약 정보 입력 다이얼로그 표시, 대상/명칭/현황/니즈/유입경로/조건/비용/날짜/결정사유/비고 등 전체 정보 입력', 1
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 계약 확정 복사 기능 - 채널톡 호환 볼드 처리 복사 (HTML/Plain text), HTTP 환경 fallback 지원', 2
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏷️ 결정 사유 관리 - 계약 확정 시 수주 결정 사유 다중 선택, 관리자 페이지에서 CRUD + 드래그앤드롭 순서 변경', 3
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '💰 거래 예상금액 단일/지속 구분 - 단일 프로젝트 또는 월 정액(개월 수 × 금액) 자동 계산', 4
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🔗 거래 완료 시 기존 거래처 자동 전환 - S5 계약완료 시 clients 테이블에 자동 생성/연결, 계약 이력(client_contracts) 자동 저장', 5
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📂 기존 거래처 "과거 프로젝트" 탭 - 같은 거래처(account_id)의 모든 deals 조회, 클릭 시 거래 상세로 이동', 6
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🎯 기존 거래처 "영업기회 활동" 탭 통합 - 영업 기회 카드 + 활동 타임라인 통합, 성사 시 신규 거래 전환 버튼', 7
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📊 파이프라인 스냅샷 자동 수집 - 대시보드 접속 시 당일 스냅샷 자동 생성 (/api/snapshot), 단계명 정규화(S5_complete → S5)', 8
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📈 파이프라인 추이 UI 개선 - 시작~종료 날짜 범위 선택(캘린더), 7일/30일/90일/6개월/1년 퀵 선택, 날짜별 비교 기능', 9
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🗑️ 견적서 삭제 기능 추가', 10
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🔄 거래 상세 사이드바에 "이 거래처의 다른 프로젝트" 섹션 추가 + 기존 거래처 바로가기 버튼', 11
FROM public.patch_notes WHERE version = '1.18.0';

-- 개선 (improvement)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🏢 기존 거래처 목록 전면 리디자인 - 요약 카드(전체/활성/만료임박/영업기회), 컬럼 변경(서비스유형/상태/계약/영업기회/총계약금액/최근계약일)', 12
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🔀 기존 거래처 필터 변경 - 단계 필터 → 상태 필터(활성/관리/비활성), 니즈 → 서비스 유형, 기본 정렬: 활성 우선 + 만료임박 우선', 13
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📅 계약 확정 날짜 입력을 캘린더 팝오버로 변경 (계산서/계약일/업무시작)', 14
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🏠 기존 거래처 좌측 사이드바 개편 - 니즈/유입경로 삭제 → 거래처 현황 카드(진행중 기회/계약이력/과거프로젝트/마지막활동)', 15
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📋 계약 이력 탭에서 contract_info가 있으면 채널톡 형태로 표시 + 개별 복사 버튼', 16
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🔙 대시보드 탭/단계 선택 상태를 URL에 저장 - 뒤로가기 시 보던 화면 유지', 17
FROM public.patch_notes WHERE version = '1.18.0';

-- 버그 수정 (fix)
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 통계 페이지 날짜 표기 오류 수정 - UTC/KST 시차로 날짜가 하루 밀리는 문제 해결 (parseLocalDate 적용)', 18
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 마지막 응대일 정렬 버그 수정 - 상대적 날짜("6일 전") 대신 실제 날짜값 기준 정렬', 19
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 태블릿 모드 사이드바 수정 불가 버그 수정 - Sheet 모달 동작 비활성화로 내부 Popover/Select 정상 작동', 20
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 클립보드 writeText 에러 수정 - HTTP 환경에서 ClipboardItem + execCommand fallback 적용', 21
FROM public.patch_notes WHERE version = '1.18.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 기존 거래처 상세 hydration 에러 수정 - activeTab 서버/클라이언트 불일치 해결', 22
FROM public.patch_notes WHERE version = '1.18.0';
