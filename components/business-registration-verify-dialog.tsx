"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BusinessRegistrationFields {
  company_name: string
  business_number: string
  corporate_number: string
  representative: string
  opening_date: string
  address: string
  head_office_address: string
  business_type: string
  business_item: string
  issue_date: string
  tax_type: string
}

const FIELD_DEFS: { key: keyof BusinessRegistrationFields; label: string; placeholder?: string }[] = [
  { key: "company_name", label: "상호 / 법인명", placeholder: "예: 주식회사 오트" },
  { key: "business_number", label: "사업자등록번호", placeholder: "000-00-00000" },
  { key: "corporate_number", label: "법인등록번호", placeholder: "000000-0000000" },
  { key: "representative", label: "대표자 성명" },
  { key: "opening_date", label: "개업연월일", placeholder: "YYYY-MM-DD" },
  { key: "tax_type", label: "과세 유형", placeholder: "예: 일반과세자, 법인사업자" },
  { key: "business_type", label: "업태" },
  { key: "business_item", label: "종목" },
  { key: "address", label: "사업장 소재지" },
  { key: "head_office_address", label: "본점 소재지" },
  { key: "issue_date", label: "발급일자", placeholder: "YYYY-MM-DD" },
]

const EMPTY: BusinessRegistrationFields = {
  company_name: "",
  business_number: "",
  corporate_number: "",
  representative: "",
  opening_date: "",
  address: "",
  head_office_address: "",
  business_type: "",
  business_item: "",
  issue_date: "",
  tax_type: "",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null
  initialData: Partial<BusinessRegistrationFields>
  ocrData: Partial<BusinessRegistrationFields> | null
  ocrLoading?: boolean
  onRunOcr?: () => Promise<void> | void
  onApply: (data: BusinessRegistrationFields, ocrRaw: any) => Promise<void> | void
}

export function BusinessRegistrationVerifyDialog({
  open,
  onOpenChange,
  imageUrl,
  initialData,
  ocrData,
  ocrLoading,
  onRunOcr,
  onApply,
}: Props) {
  const [form, setForm] = useState<BusinessRegistrationFields>({ ...EMPTY, ...(initialData as any) })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [saving, setSaving] = useState(false)
  const [diffMode, setDiffMode] = useState<Record<keyof BusinessRegistrationFields, boolean>>(() => {
    const o: any = {}
    for (const f of FIELD_DEFS) o[f.key] = false
    return o
  })

  // Dialog 열릴 때 initialData 적용
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, ...(initialData as any) })
      setZoom(1)
      setRotation(0)
    }
  }, [open, initialData])

  // OCR 결과 들어오면 diff 표시 상태 갱신 + 비어있는 필드는 자동 채움
  useEffect(() => {
    if (!ocrData) return
    setForm((prev) => {
      const next = { ...prev }
      const newDiff: any = {}
      for (const f of FIELD_DEFS) {
        const ocrVal = (ocrData as any)[f.key]
        const curVal = prev[f.key]
        if (ocrVal && ocrVal !== curVal) {
          newDiff[f.key] = true
          // 빈 값일 때만 자동 채움 (사용자가 이미 입력한 값 보호)
          if (!curVal) next[f.key] = ocrVal
        }
      }
      setDiffMode(newDiff)
      return next
    })
  }, [ocrData])

  const ocrHasResult = useMemo(
    () => !!ocrData && Object.values(ocrData).some((v) => !!v),
    [ocrData]
  )

  const applyOcrToField = (key: keyof BusinessRegistrationFields) => {
    if (!ocrData) return
    const v = (ocrData as any)[key]
    if (v == null) return
    setForm((prev) => ({ ...prev, [key]: v }))
  }

  const applyAllOcr = () => {
    if (!ocrData) return
    setForm((prev) => {
      const next = { ...prev }
      for (const f of FIELD_DEFS) {
        const v = (ocrData as any)[f.key]
        if (v) next[f.key] = v
      }
      return next
    })
  }

  const handleApply = async () => {
    setSaving(true)
    try {
      await onApply(form, ocrData)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[1100px] w-[95vw] max-h-[92vh] overflow-hidden p-0 sm:max-w-[1100px]"
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            사업자등록증 정보 검증
          </DialogTitle>
          <p className="text-xs text-muted-foreground">왼쪽 이미지를 보면서 OCR 결과를 직접 확인·수정한 뒤 [적용]을 눌러 거래처 정보로 저장하세요.</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          {/* 좌: 이미지 미리보기 */}
          <div className="bg-muted/30 border-r flex flex-col h-[calc(92vh-12rem)] min-h-[400px]">
            <div className="px-4 py-2 border-b flex items-center gap-1 bg-background/50">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                disabled={!imageUrl}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                disabled={!imageUrl}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-2"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                disabled={!imageUrl}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline"
                >
                  새 창에서 보기
                </a>
              )}
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="사업자등록증"
                  className="select-none transition-transform"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    maxWidth: zoom <= 1 ? "100%" : "none",
                    maxHeight: zoom <= 1 ? "100%" : "none",
                  }}
                  draggable={false}
                />
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  업로드된 사업자등록증이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 우: 검증 폼 */}
          <div className="flex flex-col h-[calc(92vh-12rem)] min-h-[400px]">
            <div className="px-4 py-2 border-b bg-background/50 flex items-center gap-2">
              <span className="text-xs font-medium">OCR 검증 / 수정</span>
              <div className="flex-1" />
              {onRunOcr && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5"
                  onClick={() => onRunOcr()}
                  disabled={!imageUrl || ocrLoading}
                >
                  {ocrLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {ocrLoading ? "인식 중…" : ocrHasResult ? "다시 인식" : "자동 인식"}
                </Button>
              )}
              {ocrHasResult && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={applyAllOcr}>
                  OCR 결과 일괄 적용
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {FIELD_DEFS.map((f) => {
                const ocrVal = ocrData ? (ocrData as any)[f.key] : ""
                const curVal = form[f.key] || ""
                const showSuggest = !!ocrVal && ocrVal !== curVal
                return (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        {f.label}
                        {diffMode[f.key] && (
                          <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200">
                            OCR 변경
                          </Badge>
                        )}
                      </Label>
                      {showSuggest && (
                        <button
                          type="button"
                          onClick={() => applyOcrToField(f.key)}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          OCR 값 적용
                        </button>
                      )}
                    </div>
                    <Input
                      value={curVal}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="h-9 text-sm"
                    />
                    {showSuggest && (
                      <div className="text-[11px] text-muted-foreground pl-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="font-mono">{ocrVal}</span>
                        <span className="opacity-70">← OCR 추출</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-4 py-3 border-t flex items-center justify-end gap-2 bg-background">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                취소
              </Button>
              <Button onClick={handleApply} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                거래처 정보에 적용
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BusinessRegistrationVerifyDialog
