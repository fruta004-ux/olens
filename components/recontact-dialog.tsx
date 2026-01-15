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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon, RotateCcw, PenLine } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { RECONTACT_REASONS, type RecontactReason } from "@/lib/recontact-reasons"

interface RecontactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reasonCode: string, recontactDate: string) => void
  dealName?: string
}

export function RecontactDialog({
  open,
  onOpenChange,
  onConfirm,
  dealName,
}: RecontactDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState("")
  const [recontactDate, setRecontactDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleConfirm = () => {
    if (selectedReason && recontactDate) {
      const year = recontactDate.getFullYear()
      const month = String(recontactDate.getMonth() + 1).padStart(2, "0")
      const day = String(recontactDate.getDate()).padStart(2, "0")
      const formattedDate = `${year}-${month}-${day}`
      
      // 직접 입력인 경우 커스텀 사유 전달
      const reasonToSave = selectedReason === "RC99" ? customReason : selectedReason
      onConfirm(reasonToSave, formattedDate)
      resetForm()
      onOpenChange(false)
    }
  }

  const isCustomReason = selectedReason === "RC99"
  const isValid = selectedReason && recontactDate && (!isCustomReason || customReason.trim())

  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setSelectedReason(null)
    setCustomReason("")
    setRecontactDate(undefined)
  }

  // 빠른 날짜 선택 옵션
  const quickDateOptions = [
    { label: "1주 후", days: 7 },
    { label: "2주 후", days: 14 },
    { label: "1개월 후", days: 30 },
    { label: "3개월 후", days: 90 },
  ]

  const setQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    setRecontactDate(date)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-500" />
            재접촉 설정
          </DialogTitle>
          <DialogDescription>
            {dealName && (
              <span className="font-medium text-foreground">{dealName}</span>
            )}
            {" "}거래를 재접촉 대기로 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 재접촉 예정일 선택 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              재접촉 예정일 <span className="text-destructive">*</span>
            </label>
            
            {/* 빠른 선택 버튼 */}
            <div className="flex flex-wrap gap-2">
              {quickDateOptions.map((option) => (
                <Button
                  key={option.days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDate(option.days)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* 날짜 선택 */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !recontactDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {recontactDate
                    ? format(recontactDate, "PPP (EEEE)", { locale: ko })
                    : "날짜를 선택하세요"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={recontactDate}
                  onSelect={(date) => {
                    setRecontactDate(date)
                    setCalendarOpen(false)
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 재접촉 사유 선택 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              재접촉 사유 <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {RECONTACT_REASONS.map((reason: RecontactReason) => (
                <button
                  key={reason.code}
                  type="button"
                  onClick={() => setSelectedReason(reason.code)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-colors border",
                    selectedReason === reason.code
                      ? "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100"
                      : "hover:bg-muted border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    selectedReason === reason.code
                      ? "border-blue-500"
                      : "border-gray-300"
                  )}>
                    {selectedReason === reason.code && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  {reason.code === "RC99" ? (
                    <span className="flex items-center gap-2">
                      <PenLine className="h-4 w-4" />
                      {reason.reason}
                    </span>
                  ) : (
                    <span>{reason.reason}</span>
                  )}
                </button>
              ))}
            </div>
            
            {/* 직접 입력 필드 */}
            {isCustomReason && (
              <div className="mt-3 pl-7">
                <Input
                  placeholder="재접촉 사유를 입력하세요"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="bg-background"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValid}
            className="bg-blue-600 hover:bg-blue-700"
          >
            재접촉 설정
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
