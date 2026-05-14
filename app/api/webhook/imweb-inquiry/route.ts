import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// MacroDroid → 우리 시스템 웹훅 엔드포인트
// MacroDroid HTTP Request 액션이 보내는 JSON 본문을 받음:
//   { "text": "...", "title": "...", "app": "com.kakao.talk", ... }
// 본문에서 이메일/전화/문의분야/견적범위 등을 best-effort 파싱하여 inquiry_inbox 에 저장.

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ""

// 외부에서 직접 들어오는 엔드포인트 — 페이로드 크기를 엄격히 제한
const MAX_BODY_BYTES = 64 * 1024 // 64KB

interface ParsedInquiry {
  email: string | null
  phone: string | null
  field: string | null
  budget: string | null
}

function parseInquiry(text: string): ParsedInquiry {
  const bullet = "[■▪●•·]"

  const emailLine = text.match(new RegExp(`${bullet}?\\s*이메일\\s*[:：]\\s*([^\\s\\n]+)`))
  const phoneLine = text.match(new RegExp(`${bullet}?\\s*전화\\s*번호\\s*[:：]\\s*([\\d\\-+\\s]+)`))
  const fieldLine = text.match(new RegExp(`${bullet}?\\s*문의\\s*분야\\s*[:：]\\s*([^\\n]+)`))
  const budgetLine = text.match(new RegExp(`${bullet}?\\s*견적\\s*(?:범위|금액)\\s*[:：]\\s*([^\\n]+)`))

  return {
    email: emailLine?.[1]?.trim() || null,
    phone: phoneLine?.[1]?.replace(/\s+/g, "").trim() || null,
    field: fieldLine?.[1]?.trim() || null,
    budget: budgetLine?.[1]?.trim() || null,
  }
}

/** Constant-time bearer token 비교 (timing attack 방지) */
function bearerEquals(headerValue: string | null, secret: string): boolean {
  if (!headerValue || !secret) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(headerValue)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // 인증을 필수로 강제. WEBHOOK_SECRET 가 환경변수에 없으면 즉시 503.
    // (이전: secret 이 없으면 모두 통과 → 외부에서 누구나 INSERT 가능했음)
    if (!WEBHOOK_SECRET) {
      console.error("[webhook/imweb-inquiry] WEBHOOK_SECRET 환경변수가 설정되어 있지 않습니다.")
      return NextResponse.json(
        { ok: false, error: "Service not configured" },
        { status: 503 }
      )
    }

    const auth = req.headers.get("authorization")
    if (!bearerEquals(auth, WEBHOOK_SECRET)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    // 페이로드 크기 가드 (DoS 방지)
    const contentLengthHeader = req.headers.get("content-length")
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 })
    }

    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 })
    }

    let body: Record<string, unknown> = {}
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        // JSON 파싱 결과가 객체가 아니면 안전하게 raw 로 처리
        body = (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : { text: raw }
      } catch {
        // JSON 깨졌어도 원문은 보존. 본문 전체를 text 로 사용.
        body = { text: raw, _parse_error: true }
      }
    }

    const text = String(body?.text ?? body?.message ?? body?.content ?? "")
    const title = body?.title ? String(body.title) : null
    const app = body?.app ? String(body.app) : body?.package ? String(body.package) : null

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "no text in body" }, { status: 400 })
    }

    const parsed = parseInquiry(text)

    // RLS 락다운 후엔 anon 키로는 INSERT 불가능 → service_role admin client 사용.
    // 호출 자체가 위 secret 체크를 통과해야만 여기 도달함.
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("inquiry_inbox")
      .insert({
        source: "kakao_imweb",
        app_package: app,
        raw_title: title,
        raw_text: text,
        parsed_email: parsed.email,
        parsed_phone: parsed.phone,
        parsed_field: parsed.field,
        parsed_budget: parsed.budget,
        // meta 는 디버깅용. 외부 입력 그대로 저장하지 않고 정제된 값만 저장.
        meta: {
          parse_error: Boolean(body?._parse_error),
          received_bytes: raw.length,
        },
      })
      .select("id, received_at")
      .single()

    if (error) {
      console.error("[webhook/imweb-inquiry] insert error:", error.message)
      return NextResponse.json({ ok: false, error: "insert failed" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: data?.id,
      received_at: data?.received_at,
      parsed,
    })
  } catch (err: unknown) {
    console.error("[webhook/imweb-inquiry] fatal:", err instanceof Error ? err.message : "unknown")
    return NextResponse.json(
      { ok: false, error: "fatal" },
      { status: 500 }
    )
  }
}

// 헬스체크용 (브라우저에서 GET 으로 살아있는지 확인 가능). 인증 정보는 노출하지 않음.
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "imweb inquiry webhook is alive",
  })
}
