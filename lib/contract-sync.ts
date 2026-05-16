import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * 거래처(account) 정보가 변경되면 이 거래처에 연결된 모든 계약서의
 * client_info(갑 정보)를 거래처의 최신 정보로 자동 동기화한다.
 *
 * 호출 시점:
 *  - 거래처 정보가 수기로 수정될 때 (handleUpdateAccount)
 *  - 사업자등록증 OCR 결과가 거래처에 반영될 때 (마찬가지로 handleUpdateAccount)
 *  → 두 경로 모두 handleUpdateAccount 한 곳을 통과하므로 거기서만 호출하면 됨.
 *
 * 정책:
 *  - 거래처의 4개 핵심 필드(company_name / representative / business_number / address)를
 *    계약서 client_info 에 그대로 덮어씀
 *  - 한 거래처 → 여러 deals → 여러 contracts 가능. 모두 한 번에 갱신.
 *  - 실패해도 silently. 거래처 수정 자체가 막히면 안 됨.
 *
 * 향후 확장 여지:
 *  - 사용자가 계약서별로 client_info 를 수동 편집한 경우 동기화 제외하려면
 *    contracts 에 client_info_locked: boolean 컬럼을 추가하고 여기서 필터링.
 */
export async function syncContractsForAccount(
  supabase: SupabaseClient,
  accountId: string | null | undefined
): Promise<{ updated: number; error?: string }> {
  if (!accountId) return { updated: 0 }

  try {
    // 1) 거래처 최신 정보
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("company_name, representative, business_number, address")
      .eq("id", accountId)
      .single()

    if (accErr || !account) {
      return { updated: 0, error: accErr?.message || "account not found" }
    }

    // 2) 이 거래처에 속한 모든 deal_id
    const { data: deals, error: dealsErr } = await supabase
      .from("deals")
      .select("id")
      .eq("account_id", accountId)

    if (dealsErr) {
      return { updated: 0, error: dealsErr.message }
    }

    const dealIds = (deals || []).map((d: { id: string }) => d.id)
    if (dealIds.length === 0) return { updated: 0 }

    // 3) 해당 deal_id 들에 연결된 모든 계약서의 client_info 덮어쓰기
    const newClientInfo = {
      company_name: account.company_name || "",
      representative: account.representative || "",
      business_number: account.business_number || "",
      address: account.address || "",
    }

    const { data: updated, error: updateErr } = await supabase
      .from("contracts")
      .update({
        client_info: newClientInfo,
        updated_at: new Date().toISOString(),
      })
      .in("deal_id", dealIds)
      .select("id")

    if (updateErr) {
      return { updated: 0, error: updateErr.message }
    }

    return { updated: updated?.length ?? 0 }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error"
    return { updated: 0, error: message }
  }
}
