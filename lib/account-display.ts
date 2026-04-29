/**
 * 거래처(Account) 표시/검색 관련 헬퍼
 *
 * 거래처는 보통 "상호(법인명)"로 등록되지만, 실제 대화에서는
 * 브랜드명으로 호명되는 경우가 많아서 두 값을 함께 표시한다.
 *
 *   브랜드명이 있을 때:  "거래처명 (브랜드명)"
 *   브랜드명이 없을 때:  "거래처명"
 */

export interface AccountLike {
  company_name?: string | null
  brand_name?: string | null
}

/**
 * 거래처를 화면에 보여줄 때 사용하는 표시 문자열을 만든다.
 * - 둘 다 있으면 `"상호 (브랜드)"` 형태
 * - 브랜드명이 없거나 상호와 동일하면 상호만
 * - account 가 비어있으면 fallback 사용
 */
export function formatAccountName(
  account?: AccountLike | null,
  fallback: string = "-",
): string {
  const company = (account?.company_name || "").trim()
  const brand = (account?.brand_name || "").trim()

  if (!company && !brand) return fallback
  if (!brand || brand === company) return company || fallback
  if (!company) return brand
  return `${company} (${brand})`
}

/**
 * 거래처를 검색할 때 매칭 대상이 되는 모든 텍스트를 한 문자열로 합쳐준다.
 * (lower-case 적용은 호출 측에서 책임진다.)
 *
 * 예) "Acme Corp 에이크미"
 */
export function getAccountSearchText(account?: AccountLike | null): string {
  if (!account) return ""
  return [account.company_name, account.brand_name]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(" ")
}
