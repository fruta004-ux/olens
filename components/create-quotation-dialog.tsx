"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X, Plus, Save, FolderOpen, Trash2, Edit } from "lucide-react"
import cn from "classnames"
import { createBrowserClient } from "@/lib/supabase/client"

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

interface Preset {
  id: string
  name: string
  company: string
  title: string | null
  items: QuotationItem[]
  notes: string | null
}

interface CreateQuotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId?: string
  clientId?: string
  activityId?: string
  onSuccess?: (quotationId: string, totalAmount: number) => void
  editQuotation?: EditableQuotation | null
}

const COMPANY_INFO = {
  플루타: {
    registration: "646-24-01010",
    name: "플루타",
    representative: "오일환",
    address: "경기도 남양주시 다산순환로 20 (다산동) 제이에이동 9층 09-07호",
    addressDetail: "(다산동, 다산현대프리미어캠퍼스)",
    business_type: "정보통신업",
    business_item: "응용 소프트웨어 개발 및 공급업, 광고 대행업",
    phone: "031-575-0168",
  },
  오코랩스: {
    registration: "296-86-03505",
    name: "주식회사 오코랩스",
    representative: "오일환",
    address: "경기도 남양주시 다산순환로 20 (다산동) 제이에이동 7층 704호",
    addressDetail: "(다산동, 다산현대프리미어캠퍼스)",
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
  const isEditMode = !!editQuotation?.id
  const [company, setCompany] = useState<"플루타" | "오코랩스">("플루타")
  const [title, setTitle] = useState("")
  const [validUntil, setValidUntil] = useState<Date>()
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuotationItem[]>([
    { id: generateId(), name: "", quantity: 1, unit_price: 0, amount: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [validUntilOpen, setValidUntilOpen] = useState(false)

  // Preset state
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetName, setPresetName] = useState("")
  const [showPresetSave, setShowPresetSave] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [showPresetList, setShowPresetList] = useState(false)

  const supabase = createBrowserClient()

  const loadPresets = async () => {
    const { data } = await supabase.from("quotation_presets").select("*").order("created_at", { ascending: false })
    if (data) {
      setPresets(data.map((p: any) => ({
        ...p,
        items: Array.isArray(p.items) ? p.items : typeof p.items === "string" ? JSON.parse(p.items) : [],
      })))
    }
  }

  useEffect(() => {
    if (open) {
      loadPresets()
      if (editQuotation) {
        setCompany(editQuotation.company)
        setTitle(editQuotation.title)
        setValidUntil(editQuotation.valid_until ? new Date(editQuotation.valid_until) : undefined)
        setNotes(editQuotation.notes || "")
        setItems(editQuotation.items.map(item => ({ ...item, id: item.id || generateId() })))
      } else {
        setCompany("플루타")
        setTitle("")
        setValidUntil(undefined)
        setNotes("")
        setItems([{ id: generateId(), name: "", quantity: 1, unit_price: 0, amount: 0 }])
      }
      setShowPresetList(false)
      setShowPresetSave(false)
    }
  }, [open, editQuotation])

  const addItem = () => {
    setItems([...items, { id: generateId(), name: "", quantity: 1, unit_price: 0, amount: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === "quantity" || field === "unit_price") {
          updated.amount = updated.quantity * updated.unit_price
        }
        return updated
      }
      return item
    }))
  }

  const formatNumber = (num: number): string => num.toLocaleString("ko-KR")

  const supplyAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = Math.round(supplyAmount * 0.1)
  const totalAmount = supplyAmount + taxAmount

  // Preset CRUD
  const savePreset = async () => {
    if (!presetName.trim()) { alert("프리셋 이름을 입력해주세요."); return }
    const payload = { name: presetName, company, title, items: JSON.stringify(items), notes }
    if (editingPresetId) {
      await supabase.from("quotation_presets").update(payload).eq("id", editingPresetId)
    } else {
      await supabase.from("quotation_presets").insert(payload)
    }
    setPresetName("")
    setEditingPresetId(null)
    setShowPresetSave(false)
    loadPresets()
  }

  const deletePreset = async (id: string) => {
    if (!confirm("프리셋을 삭제하시겠습니까?")) return
    await supabase.from("quotation_presets").delete().eq("id", id)
    loadPresets()
  }

  const applyPreset = (preset: Preset) => {
    setCompany(preset.company as "플루타" | "오코랩스")
    setTitle(preset.title || "")
    setNotes(preset.notes || "")
    setItems(preset.items.map(item => ({ ...item, id: generateId() })))
    setShowPresetList(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { alert("견적서 제목을 입력해주세요."); return }
    if (items.some((item) => !item.name.trim())) { alert("모든 품목명을 입력해주세요."); return }

    setSaving(true)
    try {
      if (isEditMode && editQuotation) {
        const { data: quotation, error } = await supabase.from("quotations").update({
          company, title, items, supply_amount: supplyAmount, vat_amount: taxAmount,
          total_amount: totalAmount, valid_until: validUntil ? validUntil.toISOString().split("T")[0] : null, notes,
        }).eq("id", editQuotation.id).select().single()
        if (error) throw error
        alert("견적서가 수정되었습니다.")
        if (onSuccess) onSuccess(quotation.id, totalAmount)
      } else {
        const today = new Date()
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`
        const { data: existingQuotations } = await supabase.from("quotations").select("quotation_number")
          .like("quotation_number", `Q-${dateStr}-%`).order("quotation_number", { ascending: false }).limit(1)
        let sequence = 1
        if (existingQuotations && existingQuotations.length > 0) {
          sequence = Number.parseInt(existingQuotations[0].quotation_number.split("-")[2]) + 1
        }
        const quotationNumber = `Q-${dateStr}-${String(sequence).padStart(3, "0")}`
        const { data: quotation, error } = await supabase.from("quotations").insert({
          deal_id: dealId || null, client_id: clientId || null,
          activity_id: clientId ? null : (activityId || null),
          client_activity_id: clientId ? (activityId || null) : null,
          quotation_number: quotationNumber, company, title, items,
          supply_amount: supplyAmount, vat_amount: taxAmount, total_amount: totalAmount,
          valid_until: validUntil ? validUntil.toISOString().split("T")[0] : null, notes, status: "작성중",
        }).select().single()
        if (error) throw error
        alert("견적서가 생성되었습니다.")
        if (onSuccess) onSuccess(quotation.id, totalAmount)
      }
      setTitle(""); setValidUntil(undefined); setNotes("")
      setItems([{ id: generateId(), name: "", quantity: 1, unit_price: 0, amount: 0 }])
      onOpenChange(false)
    } catch (error) {
      console.error(isEditMode ? "견적서 수정 실패:" : "견적서 생성 실패:", error)
      alert(isEditMode ? "견적서 수정에 실패했습니다." : "견적서 생성에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const companyInfo = COMPANY_INFO[company]
  const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[900px] max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? "견적서 수정" : "견적서 생성"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? `견적서 ${editQuotation?.quotation_number}을 수정합니다.` : "거래에 대한 견적서를 작성하세요."}
          </DialogDescription>
        </DialogHeader>

        {/* 프리셋 + 회사 선택 바 */}
        <div className="px-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold whitespace-nowrap">회사</Label>
            {(["플루타", "오코랩스"] as const).map((c) => (
              <Button key={c} size="sm" variant={company === c ? "default" : "outline"} className="h-7 text-xs"
                onClick={() => setCompany(c)}>{c}</Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => setShowPresetList(!showPresetList)}>
              <FolderOpen className="h-3 w-3" /> 프리셋 불러오기
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => { setShowPresetSave(true); setEditingPresetId(null); setPresetName("") }}>
              <Save className="h-3 w-3" /> 프리셋 저장
            </Button>
          </div>
        </div>

        {/* 프리셋 저장 폼 */}
        {showPresetSave && (
          <div className="mx-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <Input placeholder="프리셋 이름" value={presetName} onChange={(e) => setPresetName(e.target.value)}
              className="h-8 text-sm flex-1" />
            <Button size="sm" className="h-8 text-xs" onClick={savePreset}>
              {editingPresetId ? "수정" : "저장"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowPresetSave(false); setEditingPresetId(null) }}>
              취소
            </Button>
          </div>
        )}

        {/* 프리셋 목록 */}
        {showPresetList && (
          <div className="mx-4 p-3 bg-muted/50 border rounded-lg max-h-[200px] overflow-y-auto">
            {presets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">저장된 프리셋이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-2 p-2 bg-background rounded border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 cursor-pointer" onClick={() => applyPreset(preset)}>
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.company} · {preset.items.length}개 항목
                        {preset.title && ` · ${preset.title}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditingPresetId(preset.id)
                        setPresetName(preset.name)
                        setShowPresetSave(true)
                        setShowPresetList(false)
                      }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-destructive"
                      onClick={() => deletePreset(preset.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 견적서 본문 - 출력 상세와 동일한 디자인 */}
        <form onSubmit={handleSubmit} className="px-4 pb-4">
          <div className="bg-white border-2 border-black">
            {/* 제목 */}
            <div className="text-center py-3 border-b-2 border-black">
              <h1 className="text-2xl font-bold underline decoration-2 underline-offset-4">견 적 서</h1>
            </div>

            {/* 상단: 고객 정보 + 공급자 정보 */}
            <div className="grid grid-cols-2 border-b-2 border-black">
              {/* 왼쪽: 기본 정보 입력 */}
              <div className="p-3 border-r-2 border-black space-y-2">
                <div>
                  <label className="text-xs text-gray-500">견적 제목 <span className="text-red-500">*</span></label>
                  <Input placeholder="예: 홈페이지 제작 견적서" value={title}
                    onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm mt-0.5" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">견적일자</label>
                    <Input value={todayStr} disabled className="h-8 text-sm mt-0.5 bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">유효기간</label>
                    <Popover open={validUntilOpen} onOpenChange={setValidUntilOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-8 text-sm justify-start mt-0.5", !validUntil && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {validUntil ? validUntil.toLocaleDateString("ko-KR") : "선택"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={validUntil} onSelect={(date) => { setValidUntil(date); setValidUntilOpen(false) }} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 공급자 정보 (읽기전용) */}
              <div className="p-0">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-400">
                      <td className="py-1 px-2 bg-gray-100 font-semibold w-16 border-r border-gray-400">등록번호</td>
                      <td className="py-1 px-2" colSpan={3}>{companyInfo.registration}</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">상 호</td>
                      <td className="py-1 px-2 border-r border-gray-400">{companyInfo.name}</td>
                      <td className="py-1 px-2 bg-gray-100 font-semibold text-center border-r border-gray-400 w-10">성명</td>
                      <td className="py-1 px-2">{companyInfo.representative}</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">주 소</td>
                      <td className="py-1 px-2 text-xs leading-tight" colSpan={3}>{companyInfo.address} {companyInfo.addressDetail}</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">업 태</td>
                      <td className="py-1 px-2 border-r border-gray-400">{companyInfo.business_type}</td>
                      <td className="py-1 px-2 bg-gray-100 font-semibold text-center border-r border-gray-400 w-10">종목</td>
                      <td className="py-1 px-2 text-xs">{companyInfo.business_item}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">전화번호</td>
                      <td className="py-1 px-2" colSpan={3}>{companyInfo.phone}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 품목 테이블 */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-black">
                  <th className="py-1.5 px-2 border-r border-black text-center w-10 font-semibold">NO</th>
                  <th className="py-1.5 px-2 border-r border-black text-center font-semibold">품 목</th>
                  <th className="py-1.5 px-2 border-r border-black text-center w-16 font-semibold">수량</th>
                  <th className="py-1.5 px-2 border-r border-black text-center w-28 font-semibold">단가</th>
                  <th className="py-1.5 px-2 border-r border-black text-center w-28 font-semibold">금액</th>
                  <th className="py-1.5 px-2 text-center w-10 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-0.5 px-2 border-r border-gray-300 text-center text-xs">{idx + 1}</td>
                    <td className="py-0.5 px-1 border-r border-gray-300">
                      <Input placeholder="품목명" value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                        className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 bg-transparent" />
                    </td>
                    <td className="py-0.5 px-1 border-r border-gray-300">
                      <Input type="number" min="1" value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                        className="h-7 text-xs text-right border-0 shadow-none focus-visible:ring-0 bg-transparent" />
                    </td>
                    <td className="py-0.5 px-1 border-r border-gray-300">
                      <Input type="number" placeholder="0" value={item.unit_price || ""}
                        onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value) || 0)}
                        className="h-7 text-xs text-right border-0 shadow-none focus-visible:ring-0 bg-transparent" />
                    </td>
                    <td className={cn("py-0.5 px-2 border-r border-gray-300 text-right text-xs font-medium", item.amount < 0 && "text-red-600")}>
                      {item.amount !== 0 ? `₩${formatNumber(item.amount)}` : ""}
                    </td>
                    <td className="py-0.5 px-1 text-center">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}
                        disabled={items.length === 1} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 항목 추가 버튼 */}
            <div className="border-b border-gray-300 py-1 text-center">
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-6 text-xs text-muted-foreground gap-1">
                <Plus className="w-3 h-3" /> 항목 추가
              </Button>
            </div>

            {/* 합계 */}
            <div className="border-t-2 border-black">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="py-1.5 px-3 bg-gray-100 font-semibold w-28 border-r border-gray-400">공급가액</td>
                    <td className={cn("py-1.5 px-3 text-right font-semibold", supplyAmount < 0 && "text-red-600")}>
                      ₩ {formatNumber(supplyAmount)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-1.5 px-3 bg-gray-100 font-semibold border-r border-gray-400">부가세 (10%)</td>
                    <td className={cn("py-1.5 px-3 text-right font-semibold", taxAmount < 0 && "text-red-600")}>
                      ₩ {formatNumber(taxAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-gray-100 font-semibold text-sm border-r border-gray-400">총 액</td>
                    <td className={cn("py-1.5 px-3 text-right font-bold text-sm", totalAmount < 0 && "text-red-600")}>
                      ₩ {formatNumber(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 비고 */}
            <div className="border-t-2 border-black p-3">
              <label className="text-xs font-semibold text-gray-700 block mb-1">비고</label>
              <Textarea placeholder="특이사항이나 추가 정보를 입력하세요" value={notes}
                onChange={(e) => setNotes(e.target.value)} rows={3}
                className="text-xs border-gray-300 resize-none" />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">취소</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (isEditMode ? "수정 중..." : "생성 중...") : (isEditMode ? "견적서 수정" : "견적서 생성")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
