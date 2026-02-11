"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X, Plus } from "lucide-react"
import cn from "classnames"
import { createBrowserClient } from "@/lib/supabase/client"

// 호환성 있는 UUID 생성 함수
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface QuotationItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  amount: number
}

interface EditableQuotation {
  id: string
  quotation_number: string
  company: "플루타" | "오코랩스"
  title: string
  valid_until: string | null
  notes: string | null
  items: QuotationItem[]
}

interface CreateQuotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId?: string
  clientId?: string  // 기존 영업(clients)용
  activityId?: string
  onSuccess?: (quotationId: string, totalAmount: number) => void
  editQuotation?: EditableQuotation | null
}

const COMPANY_INFO = {
  플루타: {
    registration: "646-24-01010",
    name: "플루타",
    representative: "오일환",
    address: "경기도 남양주시 다산순환로 20 (다산동) 제이에이동 9층 09-07호(다산동, 다산현대프리미어캠퍼스)",
    business_type: "정보통신업",
    business_item: "응용 소프트웨어 개발 및 공급업, 광고 대행업",
    phone: "031-575-0168",
  },
  오코랩스: {
    registration: "296-86-03505",
    name: "주식회사 오코랩스",
    representative: "오일환",
    address: "경기도 남양주시 다산순환로 20 (다산동) 제이에이동 7층 704호(다산동, 다산현대프리미어캠퍼스)",
    business_type: "정보통신업",
    business_item: "응용 소프트웨어 개발 및 공급업, 광고 대행업",
    phone: "031-575-0168",
  },
}

