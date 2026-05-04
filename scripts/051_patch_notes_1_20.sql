-- 패치노트 v1.20.0 추가
-- 1.19.0 (2026-03-16) 이후 누적된 변경사항을 정리

-- 1. 패치노트 메인 레코드 생성 (중복 체크 후 삽입)
INSERT INTO public.patch_notes (version, date, title)
SELECT '1.20.0', '2026-05-04', '계약서 자동화·프로젝트 명세서·정기 프로젝트·활동 지수·아임웹 빠른등록 등 대규모 업데이트'
WHERE NOT EXISTS (SELECT 1 FROM public.patch_notes WHERE version = '1.20.0');

-- 2. 변경사항 추가

-- ─────────────────────────────────────────────────────────────
-- 신규 기능 (feature)
-- ─────────────────────────────────────────────────────────────

-- 계약서 자동 생성 시스템
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📝 계약서 자동 생성 시스템 - 카테고리별(홈페이지/마케팅/디자인/앱개발/ERP개발/영상) 템플릿 관리, 조항(clauses) JSON 구성, 계좌·회사 정보 템플릿화, 거래에서 1클릭 계약서 발행', 1
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏛️ 관리자 페이지 계약서 템플릿 탭 추가 - 템플릿 추가/수정/삭제, 조항 드래그앤드롭 정렬, 직인(company_seals) 업로드 및 활성 직인 관리', 2
FROM public.patch_notes WHERE version = '1.20.0';

-- 프로젝트 명세서 / 요청서
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📑 프로젝트 명세서 요청서 도입 - S5 계약완료 시 자동 생성, 카테고리/프로젝트명/비용유형/금액/입금예정일/계산서발행예정일/진행상태 관리, 거래처·계약·거래와 연결', 3
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '👥 명세서 재무 담당자 분리 - 영업 담당자(assigned_to) 외에 재무/계산서 발행 담당자(finance_assigned_to) 별도 지정 가능', 4
FROM public.patch_notes WHERE version = '1.20.0';

-- 정기 프로젝트 시스템
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🔁 정기(월 대행) 프로젝트 시스템 - recurring_projects 마스터 테이블 도입, 매월 [정기 프로젝트 갱신] 버튼으로 그 달치 명세서 일괄 생성, 거래처별 영구 제외(비활성화) 가능', 5
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📅 정기 프로젝트 발행/입금 시점 분리 - 매월 계산서 발행일(invoice_issue_day)과 입금 시점(당월/익월, payment_offset_months) 별도 설정', 6
FROM public.patch_notes WHERE version = '1.20.0';

-- 사업자등록증 OCR
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📷 사업자등록증 OCR 업로드 - 이미지 업로드 시 법인등록번호/개업일자/업태/종목/본점소재지/발급일/과세유형 자동 추출, 거래처 정보 자동 채움', 7
FROM public.patch_notes WHERE version = '1.20.0';

-- 거래처 브랜드명
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🏷️ 거래처 브랜드명 컬럼 추가 - 상호와 별개로 통용되는 사업상 명칭(브랜드명) 관리, 목록/상세에서 "거래처명 (브랜드명)" 형태로 함께 표시, LOWER 인덱스로 검색 최적화', 8
FROM public.patch_notes WHERE version = '1.20.0';

-- 활동 지수
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🎯 활동 지수 시스템 추가 - 활동 기록별 점수 분류(주 분류 1개 + 추가 분류 최대 3개), 자동 합산·담당자별 총점·이미지 복사 지원. 주 분류: 단순접촉(1)/통화(3)/상담(5)/약속(7)/방문(10)/내방(15)/모임(2). 추가 분류(중복 발생 가능): 견적제작/견적발송/포도 각 1점', 9
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📊 관리자 페이지 활동 지수 탭 추가 - 날짜/담당자별 활동 점수 집계, 분류별 건수·소계 뱃지, 분류 변경 시 즉시 자동 저장', 10
FROM public.patch_notes WHERE version = '1.20.0';

-- 아임웹 빠른 등록
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '🌐 CRM 빠른 등록에 [아임웹에서 가져오기] 탭 추가 - 아임웹 전문가 찾기 견적의뢰 텍스트를 붙여넣으면 명칭/연락처/이메일/문의분야/견적범위/운영중사이트/레퍼런스URL 등 자동 파싱, 채널톡 형식으로 1클릭 변환', 11
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'feature', '📋 채널톡 양식 출력 개선 - "[ 비즈니스 요청 📞 ]" 헤더 볼드 처리, 모든 라벨 <strong> 적용, 본문 줄바꿈/문단을 <br>로 보존하여 채널톡 붙여넣기 시 가독성 향상', 12
FROM public.patch_notes WHERE version = '1.20.0';

-- ─────────────────────────────────────────────────────────────
-- 개선 (improvement)
-- ─────────────────────────────────────────────────────────────

-- 계산서 발행 예정일
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🧾 계산서 발행 예정일(invoice_issue_due_date) 도입 - 입금 예정일과 분리. 4월에 발행해야 하지만 입금이 5월인 케이스 대응. 명세서 필터/소속월 기준을 발행 예정일로 전환', 13
FROM public.patch_notes WHERE version = '1.20.0';

-- 채널톡 양식
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🔧 채널톡 빠른 등록 양식 변경 - "등 급" 라인 제거, "담당자" 라인 추가(니 즈 다음 위치). 응 대/담당자/응대자 코코 기재/응대 완료 4개 항목은 사용자 직접 기입하도록 빈값으로 출력', 14
FROM public.patch_notes WHERE version = '1.20.0';

-- 거래처 표시
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '🏢 거래처 표시 통일 - formatAccountName 헬퍼로 "거래처명 (브랜드명)" 일관 출력, 활동 기록·관리자 페이지 등 전반에 적용', 15
FROM public.patch_notes WHERE version = '1.20.0';

-- 명세서 진행 상태
INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'improvement', '📌 명세서 진행 상태 관리 - 작성대기/작성필요/작성완료 3단계, 같은 정기 마스터+같은 달은 1행만 생성되도록 유니크 인덱스 적용', 16
FROM public.patch_notes WHERE version = '1.20.0';

-- ─────────────────────────────────────────────────────────────
-- 버그 수정 (fix)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 아임웹 파서 본문 중복 출력 수정 - "추가 요청"이 마지막 라벨이라 본문 메시지까지 값으로 흡수되어 [고객 메시지]에 두 번 나오던 문제. 모든 필드를 첫 빈 줄에서 종료하도록 변경', 17
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 채널톡 HTML 출력 줄바꿈 손실 수정 - 본문 내용의 \\n이 무시되어 한 줄로 합쳐지던 문제. split → escape → <br> 조인으로 문단·줄바꿈 모두 보존', 18
FROM public.patch_notes WHERE version = '1.20.0';

INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order)
SELECT id, 'fix', '🐛 아임웹 헤더 이름 추출 오인식 수정 - "답변 대기로 변경" / "원본" 같은 상태/마커 라인이 문의자 이름으로 잡히던 문제. 한글 2~5자 + 상태 키워드 제외 필터 적용', 19
FROM public.patch_notes WHERE version = '1.20.0';
