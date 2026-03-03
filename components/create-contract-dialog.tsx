"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Save, FileText, Pencil, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

const CATEGORIES = ["홈페이지", "마케팅", "디자인", "앱개발", "ERP개발", "영상"]

interface DealData {
  id: string
  deal_name?: string
  needs_summary?: string
  amount_range?: string
  company?: string
  contract_info?: any
  account?: {
    company_name?: string
    representative?: string
    business_number?: string
    address?: string
  }
}

interface CreateContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealData?: DealData | null
  editContract?: any | null
  onSuccess?: (contractId: string) => void
}

export function CreateContractDialog({ open, onOpenChange, dealData, editContract, onSuccess }: CreateContractDialogProps) {
  const supabase = createBrowserClient()

  const [category, setCategory] = useState("홈페이지")
  const [title, setTitle] = useState("")
  const [contractDate, setContractDate] = useState("")
  const [status, setStatus] = useState("초안")

  // Client info (갑)
  const [clientCompanyName, setClientCompanyName] = useState("")
  const [clientRepresentative, setClientRepresentative] = useState("")
  const [clientBusinessNumber, setClientBusinessNumber] = useState("")
  const [clientAddress, setClientAddress] = useState("")

  // Contract data (dynamic fields)
  const [contentDescription, setContentDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [depositPercent, setDepositPercent] = useState("50%")
  const [depositAmount, setDepositAmount] = useState("")
  const [balancePercent, setBalancePercent] = useState("50%")
  const [balanceAmount, setBalanceAmount] = useState("")
  const [devStart, setDevStart] = useState("")
  const [devEnd, setDevEnd] = useState("")

  // Template & clauses
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [clauses, setClauses] = useState<any[]>([])
  const [bankInfo, setBankInfo] = useState<any>({})
  const [companyInfo, setCompanyInfo] = useState<any>({})
  const [sealUrl, setSealUrl] = useState("")
  const [expandedClause, setExpandedClause] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("info")

  useEffect(() => {
    if (open) {
      loadTemplates()
      loadSeal()
    }
  }, [open])

  useEffect(() => {
    if (editContract) {
      setCategory(editContract.category || "홈페이지")
      setTitle(editContract.title || "")
      setContractDate(editContract.contract_date || "")
      setStatus(editContract.status || "초안")
      setClientCompanyName(editContract.client_info?.company_name || "")
      setClientRepresentative(editContract.client_info?.representative || "")
      setClientBusinessNumber(editContract.client_info?.business_number || "")
      setClientAddress(editContract.client_info?.address || "")
      setContentDescription(editContract.contract_data?.content_description || "")
      setAmount(editContract.contract_data?.amount || "")
      setDepositPercent(editContract.contract_data?.deposit_percent || "50%")
      setDepositAmount(editContract.contract_data?.deposit_amount || "")
      setBalancePercent(editContract.contract_data?.balance_percent || "50%")
      setBalanceAmount(editContract.contract_data?.balance_amount || "")
      setDevStart(editContract.contract_data?.dev_start || "")
      setDevEnd(editContract.contract_data?.dev_end || "")
      setClauses(editContract.clauses || [])
      setBankInfo(editContract.bank_info || {})
      setCompanyInfo(editContract.company_info || {})
      setSealUrl(editContract.seal_url || "")
    } else if (dealData) {
      prefillFromDeal()
    }
  }, [editContract, dealData, open])

  useEffect(() => {
    if (!editContract) {
      const catTemplates = templates.filter(t => t.category === category)
      if (catTemplates.length > 0) {
        const existing = catTemplates.find(t => t.id === selectedTemplateId)
        if (!existing) setSelectedTemplateId(catTemplates[0].id)
      } else {
        setSelectedTemplateId(null)
      }
    }
  }, [category, templates])

  useEffect(() => {
    if (!editContract && selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setTitle(template.title || `${category} 계약서`)
        setClauses(template.clauses || [])
        setBankInfo(template.bank_info || {})
        setCompanyInfo(template.company_info || {})
      }
    }
  }, [selectedTemplateId])

  const loadTemplates = async () => {
    const { data } = await supabase.from("contract_templates").select("*").eq("is_active", true).order("display_order")
    if (data) setTemplates(data)
  }

  const loadSeal = async () => {
    const { data } = await supabase.from("company_seals").select("*").eq("is_active", true).limit(1)
    if (data?.[0]) setSealUrl(data[0].seal_url)
  }

  const getCategoryTemplates = () => templates.filter(t => t.category === category)

  const prefillFromDeal = () => {
    if (!dealData) return
    const ci = dealData.contract_info
    const acc = dealData.account

    setClientCompanyName(acc?.company_name || "")
    setClientRepresentative(acc?.representative || "")
    setClientBusinessNumber(acc?.business_number || "")
    setClientAddress(acc?.address || "")

    setContentDescription(dealData.needs_summary?.replace(/,/g, ", ") || "")

    const costRaw = ci?.cost || dealData.amount_range || ""
    const costClean = costRaw.replace(/[^\d,]/g, "").replace(/,/g, "")
    setAmount(costRaw.includes("(") ? costRaw.split("(")[0].trim() : costRaw)

    if (costClean) {
      const numericAmount = parseInt(costClean)
      if (!isNaN(numericAmount)) {
        const dep = Math.round(numericAmount * 0.5 * 1.1)
        const bal = Math.round(numericAmount * 0.5 * 1.1)
        setDepositAmount(dep.toLocaleString())
        setBalanceAmount(bal.toLocaleString())
      }
    }

    setContractDate(ci?.contract_date || new Date().toISOString().split("T")[0].replace(/-/g, "."))
    setDevStart(ci?.work_start_date || "")
  }

  const generateContractNumber = () => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")
    return `C-${dateStr}-${seq}`
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        category,
        title,
        contract_date: contractDate,
        status,
        client_info: {
          company_name: clientCompanyName,
          representative: clientRepresentative,
          business_number: clientBusinessNumber,
          address: clientAddress,
        },
        contract_data: {
          content_description: contentDescription,
          amount,
          deposit_percent: depositPercent,
          deposit_amount: depositAmount,
          balance_percent: balancePercent,
          balance_amount: balanceAmount,
          dev_start: devStart,
          dev_end: devEnd,
        },
        clauses,
        bank_info: bankInfo,
        company_info: companyInfo,
        seal_url: sealUrl,
        updated_at: new Date().toISOString(),
      }

      if (editContract?.id) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editContract.id)
        if (error) throw error
        onSuccess?.(editContract.id)
      } else {
        const insertPayload = {
          ...payload,
          contract_number: generateContractNumber(),
          deal_id: dealData?.id || null,
          template_id: selectedTemplateId || templates.find(t => t.category === category)?.id || null,
        }
        const { data, error } = await supabase.from("contracts").insert(insertPayload).select("id").single()
        if (error) throw error
        onSuccess?.(data.id)
      }
      onOpenChange(false)
    } catch (err) {
      console.error("계약서 저장 실패:", err)
      alert("계약서 저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleClauseBodyChange = (order: number, newBody: string) => {
    setClauses(prev => prev.map(c => c.order === order ? { ...c, body: newBody } : c))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editContract ? "계약서 수정" : "계약서 작성"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">기본 정보</TabsTrigger>
            <TabsTrigger value="client" className="flex-1">갑(상대방) 정보</TabsTrigger>
            <TabsTrigger value="contract" className="flex-1">계약 조건</TabsTrigger>
            <TabsTrigger value="clauses" className="flex-1">조항 편집</TabsTrigger>
          </TabsList>

          {/* 기본 정보 */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">카테고리</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      category === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {getCategoryTemplates().length > 1 && (
              <div>
                <label className="text-sm font-medium">템플릿 선택</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {getCategoryTemplates().map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                        selectedTemplateId === t.id
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">계약서 제목</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" placeholder="예: 홈페이지 구축 계약서" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">계약일자</label>
                <Input value={contractDate} onChange={e => setContractDate(e.target.value)} className="mt-1" placeholder="2026.02.13" />
              </div>
              <div>
                <label className="text-sm font-medium">상태</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="초안">초안</SelectItem>
                    <SelectItem value="확정">확정</SelectItem>
                    <SelectItem value="서명완료">서명완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* 갑 정보 */}
          <TabsContent value="client" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">계약 상대방(갑) 정보를 입력합니다.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">회사명</label>
                <Input value={clientCompanyName} onChange={e => setClientCompanyName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">대표자</label>
                <Input value={clientRepresentative} onChange={e => setClientRepresentative(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">사업자번호</label>
              <Input value={clientBusinessNumber} onChange={e => setClientBusinessNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">주소</label>
              <Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="mt-1" />
            </div>
          </TabsContent>

          {/* 계약 조건 */}
          <TabsContent value="contract" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">구축 내용 (제3조에 들어갈 내용)</label>
              <Input value={contentDescription} onChange={e => setContentDescription(e.target.value)} className="mt-1" placeholder="웹/앱 반응형 제작" />
            </div>
            <div>
              <label className="text-sm font-medium">대금 (VAT별도)</label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" placeholder="0,000,000" />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">계약금 비율</label>
                <Input value={depositPercent} onChange={e => setDepositPercent(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">계약금 금액 (VAT포함)</label>
                <Input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">잔금 비율</label>
                <Input value={balancePercent} onChange={e => setBalancePercent(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">잔금 금액 (VAT포함)</label>
                <Input value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">개발 시작일</label>
                <Input value={devStart} onChange={e => setDevStart(e.target.value)} className="mt-1" placeholder="2026년 02월 19일" />
              </div>
              <div>
                <label className="text-sm font-medium">개발 종료일</label>
                <Input value={devEnd} onChange={e => setDevEnd(e.target.value)} className="mt-1" placeholder="2026년 04월 19일" />
              </div>
            </div>
          </TabsContent>

          {/* 조항 편집 */}
          <TabsContent value="clauses" className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground mb-2">
              각 조항을 클릭해서 이 계약서에 한해 내용을 수정할 수 있습니다.
            </p>
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {clauses.map((clause: any) => (
                <div key={clause.order} className="border rounded-md">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() => setExpandedClause(expandedClause === clause.order ? null : clause.order)}
                  >
                    <span className="font-medium text-xs">{clause.title}</span>
                    {expandedClause === clause.order ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedClause === clause.order && (
                    <div className="px-3 pb-3">
                      <Textarea
                        value={clause.body}
                        onChange={e => handleClauseBodyChange(clause.order, e.target.value)}
                        className="text-xs min-h-[120px]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">취소</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : editContract ? "수정 저장" : "계약서 생성"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
