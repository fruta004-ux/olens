"use client"

import { FloatingFeedbackButton } from "@/components/floating-feedback-button"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingFeedbackButton />
    </>
  )
}

