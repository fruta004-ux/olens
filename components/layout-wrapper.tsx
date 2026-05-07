"use client"

import { FloatingFeedbackButton } from "@/components/floating-feedback-button"
import { FloatingInquiryBell } from "@/components/floating-inquiry-bell"
import { Toaster } from "@/components/ui/sonner"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingInquiryBell />
      <FloatingFeedbackButton />
      <Toaster position="top-center" richColors closeButton />
    </>
  )
}