export function CreateQuotationDialog({
  open,
  onOpenChange,
  dealId,
  clientId,
  activityId,
  onSuccess,
  editQuotation,
}: CreateQuotationDialogProps) {
  // editQuotation.id가 있을 때만 수정 모드 (AI 견적서는 id가 빈 문자열이라 생성 모드로 처리)
  const isEditMode = !!editQuotation?.id
  const [company, setCompany] = useState<"플루타" | "오코랩스">("플루타")
  const [title, setTitle] = useState("")
  const [validUntil, setValidUntil] = useState<Date>()
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: generateId(),
      name: "",
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ])
  const [saving, setSaving] = useState(false)
  const [validUntilOpen, setValidUntilOpen] = useState(false)

  // 다이얼로그가 열릴 때 폼 초기화 또는 수정 데이터 로드
  useEffect(() => {
    if (open) {
      if (editQuotation) {
        // 수정 모드: 기존 데이터 로드
        setCompany(editQuotation.company)
        setTitle(editQuotation.title)
        setValidUntil(editQuotation.valid_until ? new Date(editQuotation.valid_until) : undefined)
        setNotes(editQuotation.notes || "")
        setItems(editQuotation.items.map(item => ({
          ...item,
          id: item.id || generateId(),
        })))
      } else {
        // 생성 모드: 폼 초기화
        setCompany("플루타")
        setTitle("")
        setValidUntil(undefined)
        setNotes("")
        setItems([
          {
            id: generateId(),
            name: "",
            quantity: 1,
            unit_price: 0,
            amount: 0,
          },
        ])
      }
    }
  }, [open, editQuotation])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        name: "",
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          // 자동 계산: 수량 * 단가 = 금액
          if (field === "quantity" || field === "unit_price") {
            updated.amount = updated.quantity * updated.unit_price
          }
          return updated
        }
        return item
      }),
    )
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString("ko-KR")
  }

  const parseNumber = (str: string): number => {
    // 마이너스 부호 허용: 숫자와 마이너스만 남기고 제거
    const cleaned = str.replace(/[^0-9-]/g, "")
    // 마이너스가 앞에만 오도록 정리
    const isNegative = cleaned.startsWith("-")
    const digits = cleaned.replace(/-/g, "")
    return (isNegative ? -1 : 1) * (Number(digits) || 0)
  }

  // 공급가액 (총액)
  const supplyAmount = items.reduce((sum, item) => sum + item.amount, 0)
  // 부가세 (10%)
  const taxAmount = Math.round(supplyAmount * 0.1)
  // 총 견적금액
  const totalAmount = supplyAmount + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      alert("견적서 제목을 입력해주세요.")
      return
    }

    if (items.some((item) => !item.name.trim())) {
      alert("모든 품목명을 입력해주세요.")
      return
    }

    setSaving(true)

    try {
      const supabase = createBrowserClient()

      if (isEditMode && editQuotation) {
        // 수정 모드
        const { data: quotation, error } = await supabase
          .from("quotations")
          .update({
            company,
            title,
            items,
            supply_amount: supplyAmount,
            vat_amount: taxAmount,
            total_amount: totalAmount,
            valid_until: validUntil ? validUntil.toISOString().split("T")[0] : null,
            notes,
          })
          .eq("id", editQuotation.id)
          .select()
          .single()

        if (error) throw error

        alert("견적서가 수정되었습니다.")

        if (onSuccess) {
          onSuccess(quotation.id, totalAmount)
        }
      } else {
        // 생성 모드: 견적서 번호 생성 (Q-YYYYMMDD-001)
        const today = new Date()
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`

        // 오늘 날짜의 견적서 개수 확인
        const { data: existingQuotations } = await supabase
          .from("quotations")
          .select("quotation_number")
          .like("quotation_number", `Q-${dateStr}-%`)
          .order("quotation_number", { ascending: false })
          .limit(1)

        let sequence = 1
        if (existingQuotations && existingQuotations.length > 0) {
          const lastNumber = existingQuotations[0].quotation_number
          const lastSequence = Number.parseInt(lastNumber.split("-")[2])
          sequence = lastSequence + 1
        }

        const quotationNumber = `Q-${dateStr}-${String(sequence).padStart(3, "0")}`

        // 견적서 저장
        const { data: quotation, error } = await supabase
          .from("quotations")
          .insert({
            deal_id: dealId || null,
            client_id: clientId || null,
            activity_id: activityId,
            quotation_number: quotationNumber,
            company,
            title,
            items,
            supply_amount: supplyAmount,
            vat_amount: taxAmount,
            total_amount: totalAmount,
            valid_until: validUntil ? validUntil.toISOString().split("T")[0] : null,
            notes,
            status: "작성중",
          })
          .select()
          .single()

        if (error) throw error

        alert("견적서가 생성되었습니다.")

        if (onSuccess) {
          onSuccess(quotation.id, totalAmount)
        }
      }

      // 폼 초기화
      setTitle("")
      setValidUntil(undefined)
      setNotes("")
      setItems([
        {
          id: generateId(),
          name: "",
          quantity: 1,
          unit_price: 0,
          amount: 0,
        },
      ])

      onOpenChange(false)
    } catch (error) {
      console.error(isEditMode ? "견적서 수정 실패:" : "견적서 생성 실패:", error)
      alert(isEditMode ? "견적서 수정에 실패했습니다." : "견적서 생성에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEditMode ? "견적서 수정" : "견적서 생성"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `견적서 ${editQuotation?.quotation_number}을 수정합니다.`
              : "거래에 대한 견적서를 작성하세요."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* 회사 선택 */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <Label className="text-sm font-semibold">회사 선택</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="company"
                  value="플루타"
                  checked={company === "플루타"}
                  onChange={(e) => setCompany(e.target.value as "플루타")}
                  className="w-4 h-4"
                />
                <span>플루타 (기본)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="company"
                  value="오코랩스"
                  checked={company === "오코랩스"}
                  onChange={(e) => setCompany(e.target.value as "오코랩스")}
                  className="w-4 h-4"
                />
                <span>오코랩스</span>
              </label>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              선택한 회사: {COMPANY_INFO[company].name} ({COMPANY_INFO[company].registration})
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <h3 className="text-sm font-semibold">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  견적 제목 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="예: 홈페이지 제작 견적서"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>유효기간</Label>
                <Popover open={validUntilOpen} onOpenChange={setValidUntilOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validUntil && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? validUntil.toLocaleDateString("ko-KR") : "날짜를 선택하세요"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={(date) => {
                        setValidUntil(date)
                        setValidUntilOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* 견적 항목 */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">견적 항목</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                항목 추가
              </Button>
            </div>

            <div className="space-y-2">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-muted-foreground">
                <div className="col-span-5">품목</div>
                <div className="col-span-2 text-right">수량</div>
                <div className="col-span-2 text-right">단가</div>
                <div className="col-span-2 text-right">금액</div>
                <div className="col-span-1"></div>
              </div>

              {/* 항목 목록 */}
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      placeholder="품목명"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.unit_price || ""}
                      onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="text"
                      value={item.amount !== 0 ? formatNumber(item.amount) : ""}
                      disabled
                      className={cn("text-right bg-muted", item.amount < 0 && "text-red-600")}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 금액 합계 */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>공급가액</span>
                <span className={cn("font-semibold", supplyAmount < 0 && "text-red-600")}>₩{formatNumber(supplyAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>부가세 (10%)</span>
                <span className={cn("font-semibold", taxAmount < 0 && "text-red-600")}>₩{formatNumber(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>총 견적금액</span>
                <span className={cn("text-primary", totalAmount < 0 && "text-red-600")}>₩{formatNumber(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* 비고 */}
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              placeholder="특이사항이나 추가 정보를 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving 
                ? (isEditMode ? "수정 중..." : "생성 중...") 
                : (isEditMode ? "견적서 수정" : "견적서 생성")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
