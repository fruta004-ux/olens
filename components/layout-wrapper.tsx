"use client"

import { FloatingFeedbackButton } from "@/components/floating-feedback-button"
import { Toaster } from "@/components/ui/sonner"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingFeedbackButton />
      <Toaster position="top-center" richColors closeButton />
    </>
  )
}

