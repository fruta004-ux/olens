import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit, maybeCleanup } from "@/lib/rate-limit"
import type { PublicContractView } from "@/lib/types/signature"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * 공개 GET — 토큰으로 서명 요청 + 계약서 조회.
 * 처음 호출 시 opened_at 도 기록 (이메일 트래킹).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 })
    }

    // IP 기반 rate limit — brute force 방지
    maybeCleanup()
    const rl = rateLimit({
      key: `sign-get:${clientIp(_req)}`,
      limit: 60,
      windowMs: 5 * 60 * 1000,
    })
    if (!rl.ok) {
      return NextResponse.json({ error: "too many requests" }, { status: 429 })
    }

    const admin = createAdminClient()

    const { data: sigReq, error: sigErr } = await admin
      .from("signature_requests")
      .select("id, contract_id, recipient_email, recipient_name, status, expires_at, opened_at, message")
      .eq("token", token)
      .maybeSingle()

    if (sigErr) {
      console.error("[sign GET] sig req query error:", sigErr)
      return NextResponse.json({ error: "internal error" }, { status: 500 })
    }
    if (!sigReq) {
      return NextResponse.json({ error: "not found", reason: "not_found" }, { status: 404 })
    }

    // 만료 / 상태 검증
    const now = Date.now()
    const expiredAt = new Date(sigReq.expires_at).getTime()
    if (sigReq.status === "expired" || now > expiredAt) {
      // 만료 처리
      if (sigReq.status !== "expired") {
        await admin.from("signature_requests").update({ status: "expired" }).eq("id", sigReq.id)
      }
      return NextResponse.json({ error: "expired", reason: "expired" }, { status: 410 })
    }
    if (sigReq.status === "cancelled") {
      return NextResponse.json({ error: "cancelled", reason: "cancelled" }, { status: 410 })
    }
    if (sigReq.status === "signed") {
      return NextResponse.json({ error: "already signed", reason: "signed" }, { status: 409 })
    }

    // 처음 열어본 경우 기록
    if (!sigReq.opened_at) {
      await admin
        .from("signature_requests")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", sigReq.id)
    }

    // 계약서 + 거래처 + 도장 join (enrich)
    const { data: contract, error: contractErr } = await admin
      .from("contracts")
      .select(`
        contract_number, title, category, contract_date,
        client_info, contract_data, clauses,
        bank_info, company_info, seal_url, client_seal_url, deal_id
      `)
      .eq("id", sigReq.contract_id)
      .single()

    if (contractErr || !contract) {
      console.error("[sign GET] contract query error:", contractErr)
      return NextResponse.json({ error: "contract not found" }, { status: 404 })
    }

    // 갑(거래처) 정보 live join
    let clientInfo = contract.client_info as PublicContractView["client_info"]
    if (contract.deal_id) {
      const { data: deal } = await admin
        .from("deals")
        .select("account:accounts!account_id ( company_name, representative, business_number, address )")
        .eq("id", contract.deal_id)
        .maybeSingle()
      const acc = Array.isArray(deal?.account) ? deal!.account[0] : deal?.account
      if (acc) {
        clientInfo = {
          company_name: (acc as { company_name?: string }).company_name || "",
          representative: (acc as { representative?: string }).representative || "",
          business_number: (acc as { business_number?: string }).business_number || "",
          address: (acc as { address?: string }).address || "",
        }
      }
    }

    // 을 도장 live join
    let sealUrl = contract.seal_url
    const sellerCompany = (contract.company_info as { company_name?: string } | null)?.company_name
    if (sellerCompany) {
      const { data: seal } = await admin
        .from("company_seals")
        .select("seal_url")
        .eq("company", sellerCompany)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (seal?.seal_url) sealUrl = seal.seal_url
    }

    const view: PublicContractView = {
      contract_number: contract.contract_number,
      title: contract.title,
      category: contract.category,
      contract_date: contract.contract_date,
      client_info: clientInfo,
      contract_data: (contract.contract_data as Record<string, string>) || {},
      clauses: (contract.clauses as PublicContractView["clauses"]) || [],
      bank_info: (contract.bank_info as PublicContractView["bank_info"]) || {},
      company_info: (contract.company_info as PublicContractView["company_info"]) || {},
      seal_url: sealUrl,
      client_seal_url: contract.client_seal_url,
    }

    return NextResponse.json({
      ok: true,
      request: {
        id: sigReq.id,
        recipient_name: sigReq.recipient_name,
        recipient_email: sigReq.recipient_email,
        message: sigReq.message,
        expires_at: sigReq.expires_at,
      },
      contract: view,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    console.error("[sign GET] 예외:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
