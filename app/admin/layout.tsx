import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/admin-guard"

/**
 * /admin/* 진입 가드.
 * - 미인증 사용자는 /login 으로
 * - 인증되었으나 admin 화이트리스트 (ADMIN_EMAILS) 에 없으면 /deals 로
 *
 * ADMIN_EMAILS 가 비어 있으면 모든 인증 사용자가 admin (운영 호환). README 참고.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin } = await getAuthContext()

  if (!user) {
    redirect("/login")
  }
  if (!isAdmin) {
    redirect("/deals")
  }

  return <>{children}</>
}
