import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// MacroDroid → 우리 시스템 웹훅 엔드포인트
// MacroDroid HTTP Request 액션이 보내는 JSON 본문을 받음:
//   { "text": "...", "title": "...", "app": "com.kakao.talk", ... }
// 본문에서 이메일/전화/문의분야/견적범위 등을 best-effort 파싱하여 inquiry_inbox 에 저장.

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ""

interface ParsedInquiry {
  email: string | null
  phone: string | null
  field: string | null
  budget: string | null
}

function parseInquiry(text: string): ParsedInquiry {
  // 라벨 형식: "■ 이메일 : value"  또는  "■이메일:value"
  // 한자 사각형(■) 외에 ▪, ●, • 같은 변형 케이스도 대응
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

export async function POST(req: NextRequest) {
  try {
    // 인증 (선택): WEBHOOK_SECRET 설정돼 있으면 Authorization: Bearer <secret> 검증
    if (WEBHOOK_SECRET) {
      const auth = req.headers.get("authorization") || ""
      const expected = `Bearer ${WEBHOOK_SECRET}`
      if (auth !== expected) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
      }
    }

    // 본문은 한 번만 읽기 가능 (stream). 항상 raw text 먼저 받고 JSON 시도.
    // MacroDroid 가 보내는 JSON 안의 text 필드에 줄바꿈/따옴표가 escape 안 된 경우
    // JSON.parse 실패 → 그래도 raw text 자체로는 처리 가능하도록 fallback.
    const raw = await req.text()
    let body: any = {}
    if (raw) {
      try {
        body = JSON.parse(raw)
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

    const supabase = await createClient()
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
        meta: body,
      })
      .select("id, received_at")
      .single()

    if (error) {
      console.error("[webhook/imweb-inquiry] insert error:", error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: data?.id,
      received_at: data?.received_at,
      parsed,
    })
  } catch (err: any) {
    console.error("[webhook/imweb-inquiry] fatal:", err)
    return NextResponse.json({ ok: false, error: err?.message || "fatal" }, { status: 500 })
  }
}

// 헬스체크용 (브라우저에서 GET 으로 살아있는지 확인 가능)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "imweb inquiry webhook is alive",
    auth_required: Boolean(WEBHOOK_SECRET),
  })
}
