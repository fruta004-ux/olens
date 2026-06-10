import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit, maybeCleanup } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BODY_BYTES = 4 * 1024 * 1024 // 4MB (도장 base64 이미지)
const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3MB 실제 이미지

interface Body {
  signature_image_base64?: string // "data:image/png;base64,..." 또는 raw base64
  signature_mime?: string // "image/png" / "image/jpeg"
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

function userAgent(req: NextRequest): string {
  return (req.headers.get("user-agent") || "").slice(0, 500)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 })
    }

    maybeCleanup()
    const rl = rateLimit({
      key: `sign-submit:${clientIp(req)}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    })
    if (!rl.ok) {
      return NextResponse.json({ error: "too many requests" }, { status: 429 })
    }

    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload too large" }, { status: 413 })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const raw = (body.signature_image_base64 || "").trim()
    if (!raw) {
      return NextResponse.json({ error: "서명 이미지가 없습니다." }, { status: 400 })
    }

    // data URL prefix 제거
    const base64 = raw.replace(/^data:image\/[a-zA-Z+]+;base64,/, "")
    const mime = (body.signature_mime || "image/png").toLowerCase()
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
      return NextResponse.json({ error: "허용되지 않은 mime: " + mime }, { status: 400 })
    }

    let bytes: Buffer
    try {
      bytes = Buffer.from(base64, "base64")
    } catch {
      return NextResponse.json({ error: "이미지 디코딩 실패" }, { status: 400 })
    }
    if (bytes.length === 0) {
      return NextResponse.json({ error: "빈 이미지" }, { status: 400 })
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "이미지가 너무 큽니다 (3MB 이하)" }, { status: 413 })
    }

    const admin = createAdminClient()

    // 1) 토큰 검증 + 상태 확인
    const { data: sigReq, error: sigErr } = await admin
      .from("signature_requests")
      .select("id, contract_id, status, expires_at")
      .eq("token", token)
      .maybeSingle()

    if (sigErr) {
      console.error("[sign submit] sig query error:", sigErr)
      return NextResponse.json({ error: "internal error" }, { status: 500 })
    }
    if (!sigReq) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const now = Date.now()
    if (sigReq.status !== "pending") {
      return NextResponse.json({ error: `상태가 ${sigReq.status} 입니다.` }, { status: 409 })
    }
    if (new Date(sigReq.expires_at).getTime() < now) {
      await admin.from("signature_requests").update({ status: "expired" }).eq("id", sigReq.id)
      return NextResponse.json({ error: "expired" }, { status: 410 })
    }

    // 2) Storage 업로드
    const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1]
    const fileName = `${sigReq.contract_id}_${Date.now()}.${ext}`
    const { error: uploadErr } = await admin.storage
      .from("signature-uploads")
      .upload(fileName, bytes, {
        contentType: mime,
        upsert: false,
      })

    if (uploadErr) {
      console.error("[sign submit] storage upload error:", uploadErr)
      return NextResponse.json(
        { error: "이미지 업로드 실패: " + uploadErr.message },
        { status: 500 }
      )
    }

    const { data: urlData } = admin.storage.from("signature-uploads").getPublicUrl(fileName)
    const sealUrl = urlData?.publicUrl
    if (!sealUrl) {
      return NextResponse.json({ error: "이미지 URL 생성 실패" }, { status: 500 })
    }

    const signedAtIso = new Date().toISOString()

    // 3) signature_requests 업데이트
    const { error: updateSigErr } = await admin
      .from("signature_requests")
      .update({
        status: "signed",
        signed_at: signedAtIso,
        signer_ip: clientIp(req),
        signer_user_agent: userAgent(req),
        signature_image_url: sealUrl,
      })
      .eq("id", sigReq.id)

    if (updateSigErr) {
      console.error("[sign submit] sig update error:", updateSigErr)
      return NextResponse.json({ error: updateSigErr.message }, { status: 500 })
    }

    // 4) contracts 업데이트 (갑 도장 + 상태)
    const { data: contractRow } = await admin
      .from("contracts")
      .select("client_info")
      .eq("id", sigReq.contract_id)
      .single()
    const clientName =
      (contractRow?.client_info as { company_name?: string } | null)?.company_name || "거래처"

    await admin
      .from("contracts")
      .update({
        client_seal_url: sealUrl,
        client_signed_at: signedAtIso,
        status: "서명완료",
      })
      .eq("id", sigReq.contract_id)

    // 5) 영업에게 알림 — inquiry_inbox 에 row INSERT (기존 종 아이콘 시스템 활용)
    try {
      await admin.from("inquiry_inbox").insert({
        source: "signature_completed",
        raw_title: `🖋️ 서명 완료 - ${clientName}`,
        raw_text: `${clientName} 가 서명을 완료했습니다. (계약서 ${sigReq.contract_id.slice(0, 8)})`,
        meta: {
          contract_id: sigReq.contract_id,
          signature_request_id: sigReq.id,
          signed_at: signedAtIso,
        },
      })
    } catch (err) {
      // 알림 실패는 서명 자체엔 영향 없음
      console.warn("[sign submit] inquiry_inbox insert 실패:", err)
    }

    return NextResponse.json({
      ok: true,
      signed_at: signedAtIso,
      // 서명 페이지가 완료 화면에서 도장 찍힌 계약서를 바로 보여줄 수 있도록 반환
      seal_url: sealUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    console.error("[sign submit] 예외:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
