# 계약서 시스템 전체 구조 가이드

> 오렌즈 CRM 의 계약서 기능이 어떻게 구성돼 있는지, 어디서 무엇을 고치면 되는지 한 번에 정리한 문서.

---

## 0. 한 줄 요약

```
거래(deal) → 계약 확정 모달(contract_info) → 자동 계약서 초안(contracts) → /contracts 페이지에서 편집 → 인쇄/PDF
                                              ↑
                                    템플릿(contract_templates) 에서 조항 끌어옴
```

거래가 S5 단계(계약 확정)로 가면 자동으로 계약서 초안이 만들어지고, 이후 `/contracts` 에서 다듬어서 출력하는 구조.

---

## 1. 큰 그림 — 3개의 데이터 영역

| 영역 | 테이블 | 무엇을 담는가 | 어디서 만지는가 |
|------|--------|---------------|----------------|
| **A. 영업 단계의 계약 정보** | `deals.contract_info` (JSONB 한 컬럼) | 거래 확정 시 입력하는 영업용 정보 (대금, 계약일, 작업 시작일, 정기/단건 여부 등) | `/deals/[id]` 의 "계약 확정" 모달 |
| **B. 정식 계약서 인스턴스** | `public.contracts` | 실제 인쇄/출력용 계약서 한 부 (조항·금액·갑/을 정보 포함) | `/contracts` 페이지, `/deals/[id]` 자동 생성 |
| **C. 계약서 템플릿** | `public.contract_templates` | 카테고리별(홈페이지/마케팅/디자인/앱개발/ERP/영상) 표준 조항·은행정보·회사정보 | `/admin` → "계약서 템플릿" 탭 |
| 부속 | `public.company_seals` | 도장 이미지 (을 측 회사 인장) | `/admin` → "계약서 템플릿" 탭 → 도장 관리 |
| 부속 | `public.client_contracts` | 거래처와 연결된 계약 마스터 (영업/매출 관리용 — 위 B 와 별개) | `/clients/[id]` 등 |

> 헷갈림 주의: **`contracts`** (정식 계약서) ≠ **`client_contracts`** (영업 매출 관리). 둘 다 존재합니다.

---

## 2. 데이터베이스 — 정확한 컬럼

### 2-1. `contract_templates` (템플릿)

```
id              UUID
category        TEXT            -- 홈페이지 / 마케팅 / 디자인 / 앱개발 / ERP개발 / 영상
title           TEXT            -- "홈페이지 구축 계약서"
clauses         JSONB           -- [{ order, title, body }] 배열
bank_info       JSONB           -- { bank, account, holder }
company_info    JSONB           -- { address, business_number, company_name, representative }  (을 정보)
display_order   INT
is_active       BOOL
created_at / updated_at
```

스키마 정의: `scripts/042_contract_templates.sql`

### 2-2. `contracts` (실제 계약서)

```
id                UUID
template_id       UUID  → contract_templates.id
deal_id           UUID  → deals.id (S5 자동 생성 시 연결됨)
contract_number   TEXT  -- "C-20260513-042" 형식 (자동 생성)
category          TEXT  -- 홈페이지 / 마케팅 / ...
title             TEXT
client_info       JSONB  -- 갑(거래처): { company_name, representative, business_number, address }
contract_data     JSONB  -- 조항에 채워질 동적 값들 (아래 §4 참고)
clauses           JSONB  -- 이 계약서에만 적용되는 조항 (템플릿에서 복사 후 자유롭게 수정)
bank_info         JSONB
company_info      JSONB  -- 을(우리 회사) 정보
seal_url          TEXT   -- 을 도장 이미지 URL (Supabase Storage)
status            TEXT   -- 초안 / 확정 / 서명완료
contract_date     TEXT   -- "2026.05.13" 또는 "2026-05-13"
created_at / updated_at
```

### 2-3. `company_seals` (도장)

```
id          UUID
company     TEXT    -- "플루타" / "오코랩스"
seal_url    TEXT    -- Supabase Storage 의 'company-seals' 버킷 URL
is_active   BOOL    -- 같은 회사에 여러 개가 있으면 가장 최근 active 한 것만 사용
```

도장 이미지는 Supabase Storage `company-seals` 버킷에 업로드됨.

### 2-4. `deals.contract_info` (JSONB)

