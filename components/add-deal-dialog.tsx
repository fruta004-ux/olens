"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import cn from "classnames"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface AddDealDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  stage?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const formatNumberWithCommas = (value: string): string => {
  const numberOnly = value.replace(/[^0-9]/g, "")
  if (!numberOnly) return ""
  return Number(numberOnly).toLocaleString("ko-KR")
}

export function AddDealDialog({ open: controlledOpen, onOpenChange, stage, trigger, onSuccess }: AddDealDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const [accounts, setAccounts] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [filteredContacts, setFilteredContacts] = useState<any[]>([])
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    stage: stage || "S0_new_lead",
    amount_range: "",
    amount_custom: "", // 직접 입력 금액을 위한 별도 필드 추가
    account_id: "",
    phone: "",
    email: "",
    next_contact_date: "",
    first_contact_date: "",
    needs_summary: "", // 다중 선택 니즈를 쉼표로 구분하여 저장
    inflow_source: "",
    inquiry_channel: "",
    company: "",
    notes: "",
    assigned_to: "오일환",
  })
  const [saving, setSaving] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [firstContactPopoverOpen, setFirstContactPopoverOpen] = useState(false)

  const [needsOptions, setNeedsOptions] = useState<{ value: string; label: string }[]>([])
  const [leadSourceOptions, setLeadSourceOptions] = useState<{ value: string; label: string }[]>([])
  const [inquiryChannelOptions, setInquiryChannelOptions] = useState<{ value: string; label: string }[]>([])

  const loadData = async () => {
    const supabase = createBrowserClient()

    const { data: accountsData } = await supabase.from("accounts").select("id, company_name").order("company_name")

    const { data: contactsData } = await supabase.from("contacts").select("id, name, account_id").order("name")

    const { data: settingsData } = await supabase.from("settings").select("*").order("display_order")

    setAccounts(accountsData || [])
    setContacts(contactsData || [])

    if (settingsData) {
      setNeedsOptions(
        settingsData.filter((s) => s.category === "needs").map((s) => ({ value: s.value, label: s.value })),
      )
      setLeadSourceOptions(
        settingsData.filter((s) => s.category === "source").map((s) => ({ value: s.value, label: s.value })),
      )
      setInquiryChannelOptions(
        settingsData.filter((s) => s.category === "channel").map((s) => ({ value: s.value, label: s.value })),
      )
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
      if (stage) {
        setFormData((prev) => ({ ...prev, stage }))
      }
    }
  }, [open, stage])

  useEffect(() => {
    if (formData.account_id) {
      const filtered = contacts.filter((c) => c.account_id === formData.account_id)
      setFilteredContacts(filtered)
    } else {
      setFilteredContacts(contacts)
    }
  }, [formData.account_id, contacts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supabase = createBrowserClient()

      let finalAccountId = formData.account_id

      if (!finalAccountId && formData.name) {
        const { data: newAccount, error: accountError } = await supabase
          .from("accounts")
          .insert({
            company_name: formData.name,
            phone: formData.phone || null,
            email: formData.email || null,
          })
          .select()
          .single()

        if (accountError) throw accountError

        finalAccountId = newAccount.id
      }

      const finalAmountRange = formData.amount_custom || formData.amount_range

      const { data, error } = await supabase
        .from("deals")
        .insert([
          {
            deal_name: formData.name,
            stage: formData.stage,
            amount_range: finalAmountRange,
            account_id: finalAccountId,
            contact_id: null,
            next_contact_date: formData.next_contact_date || null,
            first_contact_date: formData.first_contact_date || null,
            needs_summary: formData.needs_summary || null,
            inflow_source: formData.inflow_source || null,
            inquiry_channel: formData.inquiry_channel || null,
            company: formData.company || null,
            notes: formData.notes,
            assigned_to: formData.assigned_to,
            pipeline: "영업 파이프라인 CRM",
            grade: "추정불가",
          },
        ])
        .select()

      if (error) throw error

      setOpen(false)
      if (onSuccess) {
        onSuccess()
      }
      setFormData({
        name: "",
        stage: stage || "S0_new_lead",
        amount_range: "",
        amount_custom: "",
        account_id: "",
        phone: "",
        email: "",
        next_contact_date: "",
        first_contact_date: "",
        needs_summary: "",
        inflow_source: "",
        inquiry_channel: "",
        company: "",
        notes: "",
        assigned_to: "오일환",
      })
    } catch (error) {
      console.error("거래 추가 실패:", error)
      alert("거래 추가에 실패했습니다.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-6">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">거래 생성</SheetTitle>
            <SheetDescription className="text-sm">거래 정보를 입력하여 새로운 영업 기회를 추적하세요.</SheetDescription>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-3 p-5 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealName" className="text-sm font-medium text-foreground">
                  고객명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dealName"
                  placeholder="클루터"
                  required
                  className="h-11 bg-background"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage" className="text-sm font-medium text-foreground">
                  거래 단계 <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                  <SelectTrigger id="stage" className="h-11 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S0_new_lead">S0_신규 유입</SelectItem>
                    <SelectItem value="S1_qualified">S1_유효 리드</SelectItem>
                    <SelectItem value="S2_consultation">S2_상담 완료</SelectItem>
                    <SelectItem value="S3_proposal">S3_제안 발송</SelectItem>
                    <SelectItem value="S4_decision">S4_결정 대기</SelectItem>
                    <SelectItem value="S5_contract">S5_계약완료</SelectItem>
                    <SelectItem value="S6_complete">S6_종료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="h-5" />

          <div className="space-y-3 p-5 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">상세 정보</h3>
            <div className="grid grid-cols-10 gap-x-0 gap-y-3">
              <div className="col-span-10 space-y-2">
                <Label htmlFor="amountRange" className="text-sm font-medium text-foreground">
                  거래 예상 금액
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.amount_range}
                    onValueChange={(value) => {
                      setFormData({ ...formData, amount_range: value, amount_custom: "" })
                    }}
                  >
                    <SelectTrigger id="amountRange" className="h-11 bg-background flex-1">
                      <SelectValue placeholder="금액 범위 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500만원 이하">500만원 이하</SelectItem>
                      <SelectItem value="500 ~ 1000만원">500 ~ 1000만원</SelectItem>
                      <SelectItem value="1000 ~ 2000만원">1000 ~ 2000만원</SelectItem>
                      <SelectItem value="2000 ~ 3000만원">2000 ~ 3000만원</SelectItem>
                      <SelectItem value="3000만원 이상">3000만원 이상</SelectItem>
                      <SelectItem value="1억 이상">1억 이상</SelectItem>
                      <SelectItem value="미입력 / 내부 검토">미입력 / 내부 검토</SelectItem>
                      <SelectItem value="미확정">미확정</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="또는 직접 입력 (예: 1,500,000)"
                    className="h-11 flex-1"
                    value={formData.amount_custom}
                    onChange={(e) => {
                      const formatted = formatNumberWithCommas(e.target.value)
                      setFormData({ ...formData, amount_custom: formatted, amount_range: "" })
                    }}
                  />
                </div>
              </div>

              <div className="col-span-3 space-y-2">
                <Label htmlFor="assignedTo" className="text-sm font-medium text-foreground">
                  담당자
                </Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => {
                    setFormData({ ...formData, assigned_to: value })
                  }}
                >
                  <SelectTrigger id="assignedTo" className="h-11 bg-background">
                    <SelectValue placeholder="담당자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="오일환">오일환</SelectItem>
                    <SelectItem value="박상혁">박상혁</SelectItem>
                    <SelectItem value="윤경호">윤경호</SelectItem>
                    <SelectItem value="미정">미정</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3 space-y-2">
                {/* 다음 연락일 */}
                <div className="space-y-2">
                  <Label htmlFor="next-contact-date">다음 연락일</Label>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal bg-background",
                          !formData.next_contact_date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.next_contact_date
                          ? new Date(formData.next_contact_date).toLocaleDateString("ko-KR")
                          : "날짜를 선택하세요"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0"
                      align="start"
                      onInteractOutside={() => setPopoverOpen(false)}
                    >
                      <Calendar
                        mode="single"
                        selected={formData.next_contact_date ? new Date(formData.next_contact_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear()
                            const month = String(date.getMonth() + 1).padStart(2, "0")
                            const day = String(date.getDate()).padStart(2, "0")
                            const formattedDate = `${year}-${month}-${day}`
                            setFormData({ ...formData, next_contact_date: formattedDate })
                          }
                          setPopoverOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          <div className="h-5" />

          <div className="space-y-3 p-5 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">니즈 정보</h3>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">니즈 선택 (다중 선택 가능)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-11 bg-transparent">
                    {formData.needs_summary
                      ? formData.needs_summary.split(",").filter(Boolean).join(", ")
                      : "니즈를 선택하세요"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="니즈 검색..." />
                    <CommandList style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <CommandEmpty>니즈를 찾을 수 없습니다.</CommandEmpty>
                      <CommandGroup>
                        {needsOptions.map((option) => {
                          const isSelected = formData.needs_summary.split(",").includes(option.value)
                          return (
                            <CommandItem
                              key={option.value}
                              onSelect={() => {
                                const currentNeeds = formData.needs_summary.split(",").filter(Boolean)
                                let newNeeds: string[]
                                if (isSelected) {
                                  newNeeds = currentNeeds.filter((n) => n !== option.value)
                                } else {
                                  newNeeds = [...currentNeeds, option.value]
                                }
                                setFormData({ ...formData, needs_summary: newNeeds.join(",") })
                              }}
                              className="cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mr-2 w-4 h-4 rounded border-gray-300"
                              />
                              {option.label}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="h-5" />

          <div className="space-y-3 p-5 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">추가 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstContactDate" className="text-sm font-medium text-foreground">
                  첫 문의 날짜
                </Label>
                <Popover open={firstContactPopoverOpen} onOpenChange={setFirstContactPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-11 justify-start text-left font-normal bg-background",
                        !formData.first_contact_date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.first_contact_date
                        ? new Date(formData.first_contact_date).toLocaleDateString("ko-KR")
                        : "날짜를 선택하세요"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    onInteractOutside={() => setFirstContactPopoverOpen(false)}
                  >
                    <Calendar
                      mode="single"
                      selected={formData.first_contact_date ? new Date(formData.first_contact_date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, "0")
                          const day = String(date.getDate()).padStart(2, "0")
                          const formattedDate = `${year}-${month}-${day}`
                          setFormData({ ...formData, first_contact_date: formattedDate })
                        }
                        setFirstContactPopoverOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-8">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-2/5 h-11">
              취소
            </Button>
            <Button type="submit" disabled={saving} className="w-3/5 h-11 font-semibold">
              {saving ? "생성 중..." : "거래 추가"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default AddDealDialog
