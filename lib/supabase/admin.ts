import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * service_role 키를 사용하는 서버 전용 Supabase 클라이언트.
 * 반드시 서버 코드 (route handler / server action) 에서만 사용한다.
 * 클라이언트 번들에 절대 포함되면 안 된다.
 *
 * 사용처:
 *  - 외부 webhook 처리 (인증 사용자 컨텍스트가 없는 자동화 호출)
 *  - cron / 자동 스냅샷 등 서버 백그라운드 작업
 *
 * RLS 를 우회하므로 호출 측에서 추가 검증 (webhook secret, cron secret 등) 후에만 사용해야 한다.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient(): SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있지 않습니다. " +
        ".env.local 과 Vercel Project Settings 에 추가하세요."
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