```jsonc
{
  "target": "...",
  "name": "...",          // 계약명
  "status": "...",
  "needs": "...",         // 니즈 (홈페이지 / 마케팅 ...)
  "inflow_source": "...",
  "conditions": "...",
  "cost": "...",          // 대금 (예: "5,000,000(VAT별도)")
  "invoice_date": "...",
  "contract_date": "...", // 계약일
  "work_start_date": "...",// 개발 시작일
  "notes": "...",
  "reason_ids": [...],    // 결정 사유 ID 배열
  // ── 정기 결제용
  "is_recurring": false,
  "recurring_payment_day": "",        // 매월 며칠 입금
  "recurring_monthly_amount": "",     // 월 금액
  "recurring_invoice_issue_day": "",  // 매월 계산서 발행일
  "recurring_payment_offset": "0",    // 0=당월, 1=익월
  "invoice_issue_due_date": ""        // 단건: 첫 회차 계산서 발행 예정일
}
```

스키마 정의: `scripts/036_add_contract_info.sql` (단순히 컬럼만 추가)

---

## 3. 코드 파일 지도 — 어디서 무엇을 고치는가

| 화면/기능 | 파일 | 핵심 동작 |
|----------|------|-----------|
| **계약서 템플릿 관리** (관리자) | `app/admin/page.tsx` | 카테고리별 템플릿 CRUD, 조항 추가/삭제/순서 변경, 은행/회사 정보, 도장 업로드 |
| **계약서 목록** | `app/contracts/page.tsx` | 전체 계약서 리스트, 카테고리/검색 필터, 상태별 카운트 |
| **계약서 작성/수정 모달** | `components/create-contract-dialog.tsx` | 4 탭 구조: 기본정보 / 갑정보 / 계약조건 / 조항편집 |
| **계약서 미리보기/인쇄** | `components/contract-view-dialog.tsx` | A4 페이지네이션, 플레이스홀더 치환, `window.print()` 로 PDF 저장 |
| **거래 → 계약 확정 모달** | `app/deals/[id]/page.tsx` (line 378~, 750~) | `contractFormData` state, S5 단계 변경 시 모달 표시 |
| **계약서 자동 생성 (S5 시)** | `app/deals/[id]/page.tsx` `autoCreateContractDraft()` (line 810~) | 니즈에서 카테고리 추론 → 매칭되는 템플릿 찾기 → `contracts` 에 초안 INSERT |
| **타입 정의** | `app/contracts/page.tsx` 의 `Contract` type, `components/contract-view-dialog.tsx` 의 `ContractData` interface, `components/create-contract-dialog.tsx` 의 `DealData` | 같은 모양인데 3 곳에 따로 정의되어 있어 수정 시 모두 일치 필요 |

---

## 4. 핵심 메커니즘 — 플레이스홀더 치환

조항 본문(`clause.body`) 안의 `{{변수명}}` 이 자동으로 실제 값으로 치환됨. 치환 함수는 `components/contract-view-dialog.tsx` 의 `replacePlaceholders()`.

| 플레이스홀더 | 치환되는 값 | 출처 |
|--------------|------------|------|
| `{{content_description}}` | 구축 내용 | `contracts.contract_data.content_description` |
| `{{amount}}` | 대금 (VAT 별도) | `contract_data.amount` |
| `{{bank_name}}` | 은행명 | `contracts.bank_info.bank` |
| `{{bank_account}}` | 계좌번호 | `bank_info.account` |
| `{{bank_holder}}` | 예금주 | `bank_info.holder` |
| `{{deposit_percent}}` | 계약금 비율 (예: "50%") | `contract_data.deposit_percent` |
| `{{deposit_amount}}` | 계약금 금액 | `contract_data.deposit_amount` |
| `{{balance_percent}}` | 잔금 비율 | `contract_data.balance_percent` |
| `{{balance_amount}}` | 잔금 금액 | `contract_data.balance_amount` |
| `{{dev_start}}` | 개발 시작일 | `contract_data.dev_start` |
| `{{dev_end}}` | 개발 종료일 | `contract_data.dev_end` |

> **새 변수 추가하려면** `components/contract-view-dialog.tsx` 의 `replacePlaceholders()` `vars` 객체에 한 줄 추가하고, `create-contract-dialog.tsx` 의 입력 필드도 함께 추가해야 함.

---

## 5. 사용자 흐름 (실제로 어떻게 굴러가는지)

