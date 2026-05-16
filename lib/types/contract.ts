/**
 * 계약서 시스템 공용 타입.
 * contracts/page.tsx, components/contract-view-dialog.tsx,
 * components/create-contract-dialog.tsx, app/deals/[id]/page.tsx 모두
 * 이 파일의 타입을 사용한다.
 *
 * 새 필드를 추가할 때 여기에만 추가하면 모든 곳이 자동으로 안전해진다.
 */

export interface ContractClause {
  order: number
  title: string
  body: string
}

export interface ContractClientInfo {
  address?: string
  business_number?: string
  company_name?: string
  representative?: string
}

export type ContractCompanyInfo = ContractClientInfo

export interface ContractBankInfo {
  bank?: string
  account?: string
  holder?: string
}

export interface ContractDataValues {
  content_description?: string
  amount?: string
  deposit_percent?: string
  deposit_amount?: string
  balance_percent?: string
  balance_amount?: string
  dev_start?: string
  dev_end?: string
}

export interface Contract {
  id?: string
  contract_number: string
  template_id?: string | null
  deal_id?: string | null
  category: string
  title: string
  client_info: ContractClientInfo
  contract_data: ContractDataValues
  clauses: ContractClause[]
  bank_info: ContractBankInfo
  company_info: ContractCompanyInfo
  seal_url?: string | null
  /** 갑(거래처) 측 서명/도장 — 자체 전자서명 시스템으로 수신 */
  client_seal_url?: string | null
  client_signed_at?: string | null
  active_signature_request_id?: string | null
  status: string
  contract_date?: string | null
  created_at?: string
  updated_at?: string
}

/** 견적/계약서 카테고리 (UI 와 DB 양쪽이 공유) */
export const CONTRACT_CATEGORIES = [
  "홈페이지",
  "마케팅",
  "디자인",
  "앱개발",
  "ERP개발",
  "영상",
] as const
export type ContractCategory = (typeof CONTRACT_CATEGORIES)[number]

export const CONTRACT_STATUSES = ["초안", "확정", "서명완료"] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

/** 도장(seal) 을 가진 회사 (을 측) */
export const SEAL_COMPANIES = ["플루타", "오코랩스"] as const
export type SealCompany = (typeof SEAL_COMPANIES)[number]
