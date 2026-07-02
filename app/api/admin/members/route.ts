import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const VALID_ROLES = ["sales", "marketer", "finance", "admin"] as const
type Role = (typeof VALID_ROLES)[number]

/**
 * 관리자 권한 확인.
 * - 시스템에 admin 이 한 명도 없으면(부트스트랩) 인증된 사용자 누구나 허용.
 * - admin 이 한 명이라도 있으면 admin 만 허용.
 */
async function requireMemberAdmin() {
  const guard = await requireAuthApi()
  if (!guard.ok) return { ok: false as const, response: guard.response }

  const admin = createAdminClient()
  const { data: admins } = await admin.from("user_profiles").select("id").eq("role", "admin").limit(1)
  const bootstrap = !admins || admins.length === 0

  if (!bootstrap) {
    const { data: me } = await admin
      .from("user_profiles")
      .select("role")
      .eq("id", guard.user.id)
      .maybeSingle()
    if (me?.role !== "admin") {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "관리자만 멤버를 관리할 수 있습니다." }, { status: 403 }),
      }
    }
  }
  return { ok: true as const, admin }
}

// 멤버 생성: 로그인 계정(auth.users) 생성 → user_profiles 갱신
export async function POST(request: NextRequest) {
  const guard = await requireMemberAdmin()
  if (!guard.ok) return guard.response
  const { admin } = guard

  const body = await request.json().catch(() => ({}))
  const email = String(body.email || "").trim().toLowerCase()
  const name = String(body.name || "").trim()
  const password = String(body.password || "")
  const role: Role = VALID_ROLES.includes(body.role) ? body.role : "sales"

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (createErr || !created?.user) {
    return NextResponse.json({ error: `계정 생성 실패: ${createErr?.message || "알 수 없음"}` }, { status: 400 })
  }

  // 트리거가 user_profiles 행을 만들지만, 이름/역할/활성은 여기서 확정 (upsert)
  const { error: upErr } = await admin.from("user_profiles").upsert(
    { id: created.user.id, email, name: name || null, role, active: true },
    { onConflict: "id" }
  )
  if (upErr) {
    return NextResponse.json({ error: `프로필 저장 실패: ${upErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: created.user.id })
}

// 멤버 수정: 이름/역할/활성/정렬
export async function PATCH(request: NextRequest) {
  const guard = await requireMemberAdmin()
  if (!guard.ok) return guard.response
  const { admin } = guard

  const body = await request.json().catch(() => ({}))
  const id = String(body.id || "")
  if (!id) return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 })

  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  if (typeof body.name === "string") patch.name = body.name.trim() || null
  if (VALID_ROLES.includes(body.role)) patch.role = body.role
  if (typeof body.active === "boolean") patch.active = body.active
  if (typeof body.display_order === "number") patch.display_order = body.display_order

  const { error } = await admin.from("user_profiles").update(patch).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 멤버 비활성화(소프트). 이력 보존 위해 계정/프로필은 삭제하지 않음.
export async function DELETE(request: NextRequest) {
  const guard = await requireMemberAdmin()
  if (!guard.ok) return guard.response
  const { admin } = guard

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id 가 필요합니다." }, { status: 400 })

  const { error } = await admin
    .from("user_profiles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