### 5-1. 평소 — 거래에서 시작하는 정상 경로

```
1. 영업이 거래(/deals/[id]) 단계를 S5 (계약 확정) 로 변경
2. "계약 확정" 모달이 떠서 contractFormData 입력
   → 거래.contract_info JSONB 에 저장
3. 동시에 autoCreateContractDraft() 자동 실행:
   - dealData.needs_summary 에서 카테고리 추론 ("마케팅" 포함 → 마케팅 템플릿)
   - 매칭되는 contract_templates 가져와서 clauses/bank_info/company_info 복사
   - 거래처 정보 (account.company_name, representative, business_number, address) 를 갑(client_info) 으로 채움
   - amount 의 50% × 1.1 (VAT) 로 계약금/잔금 자동 계산
   - 도장(seal_url) 자동 첨부
   - status="초안" 으로 contracts 에 INSERT
4. /contracts 페이지로 가면 새 계약서가 보임
5. 행 클릭 → ContractViewDialog 가 열려서 미리보기
6. "인쇄 / PDF 저장" → window.print() → 브라우저 인쇄 다이얼로그 → PDF 저장
```

### 5-2. 직접 작성 — 거래 없이 만드는 경우

```
1. /contracts 우상단 "계약서 작성" 버튼
2. CreateContractDialog 의 4 탭을 차례로 입력:
   ① 기본 정보  : 카테고리 선택 → (해당 카테고리 템플릿이 여러 개면) 템플릿 선택
                  → 제목/계약일자/상태
   ② 갑 정보    : 회사명/대표자/사업자번호/주소
   ③ 계약 조건  : 구축 내용, 대금, 계약금/잔금 비율과 금액, 개발 시작/종료일
   ④ 조항 편집  : 템플릿에서 가져온 조항을 펼쳐서 이 계약서에만 한해 수정 가능
3. "계약서 생성" 클릭 → contracts INSERT (contract_number 는 C-YYYYMMDD-XXX 자동)
```

### 5-3. 템플릿 자체를 바꾸고 싶을 때

```
1. /admin → "계약서 템플릿" 탭
2. 카테고리 버튼 (홈페이지/마케팅/...) 선택
3. 새 템플릿 추가 버튼으로 카테고리당 여러 템플릿 가능
4. 좌측: 기본정보(제목/은행/회사/도장)  | 우측: 조항 목록
5. 조항을 드래그해서 순서 변경
6. 조항 본문에 {{변수}} 형태로 동적 필드 삽입
7. "템플릿 저장" 버튼
```

> 주의: 템플릿을 수정해도 **이미 만들어진 contracts 행은 변경되지 않음**. 템플릿에서 contracts 로 데이터를 복사하는 시점은 "계약서 작성/자동 생성" 시 **한 번만**. 이후엔 contracts.clauses 가 독립적으로 유지됨.

---

## 6. 인쇄/PDF 출력 동작

`components/contract-view-dialog.tsx` 가 가장 복잡한 부분:

1. **A4 페이지네이션**: 조항을 한 페이지(297mm)에 들어갈 수 있도록 글자 길이 기반으로 추정해서 페이지를 나눔. 마지막 페이지에는 서명 블록을 위한 220px 공간을 미리 확보.
2. **2 영역 렌더링**:
   - 화면 미리보기: Dialog 내부에서 보이는 부분
   - **인쇄용**: `createPortal` 로 `body > #contract-print-root` 에 별도 렌더링 (Dialog 가 인쇄 시 잘리지 않도록)
3. **인쇄 CSS**: `@media print` 로 본문 모두 hidden + `#contract-print-root` 만 visible. 페이지 크기 고정(210mm × 297mm). 색상 강제 출력.
4. **파일명**: 인쇄 시 `document.title` 을 `{거래처명}_{계약서제목}` 으로 잠깐 변경. 브라우저가 PDF 저장 시 이 이름을 기본 파일명으로 사용.

---

## 7. 자주 나올 수정 요청 — 어디 손대면 되는지

