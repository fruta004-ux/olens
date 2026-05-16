import type { Contract, ContractCategory, SealCompany } from "@/lib/types/contract"

// ============================================================================
// 상수 — 계약 금액 계산 / 도장 회사 등 비즈니스 룰
// 변경하려면 여기만 손대면 된다.
// ============================================================================

/** 계약금 비율 (대금의 50%) */
export const DEFAULT_DEPOSIT_RATIO = 0.5

/** 잔금 비율 (대금의 50%) */
export const DEFAULT_BALANCE_RATIO = 0.5

/** 부가세 포함 배수 (1.1 = 10%) */
export const VAT_MULTIPLIER = 1.1

/** 기본 도장 회사 (거래에 회사 정보가 없을 때 fallback) */
export const DEFAULT_SEAL_COMPANY: SealCompany = "플루타"

// ============================================================================
// 카테고리 추론 — 거래의 needs_summary 텍스트에서 자동 카테고리 결정
// ============================================================================

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: ContractCategory }> = [
  { keywords: ["마케팅"], category: "마케팅" },
  { keywords: ["디자인"], category: "디자인" },
  { keywords: ["앱"], category: "앱개발" },
  { keywords: ["ERP", "커스텀"], category: "ERP개발" },
  { keywords: ["영상", "숏폼"], category: "영상" },
  // 기본값은 홈페이지
]

export function inferCategoryFromNeeds(needs: string | null | undefined): ContractCategory {
  const s = (needs || "").toString()
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => s.includes(k))) return category
  }
  return "홈페이지"
}

// ============================================================================
// 금액 계산
// ============================================================================

/** "5,000,000(VAT별도)" 같은 문자열에서 숫자만 뽑아냄 */
export function extractNumericAmount(costRaw: string | null | undefined): number {
  if (!costRaw) return 0
  const clean = String(costRaw).replace(/[^\d]/g, "")
  return parseInt(clean, 10) || 0
}

/** 대금에서 계약금/잔금 자동 계산 (VAT 포함). 둘 다 0 이면 빈 문자열. */
export function calculateDepositBalance(amount: number): {
  deposit: number
  balance: number
} {
  if (!amount || amount <= 0) return { deposit: 0, balance: 0 }
  return {
    deposit: Math.round(amount * DEFAULT_DEPOSIT_RATIO * VAT_MULTIPLIER),
    balance: Math.round(amount * DEFAULT_BALANCE_RATIO * VAT_MULTIPLIER),
  }
}

/** "1234567" → "1,234,567" */
export function formatAmountKR(n: number): string {
  return n.toLocaleString("ko-KR")
}

// ============================================================================
// 계약번호 생성 — "C-YYYYMMDD-XXX"
// ============================================================================

export function generateContractNumber(prefix = "C"): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")
  return `${prefix}-${dateStr}-${seq}`
}

// ============================================================================
// 플레이스홀더 치환 — 조항 본문의 {{변수}} 를 실제 값으로 바꿈
// 새 변수를 추가하려면 여기 vars 객체에 한 줄 추가하면 됨.
// ============================================================================

export function replacePlaceholders(text: string, contract: Contract): string {
  if (!text) return ""
  const cd = contract.contract_data || {}
  const bi = contract.bank_info || {}

  const vars: Record<string, string> = {
    "{{content_description}}": cd.content_description || "웹/앱 반응형 제작",
    "{{amount}}": cd.amount || "0,000,000",
    "{{bank_name}}": bi.bank || "",
    "{{bank_account}}": bi.account || "",
    "{{bank_holder}}": bi.holder || "",
    "{{deposit_percent}}": cd.deposit_percent || "50%",
    "{{deposit_amount}}": cd.deposit_amount || "000,000",
    "{{balance_percent}}": cd.balance_percent || "50%",
    "{{balance_amount}}": cd.balance_amount || "000,000",
    "{{dev_start}}": cd.dev_start || "2026년 00월 00일",
    "{{dev_end}}": cd.dev_end || "2026년 00월 00일",
  }

  let result = text
  for (const [key, value] of Object.entries(vars)) {
    // split/join 이 정규식 escape 신경 쓸 필요 없어서 더 안전
    result = result.split(key).join(value)
  }
  return result
}

// ============================================================================
// 날짜 포맷
// ============================================================================

/** "2026-05-13" / "2026.05.13" → "2026년 05월 13일" */
export function formatContractDateKR(date: string | null | undefined): string {
  if (!date) return "0000년 00월 00일"
  const normalized = date.replace(/\./g, "-")
  const parts = normalized.split("-")
  if (parts.length === 3) {
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`
  }
  return date
}

// ============================================================================
// HTML escape — 새 창 인쇄용 HTML 직접 빌드 시 사용
// ============================================================================

export function escapeHtml(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
