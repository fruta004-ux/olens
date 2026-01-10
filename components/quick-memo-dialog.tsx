"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/client"
import { PhoneIncoming } from "lucide-react"

interface QuickMemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickMemoDialog({ open, onOpenChange }: QuickMemoDialogProps) {
  const router = useRouter()
  const [memo, setMemo] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!memo.trim()) {
      alert("메모를 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient()

      const now = new Date()
      const timestamp = now.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      const tempCompanyName = `미확인 업체 ${timestamp}`

      const { data: newAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          company_name: tempCompanyName,
          phone: phoneNumber || null,
          industry: "미확인",
          notes: "빠른 메모로 생성됨",
        })
        .select()
        .single()

      if (accountError) {
        throw accountError
      }

      const getTodayDate = () => {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, "0")
        const day = String(today.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }

      const { data: newDeal, error: dealError } = await supabase
        .from("deals")
        .insert({
          account_id: newAccount.id,
          deal_name: `${tempCompanyName} 거래`,
          stage: "S0_new_lead",
          assigned_to: "미정",
          first_contact_date: getTodayDate(),
        })
        .select()
        .single()

      if (dealError) {
        throw dealError
      }

      const { error: activityError } = await supabase.from("activities").insert({
        deal_id: newDeal.id,
        account_id: newAccount.id,
        activity_type: "통화",
        activity_date: getTodayDate(),
        assigned_to: "미정",
        title: "고객 통화",
        content: memo,
      })

      if (activityError) {
        throw activityError
      }

      onOpenChange(false)
      router.push(`/deals/${newDeal.id}`)
    } catch (error) {
      console.error("빠른 메모 저장 실패:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneIncoming className="h-5 w-5 text-primary" />
            빠른 메모
          </DialogTitle>
          <DialogDescription>
            전화 받으면서 빠르게 메모하세요. 임시 거래처가 자동으로 생성되고, 나중에 정보를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호 (선택)</Label>
            <Input
              id="phone"
              placeholder="010-1234-5678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">메모 *</Label>
            <Textarea
              id="memo"
              placeholder="통화 내용을 빠르게 메모하세요..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={8}
              className="resize-none"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : "저장하고 상세 보기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
