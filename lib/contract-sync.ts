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
 * deal_id 가 있는 것들만 모아서 deals + accounts join 한 번 → 결과를 매핑.
 */
export async function enrichContractsWithLiveAccount<T extends EnrichableContract>(
  supabase: SupabaseClient,
  contracts: T[]
): Promise<T[]> {
  if (!contracts || contracts.length === 0) return contracts

  const dealIds = Array.from(
    new Set(contracts.filter((c) => c.deal_id).map((c) => c.deal_id as string))
  )
  if (dealIds.length === 0) return contracts

  const { data: deals, error } = await supabase
    .from("deals")
    .select("id, account:accounts!account_id ( company_name, representative, business_number, address )")
    .in("id", dealIds)

  if (error || !deals) {
    // 조회 실패해도 원본 client_info 로 fallback — 화면이 비지 않게.
    if (error) console.warn("[contract-enrich] deals 조회 실패:", error.message)
    return contracts
  }

  // Supabase 의 join 결과는 객체 또는 배열(N:1 / 1:N)일 수 있어 양쪽 처리
  const dealToAccount = new Map<string, ContractClientInfo>()
  for (const d of deals as Array<{ id: string; account: unknown }>) {
    const acc = Array.isArray(d.account) ? (d.account[0] as ContractClientInfo) : (d.account as ContractClientInfo)
    if (!acc) continue
    dealToAccount.set(d.id, {
      company_name: acc.company_name || "",
      representative: acc.representative || "",
      business_number: acc.business_number || "",
      address: acc.address || "",
    })
  }

  return contracts.map((c) => {
    if (!c.deal_id) return c
    const live = dealToAccount.get(c.deal_id as string)
    if (!live) return c
    // 거래처 정보가 있으면 client_info 를 그것으로 덮어씀.
    // 빈 값이라도 거래처가 정답이라 그대로 덮어씀 (계약서별 수동 변경 X).
    return { ...c, client_info: live }
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