| 하고 싶은 것 | 손대야 하는 곳 |
|-------------|----------------|
| 새 조항을 모든 신규 계약서에 추가 | `/admin` → 템플릿 → 조항 추가 (이후 만든 계약서에만 반영) |
| 기존 계약서들 모두에 추가 적용 | DB 수동 — `UPDATE contracts SET clauses = ...` (덮어쓰면 개별 수정 사항 손실 주의) |
| 새 카테고리 추가 (예: "유지보수") | ① `app/contracts/page.tsx` 의 `categories` 배열, ② `components/create-contract-dialog.tsx` 의 `CATEGORIES` 배열, ③ `app/admin/page.tsx` 의 `TEMPLATE_CATEGORIES`, ④ `getCategoryBadge()` 색상 추가, ⑤ /admin 에서 새 카테고리 템플릿 만들기 |
| 새 동적 필드 추가 (예: `{{warranty_period}}`) | ① `components/contract-view-dialog.tsx` `replacePlaceholders()` `vars` 추가, ② `create-contract-dialog.tsx` 의 state + 입력 폼 + payload 에 추가, ③ 마이그레이션은 불필요 (contract_data JSONB 라 자유) |
| S5 자동 생성 로직 변경 | `app/deals/[id]/page.tsx` `autoCreateContractDraft()` 함수 (line 810~) |
| 계약금/잔금 자동 계산 비율 변경 | 같은 함수의 `0.5 * 1.1` 부분 (현재 50% × VAT 1.1 = 55%) |
| 인쇄 시 페이지 분할 룰 변경 | `contract-view-dialog.tsx` 의 `useEffect` (line 147~) — `LINE_HEIGHT`, `CLAUSE_GAP`, `PREAMBLE_HEIGHT` 등 |
| 도장 위치/크기 조정 | `contract-view-dialog.tsx` 의 `<img src={contract.seal_url}` 두 군데 (line 253, 391) — 인쇄용 + 미리보기용 둘 다 수정 필요 |
| 서명 블록(갑/을 칸) 디자인 변경 | `contract-view-dialog.tsx` 의 `renderSignatureBlock()` + Dialog 내부 grid 부분 |
| 헤더 문구 ("주식회사 OOO ... 계약 체결한다") | `contract-view-dialog.tsx` line 282, 355 (인쇄용/미리보기 두 군데) |
| 계약번호 형식 변경 | `create-contract-dialog.tsx` `generateContractNumber()` + `app/deals/[id]/page.tsx` `autoCreateContractDraft()` |
| 새 상태값 추가 (예: "보류") | `create-contract-dialog.tsx` 의 Select 옵션, `app/contracts/page.tsx` 의 `getStatusBadge()` + `statusCounts` |

---

## 8. 알려진 약점 / 개선 후보

- **타입 중복**: `Contract` 타입이 3 곳(contracts page, view dialog, edit dialog) 에 흩어져 있어 필드 추가 시 모두 수정해야 함. → `lib/types/contract.ts` 로 통합 권장.
- **도장 회사 분기**: 현재 `autoCreateContractDraft()` 는 `dealData.company` 로 도장을 골라옴 (플루타/오코랩스). 회사 정보가 없으면 "플루타" 로 하드코딩. → 거래마다 명시적 선택 UX 필요.
- **계약금/잔금 계산식 하드코딩**: `0.5 * 1.1` 이 두 곳 (`autoCreateContractDraft`, `prefillFromDeal`) 에 박혀 있음. → 상수로 추출 권장.
- **인쇄 페이지 분할 추정**: 글자 수 기반 휴리스틱이라 한자/특수문자 많을 때 페이지가 어긋날 수 있음. → 현재로선 수동 미세 조정.
- **수정 시 자동 저장 없음**: 모달 닫으면 입력 손실. → confirm 추가 또는 임시저장 도입 검토.
- **버전 관리 없음**: contracts 의 clauses 를 수정해도 이전 버전이 남지 않음. → 필요 시 audit_log 도입.

---

## 9. 빠른 SQL 참조

```sql
-- 모든 활성 템플릿 보기
SELECT id, category, title, jsonb_array_length(clauses) AS num_clauses
FROM contract_templates WHERE is_active = true ORDER BY category, display_order;

-- 특정 거래의 계약서들
SELECT contract_number, category, title, status, contract_date
FROM contracts WHERE deal_id = '거래-UUID';

-- 카테고리별 계약서 통계
SELECT category, status, COUNT(*) FROM contracts GROUP BY category, status;

-- 도장 현황
SELECT company, seal_url, is_active FROM company_seals ORDER BY company, created_at DESC;

-- 특정 템플릿의 조항만 보기
SELECT jsonb_pretty(clauses) FROM contract_templates WHERE id = '...';
```
