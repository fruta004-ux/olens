import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuthApi } from "@/lib/auth-guard"
import { rateLimit, maybeCleanup } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildSignatureRequestEmail, sendMail } from "@/lib/email"
import { SIGNATURE_REQUEST_TTL_MS } from "@/lib/types/signature"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BODY_BYTES = 16 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Body {
  recipient_email?: string
  recipient_name?: string
  message?: string
  cc_emails?: string[]
}

const MAX_CC_COUNT = 10

function getBaseUrl(req: NextRequest): string {
  // 1) 명시적 환경변수 우선
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "")
  // 2) Vercel 자동
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  // 3) 요청 헤더에서 추출 (로컬 dev)
  const host = req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") || "https"
  if (host) return `${proto}://${host}`
  return "http://localhost:3000"
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAuthApi()
    if (!guard.ok) return guard.response

    maybeCleanup()
    const rl = rateLimit({
      key: `sig-send:${guard.user.id}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    })
    if (!rl.ok) {
      return NextResponse.json(
        { error: `너무 많은 요청. ${Math.ceil(rl.retryAfterMs / 1000)}초 후 다시 시도하세요.` },
        { status: 429 }
      )
    }

    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "요청 본문이 너무 큽니다." }, { status: 413 })
    }

    const { id: contractId } = await ctx.params
    if (!contractId) {
      return NextResponse.json({ error: "contract id 누락" }, { status: 400 })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const recipient_email = (body.recipient_email || "").trim().toLowerCase()
    const recipient_name = (body.recipient_name || "").trim() || null
    const message = (body.message || "").trim().slice(0, 1000) || null

    if (!EMAIL_RE.test(recipient_email)) {
      return NextResponse.json({ error: "올바른 이메일 주소가 아닙니다." }, { status: 400 })
    }

    // 참조(CC) 이메일 정제 + 검증
    // - 받는 사람(to)과 동일한 주소는 제외 (중복 발송 방지)
    // - 잘못된 형식은 거부 (어떤 게 틀렸는지 알려줌)
    // - 최대 10명
    const cc_emails: string[] = []
    const invalid_cc: string[] = []
    if (Array.isArray(body.cc_emails)) {
      for (const raw of body.cc_emails) {
        const e = String(raw || "").trim().toLowerCase()
        if (!e) continue
        if (e === recipient_email) continue
        if (!EMAIL_RE.test(e)) {
          invalid_cc.push(e)
          continue
        }
        if (!cc_emails.includes(e)) cc_emails.push(e)
      }
    }
    if (invalid_cc.length > 0) {
      return NextResponse.json(
        { error: `참조인 이메일 중 잘못된 형식: ${invalid_cc.join(", ")}` },
        { status: 400 }
      )
    }
    if (cc_emails.length > MAX_CC_COUNT) {
      return NextResponse.json(
        { error: `참조인은 최대 ${MAX_CC_COUNT}명까지 가능합니다.` },
        { status: 400 }
      )
    }

    // 계약서 존재 확인 + 회사명/제목 가져오기 (인증된 사용자라 RLS 통과)
    const supabase = guard.supabase
    const { data: contract, error: contractErr } = await supabase
      .from("contracts")
      .select("id, title, category, company_info, client_info, deal_id")
      .eq("id", contractId)
      .single()

    if (contractErr || !contract) {
      return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 })
    }

    // 토큰 생성 + DB INSERT (service_role 로 — anon 차단되어 있어도 OK)
    const admin = createAdminClient()
    const token = randomUUID().replace(/-/g, "")
    const expiresAt = new Date(Date.now() + SIGNATURE_REQUEST_TTL_MS)

    const { data: sigReq, error: insertErr } = await admin
      .from("signature_requests")
      .insert({
        contract_id: contractId,
        recipient_email,
        recipient_name,
        token,
        message,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        created_by: guard.user.id,
        cc_emails,
      })
      .select("id, token, expires_at")
      .single()

    if (insertErr || !sigReq) {
      console.error("[send-for-signature] DB insert 실패:", insertErr)
      return NextResponse.json(
        { error: "서명 요청 생성 실패: " + (insertErr?.message || "unknown") },
        { status: 500 }
      )
    }

    // contracts 에 활성 서명 요청 ID 연결
    await admin
      .from("contracts")
      .update({ active_signature_request_id: sigReq.id })
      .eq("id", contractId)

    // 메일 발송
    const baseUrl = getBaseUrl(req)
    const signUrl = `${baseUrl}/sign/${sigReq.token}`
    const sellerCompany =
      (contract.company_info as { company_name?: string } | null)?.company_name || "플루타"

    const mail = buildSignatureRequestEmail({
      recipientName: recipient_name,
      signUrl,
      contractTitle: contract.title,
      contractCategory: contract.category,
      message,
      expiresAt,
      sellerCompany,
    })

    const result = await sendMail({
      to: recipient_email,
      toName: recipient_name || undefined,
      cc: cc_emails.length > 0 ? cc_emails : undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: guard.user.email || undefined,
    })

    if (!result.ok) {
      // 메일 발송 실패 → 서명 요청을 cancelled 로 표시
      await admin
        .from("signature_requests")
        .update({ status: "cancelled" })
        .eq("id", sigReq.id)

      return NextResponse.json(
        {
          error: "메일 발송 실패: " + (result.error || "unknown"),
          hint: "RESEND_API_KEY 와 EMAIL_FROM 환경변수를 확인해주세요.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      signature_request_id: sigReq.id,
      sign_url: signUrl,
      expires_at: sigReq.expires_at,
      email_id: result.id,
      cc_count: cc_emails.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    console.error("[send-for-signature] 예외:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
