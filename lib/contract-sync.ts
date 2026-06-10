import type { SupabaseClient } from "@supabase/supabase-js"
import type { Contract, ContractClientInfo } from "@/lib/types/contract"

/**
 * 계약서의 갑(client_info) 정보를 거래처(accounts) 테이블에서 실시간으로 가져와 덮어쓴다.
 *
 * 설계 원칙 (2026-05-16 변경):
 *   - 거래처 정보는 "계약서마다 복사" 하지 않고 항상 accounts 테이블의 최신 값을 사용한다.
 *   - 계약서 INSERT 시점에도 client_info 를 채우긴 하지만 fallback 일 뿐.
 *   - 조회 시점마다 deal_id → accounts 의 4개 핵심 필드로 client_info 를 덮어쓴다.
 *
 * 결과:
 *   - 거래처 정보(OCR 결과 / 수기 수정) 가 바뀌면 모든 연결된 계약서에 즉시 반영.
 *   - 동기화 호출 / 수동 새로고침 버튼 등 불필요.
 *   - 과거에 빈 client_info 로 만들어진 계약서들도 자동으로 채워짐.
 *
 * 예외:
 *   - deal_id 가 없는 계약서 (직접 /contracts 에서 만든 것) 는 그대로 client_info 사용.
 */

export interface EnrichableContract {
  deal_id?: string | null
  client_info?: ContractClientInfo
  company_info?: { company_name?: string }
  seal_url?: string | null
}

/**
 * 활성화된 도장 목록을 가져와서 회사명 → seal_url 맵으로 반환.
 * 한 회사에 여러 활성 도장이 있으면 가장 최근 것 사용.
 */
async function loadActiveSeals(supabase: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const { data, error } = await supabase
    .from("company_seals")
    .select("company, seal_url, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error || !data) return map
  for (const row of data as Array<{ company: string; seal_url: string }>) {
    if (!map.has(row.company)) {
      map.set(row.company, row.seal_url)
    }
  }
  return map
}

/** 단일 계약서를 거래처 최신 정보로 enrich. deal_id 없으면 그대로 반환. */
export async function enrichContractWithLiveAccount<T extends EnrichableContract>(
  supabase: SupabaseClient,
  contract: T
): Promise<T> {
  if (!contract?.deal_id) return contract
  const enriched = await enrichContractsWithLiveAccount(supabase, [contract])
  return enriched[0] || contract
}

/**
 * 여러 계약서를 한 번의 쿼리로 enrich (목록 화면 등에서 사용).
 * 두 가지 정보를 동시에 live 로 갱신:
 *   1) 갑(client_info): deal_id → account 정보
 *   2) 을 도장(seal_url): company_info.company_name → company_seals 활성 도장
 *
 * 효과:
 *   - 거래처 정보 변경 → 즉시 반영 (스냅샷 X)
 *   - 도장 새로 업로드 → 기존 계약서들도 즉시 반영
 */
export async function enrichContractsWithLiveAccount<T extends EnrichableContract>(
  supabase: SupabaseClient,
  contracts: T[]
): Promise<T[]> {
  if (!contracts || contracts.length === 0) return contracts

  // 1) 거래처 (갑) 정보 일괄 조회
  const dealIds = Array.from(
    new Set(contracts.filter((c) => c.deal_id).map((c) => c.deal_id as string))
  )
  const dealToAccount = new Map<string, ContractClientInfo>()
  if (dealIds.length > 0) {
    const { data: deals, error } = await supabase
      .from("deals")
      .select("id, account:accounts!account_id ( company_name, representative, business_number, address )")
      .in("id", dealIds)

    if (error) {
      console.warn("[contract-enrich] deals 조회 실패:", error.message)
    } else if (deals) {
      for (const d of deals as Array<{ id: string; account: unknown }>) {
        const acc = Array.isArray(d.account)
          ? (d.account[0] as ContractClientInfo)
          : (d.account as ContractClientInfo)
        if (!acc) continue
        dealToAccount.set(d.id, {
          company_name: acc.company_name || "",
          representative: acc.representative || "",
          business_number: acc.business_number || "",
          address: acc.address || "",
        })
      }
    }
  }

  // 2) 도장 (을) 일괄 조회 — 회사명 → seal_url
  const sealsMap = await loadActiveSeals(supabase)

  return contracts.map((c) => {
    let next = c

    // 갑 정보 enrich
    // 단, 갑이 "개인" 인 계약서는 성명/전화번호/주민등록번호를 계약서에 직접 입력하므로
    // 거래처(accounts) 정보로 덮어쓰지 않는다.
    if (c.deal_id && c.client_info?.client_type !== "개인") {
      const live = dealToAccount.get(c.deal_id as string)
      if (live) next = { ...next, client_info: live }
    }

    // 도장 enrich — 을 회사명에 해당하는 활성 도장이 있으면 그걸 사용
    const sellerCompany = next.company_info?.company_name
    if (sellerCompany) {
      const liveSeal = sealsMap.get(sellerCompany)
      if (liveSeal) {
        next = { ...next, seal_url: liveSeal }
      }
    }

    return next
  })
}

/**
 * @deprecated
 * 이전엔 거래처 변경 시 contracts.client_info 를 수동 동기화했지만,
 * 이제 조회 시점에 항상 fresh 하게 가져오므로 호출할 필요 없음.
 * 호환성을 위해 함수 시그니처는 남겨두되 no-op 처리.
 */
export async function syncContractsForAccount(
  _supabase: SupabaseClient,
  _accountId: string | null | undefined
): Promise<{ updated: number; error?: string }> {
  // 새 모델 (live join) 으로 전환되어 더 이상 동기화 불필요.
  return { updated: 0 }
}

/** 외부에서 import 안전성을 위해 Contract 도 re-export */
export type { Contract }
