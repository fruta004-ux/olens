"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CLOSE_REASONS_BY_CATEGORY,
  CLOSE_REASON_CATEGORIES,
  type CloseReason,
} from "@/lib/close-reasons"

interface CloseReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reasonCode: string) => void
  dealName?: string
}

export function CloseReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  dealName,
}: CloseReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason)
      setSelectedReason(null)
      setExpandedCategory(null)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setSelectedReason(null)
    setExpandedCategory(null)
    onOpenChange(false)
  }

  const categories = Object.entries(CLOSE_REASON_CATEGORIES) as [
    keyof typeof CLOSE_REASON_CATEGORIES,
    typeof CLOSE_REASON_CATEGORIES[keyof typeof CLOSE_REASON_CATEGORIES]
  ][]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            종료 사유를 선택해주세요
          </DialogTitle>
          <DialogDescription>
            {dealName && (
              <span className="font-medium text-foreground">{dealName}</span>
            )}
            {" "}거래를 종료 처리합니다. 종료 사유를 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {categories.map(([categoryKey, category]) => {
            const reasons = CLOSE_REASONS_BY_CATEGORY[categoryKey] || []
            const isExpanded = expandedCategory === categoryKey
            const hasSelectedInCategory = reasons.some(r => r.code === selectedReason)

            return (
              <div key={categoryKey} className="border rounded-lg overflow-hidden">
                {/* 카테고리 헤더 */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    isExpanded ? "bg-muted" : "hover:bg-muted/50",
                    hasSelectedInCategory && "bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-xs font-bold", category.color)}>
                      {categoryKey}
                    </Badge>
                    <span className="font-medium">{category.label}</span>
                    <span className="text-muted-foreground text-sm">
                      ({category.name})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {reasons.length}개 항목
                    </span>
                    <svg
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* 종료 사유 목록 */}
                {isExpanded && (
                  <div className="border-t bg-background">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                      {reasons.map((reason: CloseReason) => (
                        <button
                          key={reason.code}
                          type="button"
                          onClick={() => setSelectedReason(reason.code)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                            selectedReason === reason.code
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="font-mono text-xs opacity-70">
                            {reason.code}
                          </span>
                          <span>{reason.reason}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 선택된 사유 표시 및 버튼 */}
        <div className="border-t pt-4 space-y-3">
          {selectedReason && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">선택된 사유:</span>
              <Badge variant="secondary" className="font-mono">
                {selectedReason}
              </Badge>
              <span className="text-sm font-medium">
                {CLOSE_REASONS_BY_CATEGORY[selectedReason[0] as keyof typeof CLOSE_REASONS_BY_CATEGORY]
                  ?.find(r => r.code === selectedReason)?.reason}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedReason}>
              종료 처리
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

