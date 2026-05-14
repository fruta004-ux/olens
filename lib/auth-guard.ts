import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API 라우트 진입 시 호출. 인증되지 않았으면 401 NextResponse 를 반환한다.
 * 호출 측은 다음과 같이 사용한다:
 *
 *   const guard = await requireAuthApi()
 *   if (!guard.ok) return guard.response
 *   const { user, supabase } = guard
 *
 * RLS 정책이 잠긴 후 / api 라우트 자체가 미인증 호출에 노출되는 위험을 차단한다.
 */
export async function requireAuthApi() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    }
  }

  return { ok: true as const, user, supabase }
}
