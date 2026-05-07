"use client"

import { usePathname } from "next/navigation"
import { InquiryInboxBell } from "@/components/inquiry-inbox-bell"

// CrmHeader 가 들어가는 페이지들 (정확 매칭). 이들 외에는 floating 표시.
const CRM_HEADER_EXACT_ROUTES = new Set<string>([
  "/deals",
  "/clients",
  "/contacts",
  "/contracts",
  "/tasks",
  "/statistics",
  "/reports",
  "/quotations",
  "/project-specs",
  "/admin",
])

// PageHeader 가 들어가는 페이지들 (정확 매칭).
const PAGE_HEADER_EXACT_ROUTES = new Set<string>([
  "/",
  "/memos",
  "/dashboard",
])

const HIDDEN_ROUTES = new Set<string>(["/login"])

export function FloatingInquiryBell() {
  const pathname = usePathname()

  if (!pathname) return null
  if (HIDDEN_ROUTES.has(pathname)) return null
  if (CRM_HEADER_EXACT_ROUTES.has(pathname)) return null
  if (PAGE_HEADER_EXACT_ROUTES.has(pathname)) return null

  // 그 외 모든 페이지 (상세, 설정, 패치노트 등) 에서 floating 표시
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <InquiryInboxBell variant="floating" />
    </div>
  )
}

export default FloatingInquiryBell
