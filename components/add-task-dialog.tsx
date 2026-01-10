"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { createBrowserClient } from "@supabase/ssr"
import { FileText } from "lucide-react"

interface AddTaskDialogProps {
  onTaskAdded?: () => void
  dealId?: string
}

export function AddTaskDialog({ onTaskAdded, dealId }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [deals, setDeals] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "작업",
    priority: "보통",
    due_date: "",
    due_time: "",
    assigned_to: "오일환",
    deal_id: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const loadDeals = async () => {
      const { data } = await supabase
        .from("deals")
        .select(`
          id,
          title,
          account:accounts!account_id (
            company_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      setDeals(data || [])
    }

    if (open) {
      loadDeals()
      if (dealId) {
        setFormData((prev) => ({ ...prev, deal_id: dealId }))
      }
    }
  }, [open, dealId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: formData.title,
          description: formData.description || null,
          task_type: formData.task_type,
          priority: formData.priority,
          due_date: formData.due_date,
          due_time: formData.due_time || null,
          status: "진행중",
          assigned_to: formData.assigned_to,
          deal_id: formData.deal_id || null,
        },
      ])
      .select()

    if (error) {
      console.error("[v0] 작업 생성 실패:", error)
      alert("작업 생성에 실패했습니다: " + error.message)
    } else {
      setOpen(false)
      setFormData({
        title: "",
        description: "",
        task_type: "작업",
        priority: "보통",
        due_date: "",
        due_time: "",
        assigned_to: "오일환",
        deal_id: "",
      })
      onTaskAdded?.()
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {dealId ? (
          <Button className="justify-start bg-transparent" variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            작업
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />새 작업
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="px-6 py-6">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-2xl">작업 생성</SheetTitle>
            <SheetDescription>작업 정보를 입력하여 새로운 활동을 추적하세요.</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">기본 정보</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="taskTitle" className="text-sm font-medium">
                    작업 제목 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="taskTitle"
                    placeholder="고객 미팅"
                    required
                    className="h-10"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="taskType" className="text-sm font-medium">
                      작업 유형 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.task_type}
                      onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                    >
                      <SelectTrigger id="taskType" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="작업">작업</SelectItem>
                        <SelectItem value="미팅">미팅</SelectItem>
                        <SelectItem value="전화">전화</SelectItem>
                        <SelectItem value="이메일">이메일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority" className="text-sm font-medium">
                      우선순위 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger id="priority" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="높음">높음</SelectItem>
                        <SelectItem value="보통">보통</SelectItem>
                        <SelectItem value="낮음">낮음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 일정 섹션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">일정</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate" className="text-sm font-medium">
                      마감일 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      required
                      className="h-10"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueTime" className="text-sm font-medium">
                      시간
                    </Label>
                    <Input
                      id="dueTime"
                      type="time"
                      className="h-10"
                      value={formData.due_time}
                      onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 연관 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">연관 정보</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="relatedDeal" className="text-sm font-medium">
                    연관 거래
                  </Label>
                  <Select
                    value={formData.deal_id}
                    onValueChange={(value) => setFormData({ ...formData, deal_id: value })}
                  >
                    <SelectTrigger id="relatedDeal" className="h-10">
                      <SelectValue placeholder="선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      {deals.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.account?.company_name || "거래처 없음"} - {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* 담당자 섹션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">담당자</h3>
              <div className="grid gap-2">
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger id="assignee" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="오일환">오일환</SelectItem>
                    <SelectItem value="박상혁">박상혁</SelectItem>
                    <SelectItem value="윤경호">윤경호</SelectItem>
                    <SelectItem value="미정">미정</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* 설명 섹션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">설명</h3>
              <div className="grid gap-2">
                <Textarea
                  id="taskDescription"
                  placeholder="작업에 대한 상세 설명..."
                  rows={4}
                  className="resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <SheetFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto">
              생성
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
