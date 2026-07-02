// 멤버(직원) 단일 소스 — user_profiles 기반.
// 모든 담당자 드롭다운(영업/PO/재무)이 이 목록을 참조한다.

import type { SupabaseClient } from "@supabase/supabase-js"

export type MemberRole = "sales" | "marketer" | "video" | "finance" | "admin"

export const ROLE_LABEL: Record<MemberRole, string> = {
  sales: "영업",
  marketer: "그로우",
  video: "영상",
  finance: "재무",
  admin: "관리자",
}

export const ROLE_OPTIONS: MemberRole[] = ["sales", "marketer", "video", "finance", "admin"]

// 영업담당 후보 역할 / PO 후보 역할
export const SALES_ROLES: MemberRole[] = ["sales"]
export const PO_ROLES: MemberRole[] = ["marketer", "video"]

export interface Member {
  id: string
  name: string | null
  email: string | null
  role: MemberRole
  active: boolean
  display_order: number
}

/** 활성 멤버만 (드롭다운용). 정렬: display_order → 이름 */
export async function fetchActiveMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, name, email, role, active, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
  if (error) {
    console.warn("[members] 활성 멤버 조회 실패:", error.message)
    return []
  }
  return (data || []) as Member[]
}

/** 전체 멤버 (관리 화면용 — 비활성 포함) */
export async function fetchAllMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, name, email, role, active, display_order")
    .order("active", { ascending: false })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
  if (error) {
    console.warn("[members] 전체 멤버 조회 실패:", error.message)
    return []
  }
  return (data || []) as Member[]
}

/** 표시 이름 (없으면 이메일 로컬part) */
export function memberDisplayName(m: Pick<Member, "name" | "email">): string {
  return m.name || m.email?.split("@")[0] || "(이름없음)"
}
