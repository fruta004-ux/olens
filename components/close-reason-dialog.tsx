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
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
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
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const toggleReason = (code: string) => {
    setSelectedReasons(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const removeReason = (code: string) => {
    setSelectedReasons(prev => prev.filter(c => c !== code))
  }

  const handleConfirm = () => {
    if (selectedReasons.length > 0) {
      // 쉼표로 구분된 문자열로 전달
      onConfirm(selectedReasons.join(','))
      setSelectedReasons([])
      setExpandedCategory(null)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setSelectedReasons([])
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
            const selectedCountInCategory = reasons.filter(r => selectedReasons.includes(r.code)).length

            return (
              <div key={categoryKey} className="border rounded-lg overflow-hidden">
                {/* 카테고리 헤더 */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    isExpanded ? "bg-muted" : "hover:bg-muted/50",
                    selectedCountInCategory > 0 && "bg-primary/10"
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
                    {selectedCountInCategory > 0 && (
                      <Badge variant="default" className="text-xs">
                        {selectedCountInCategory}개 선택
                      </Badge>
                    )}
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
                      {reasons.map((reason: CloseReason) => {
                        const isSelected = selectedReasons.includes(reason.code)
                        return (
                          <button
                            key={reason.code}
                            type="button"
                            onClick={() => toggleReason(reason.code)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <Checkbox 
                              checked={isSelected} 
                              className={cn(
                                "pointer-events-none",
                                isSelected && "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                              )}
                            />
                            <span className="font-mono text-xs opacity-70">
                              {reason.code}
                            </span>
                            <span>{reason.reason}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 선택된 사유 표시 및 버튼 */}
        <div className="border-t pt-4 space-y-3">
          {selectedReasons.length > 0 && (
            <div className="px-3 py-2 bg-muted rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  선택된 사유 ({selectedReasons.length}개):
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedReasons([])}
                  className="h-6 px-2 text-xs"
                >
                  전체 해제
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedReasons.map(code => {
                  const reason = CLOSE_REASONS_BY_CATEGORY[code[0] as keyof typeof CLOSE_REASONS_BY_CATEGORY]
                    ?.find(r => r.code === code)
                  return (
                    <Badge 
                      key={code} 
                      variant="secondary" 
                      className="font-mono flex items-center gap-1 pr-1"
                    >
                      {code}
                      <span className="font-sans text-xs opacity-70">
                        {reason?.reason}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeReason(code)
                        }}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={selectedReasons.length === 0}>
              종료 처리 ({selectedReasons.length}개)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

