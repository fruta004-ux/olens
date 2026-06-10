/** 자체 전자서명 시스템 공용 타입 */

export type SignatureRequestStatus = "pending" | "signed" | "expired" | "cancelled"

export interface SignatureRequest {
  id: string
  contract_id: string
  recipient_email: string
  recipient_name?: string | null
  token: string
  message?: string | null
  status: SignatureRequestStatus

  expires_at: string
  sent_at: string
  opened_at?: string | null
  signed_at?: string | null

  signer_ip?: string | null
  signer_user_agent?: string | null
  signature_image_url?: string | null

  created_by?: string | null
  created_at: string
  updated_at: string
}

/** 공개 서명 페이지에서 사용하는 안전한(=민감 정보 가린) 계약서 데이터 */
export interface PublicContractView {
  contract_number: string
  title: string
  category: string
  contract_date?: string | null
  client_info: {
    company_name?: string
    representative?: string
    business_number?: string
    address?: string
    /** "개인" 이면 company_name=성명, representative=전화번호, business_number=주민등록번호 */
    client_type?: "사업자" | "개인"
  }
  contract_data: Record<string, string | null | undefined>
  clauses: Array<{ order: number; title: string; body: string }>
  bank_info: { bank?: string; account?: string; holder?: string }
  company_info: {
    company_name?: string
    representative?: string
    business_number?: string
    address?: string
  }
  seal_url?: string | null
  // 갑(거래처)이 이미 서명한 경우 표시
  client_seal_url?: string | null
}

export const SIGNATURE_REQUEST_TTL_DAYS = 7
export const SIGNATURE_REQUEST_TTL_MS = SIGNATURE_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000
