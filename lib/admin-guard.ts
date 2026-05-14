import { createClient } from "@/lib/supabase/server"

/**
 * 관리자 권한 체크. 환경변수 ADMIN_EMAILS (콤마 구분) 화이트리스트 기반.
 * 다중 사용자 / role 컬럼 도입 전까지의 임시 해결책.
 *
 * 사용:
 *   .env.local 에 ADMIN_EMAILS=admin@oort.kr,owner@plutaweb.com 형태로 추가
 *
 * 화이트리스트가 비어 있으면 모든 인증 사용자가 admin 으로 취급된다 (운영 초기 무중단을 위해).
 * 운영 안정화 후 반드시 ADMIN_EMAILS 를 설정하기를 권장.
 */

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || ""
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

export async function getAuthContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, isAdmin: false } as const
  }

  const allowed = parseAdminEmails()
  const email = (user.email || "").toLowerCase()

  // 화이트리스트가 설정 안 됐으면 인증된 모두 admin (초기 운영 호환)
  const isAdmin = allowed.size === 0 ? true : allowed.has(email)

  return { user, isAdmin } as const
}

export async function isAdminOnly() {
  const { isAdmin } = await getAuthContext()
  return isAdmin
}
