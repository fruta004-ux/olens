"use client"

import { usePathname } from "next/navigation"
import { FloatingFeedbackButton } from "@/components/floating-feedback-button"
import { FloatingInquiryBell } from "@/components/floating-inquiry-bell"
import FinanceSpecPopup from "@/components/finance-spec-popup"
import { Toaster } from "@/components/ui/sonner"

/**
 * 외부 사용자(거래처)에게 노출되는 공개 페이지에서는 floating UI 를 숨김.
 * /sign/* 은 외부 서명 페이지 — 내부 CRM 알림이 보이면 안 됨.
 */
const PUBLIC_PATH_PREFIXES = ["/sign/"]
const PUBLIC_PATHS_EXACT = ["/sign"]

function isInternalPath(pathname: string | null): boolean {
  if (!pathname) return true
  if (PUBLIC_PATHS_EXACT.includes(pathname)) return false
  return !PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showInternalUI = isInternalPath(pathname)

  return (
    <>
      {children}
      {showInternalUI && (
        <>
          <FinanceSpecPopup />
          <FloatingInquiryBell />
          <FloatingFeedbackButton />
        </>
      )}
      <Toaster position="top-center" richColors closeButton />
    </>
  )
}

