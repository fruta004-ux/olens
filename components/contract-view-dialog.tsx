"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileDown, Trash2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

const PRINT_STYLE_ID = "contract-print-styles"
const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }
    body * {
      visibility: hidden;
    }
    #contract-print-root,
    #contract-print-root * {
      visibility: visible;
    }
    #contract-print-root {
      position: absolute;
      left: 0;
      top: 0;
      width: 210mm;
    }
    .contract-print-page {
      width: 210mm !important;
      height: 297mm !important;
      padding: 12mm 15mm !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      background: white !important;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .contract-print-page:last-child {
      page-break-after: auto;
    }
    html, body {
      overflow: visible !important;
      height: auto !important;
    }
  }
`

interface ContractData {
  id?: string
  contract_number: string
  category: string
  title: string
  client_info: {
    address?: string
    business_number?: string
    company_name?: string
    representative?: string
  }
  contract_data: {
    content_description?: string
    amount?: string
    deposit_percent?: string
    deposit_amount?: string
    balance_percent?: string
    balance_amount?: string
    dev_start?: string
    dev_end?: string
  }
  clauses: Array<{ order: number; title: string; body: string }>
  bank_info: { bank?: string; account?: string; holder?: string }
  company_info: {
    address?: string
    business_number?: string
    company_name?: string
    representative?: string
  }
  seal_url?: string
  status: string
  contract_date?: string
}

interface ContractViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractData
  onDelete?: () => void
}

function replacePlaceholders(text: string, data: ContractData): string {
  const vars: Record<string, string> = {
    "{{content_description}}": data.contract_data?.content_description || "웹/앱 반응형 제작",
    "{{amount}}": data.contract_data?.amount || "0,000,000",
    "{{bank_name}}": data.bank_info?.bank || "",
    "{{bank_account}}": data.bank_info?.account || "",
    "{{bank_holder}}": data.bank_info?.holder || "",
    "{{deposit_percent}}": data.contract_data?.deposit_percent || "50%",
    "{{deposit_amount}}": data.contract_data?.deposit_amount || "000,000",
    "{{balance_percent}}": data.contract_data?.balance_percent || "50%",
    "{{balance_amount}}": data.contract_data?.balance_amount || "000,000",
    "{{dev_start}}": data.contract_data?.dev_start || "2026년 00월 00일",
    "{{dev_end}}": data.contract_data?.dev_end || "2026년 00월 00일",
  }
  let result = text
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value)
  }
  return result
}

const PAGE_HEIGHT_PX = 1032
const SIGNATURE_BLOCK_HEIGHT = 220

export function ContractViewDialog({ open, onOpenChange, contract, onDelete }: ContractViewDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [pages, setPages] = useState<Array<{ clauses: Array<{ order: number; title: string; body: string }>; isLast: boolean }>>([])
  const [printRootReady, setPrintRootReady] = useState(false)

  // Inject print styles
  useEffect(() => {
    if (!document.getElementById(PRINT_STYLE_ID)) {
      const el = document.createElement("style")
      el.id = PRINT_STYLE_ID
      el.textContent = printStyles
      document.head.appendChild(el)
    }
  }, [])

  // Create print root element in body (outside dialog)
  useEffect(() => {
    let root = document.getElementById("contract-print-root")
    if (!root) {
      root = document.createElement("div")
      root.id = "contract-print-root"
      root.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;overflow:hidden;"
      document.body.appendChild(root)
    }
    setPrintRootReady(true)
    return () => {}
  }, [])

  // Paginate clauses
  useEffect(() => {
    if (!open || !contract.clauses?.length) return
    const LINE_HEIGHT = 16
    const CLAUSE_TITLE_HEIGHT = 22
    const CLAUSE_GAP = 10
    const PREAMBLE_HEIGHT = 140

    const clausesList = [...contract.clauses].sort((a, b) => a.order - b.order)
    const result: Array<{ clauses: typeof clausesList; isLast: boolean }> = []
    let currentClauses: typeof clausesList = []
    let currentHeight = PREAMBLE_HEIGHT

    for (let i = 0; i < clausesList.length; i++) {
      const clause = clausesList[i]
      const body = replacePlaceholders(clause.body, contract)
      const lineCount = body.split("\n").reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 55)), 0)
      const clauseHeight = CLAUSE_TITLE_HEIGHT + (lineCount * LINE_HEIGHT) + CLAUSE_GAP
      const isLastClause = i === clausesList.length - 1
      const reservedSpace = isLastClause ? SIGNATURE_BLOCK_HEIGHT : 0

      if (currentHeight + clauseHeight + reservedSpace > PAGE_HEIGHT_PX && currentClauses.length > 0) {
        result.push({ clauses: currentClauses, isLast: false })
        currentClauses = []
        currentHeight = 0
      }
      currentClauses.push(clause)
      currentHeight += clauseHeight
    }
    if (currentClauses.length > 0) {
      result.push({ clauses: currentClauses, isLast: true })
    }
    setPages(result)
  }, [open, contract])

  const handlePrint = () => {
    const originalTitle = document.title
    const clientStr = contract.client_info?.company_name || "거래처"
    document.title = `${clientStr}_${contract.title}`
    window.print()
    setTimeout(() => { document.title = originalTitle }, 1000)
  }

  const handleDelete = async () => {
    if (!contract.id) return
    if (!confirm("이 계약서를 삭제하시겠습니까?")) return
    setDeleting(true)
    try {
      const supabase = createBrowserClient()
      await supabase.from("contracts").delete().eq("id", contract.id)
      onOpenChange(false)
      onDelete?.()
    } catch (err) {
      console.error("계약서 삭제 실패:", err)
      alert("계약서 삭제에 실패했습니다.")
    } finally {
      setDeleting(false)
    }
  }

  const clientName = contract.client_info?.company_name || "홍길동"
  const clientRep = contract.client_info?.representative || "홍길동"
  const dealName = contract.contract_data?.content_description
    ? `${clientName} 홈페이지 구축`
    : `${clientName} ${contract.category} 프로젝트`
  const contractDateFormatted = contract.contract_date
    ? (() => {
        const d = contract.contract_date.replace(/\./g, "-")
        const parts = d.split("-")
        return parts.length === 3 ? `${parts[0]}년 ${parts[1]}월 ${parts[2]}일` : contract.contract_date
      })()
    : "2026년 00월 00일"

  const renderClause = (clause: { order: number; title: string; body: string }) => {
    const body = replacePlaceholders(clause.body, contract)
    return (
      <div key={clause.order} className="mb-2.5">
        <p style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{clause.title}</p>
        <p style={{ fontSize: "10.5px", lineHeight: "1.55", whiteSpace: "pre-wrap" }}>{body}</p>
      </div>
    )
  }

  const renderSignatureBlock = () => (
    <div style={{ position: "absolute", bottom: "14mm", left: "12mm", right: "12mm" }}>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600 }}>계약일자 : {contractDateFormatted}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", fontSize: "10.5px" }}>
        {/* 갑 */}
        <div>
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>(갑)</p>
          <p style={{ marginBottom: "4px" }}><span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>주 소 :</span>{contract.client_info?.address || ""}</p>
          <p style={{ marginBottom: "4px" }}><span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>사 업 자 :</span>{contract.client_info?.business_number || ""}</p>
          <p style={{ marginBottom: "4px" }}><span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>회 사 명 :</span>{contract.client_info?.company_name || ""}</p>
          <p><span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>대 표 자 :</span>{clientRep}<span style={{ marginLeft: "16px", color: "#aaa" }}>(인)</span></p>
        </div>
        {/* 을 */}
        <div style={{ position: "relative" }}>
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>(을)</p>
          <p style={{ marginBottom: "4px", fontSize: "10px" }}><span style={{ fontWeight: 600, display: "inline-block", width: "56px", fontSize: "10.5px" }}>주 소 :</span>{contract.company_info?.address || ""}</p>
          <p style={{ marginBottom: "4px" }}><span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>사 업 자 :</span>{contract.company_info?.business_number || ""}</p>
          <p style={{ marginBottom: "4px" }}><span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>회 사 명 :</span>{contract.company_info?.company_name || ""}</p>
          <p>
            <span style={{ fontWeight: 600, display: "inline-block", width: "56px" }}>대 표 자 :</span>
            {contract.company_info?.representative || ""}
            {contract.seal_url ? (
              <img src={contract.seal_url} alt="도장" style={{ position: "absolute", right: 0, bottom: "-4px", width: "64px", height: "64px", objectFit: "contain" }} />
            ) : (
              <span style={{ marginLeft: "16px", color: "#aaa" }}>(인)</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )

  const renderPage = (page: typeof pages[0], pageIdx: number) => (
    <div
      key={pageIdx}
      className="contract-print-page"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "12mm 15mm",
        boxSizing: "border-box",
        background: "white",
        fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {pageIdx === 0 && (
        <>
          <h1 style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold", marginBottom: "20px", letterSpacing: "0.05em" }}>{contract.title}</h1>
          <p style={{ fontSize: "10.5px", lineHeight: "1.7", marginBottom: "20px" }}>
            {contract.client_info?.company_name ? `주식회사 ${contract.client_info.company_name}` : "주식회사 홍길동"} (이하 "갑"이라 한다)와 {contract.company_info?.company_name || "플루타"} (이하 "을"이라 한다)은 {contractDateFormatted}자로
            '{dealName}'(이하 "{contract.category} 구축"이라 한다.)에 관해 다음과 같이 계약을 체결한다.
          </p>
        </>
      )}
      {page.clauses.map(renderClause)}
      {page.isLast && renderSignatureBlock()}
      <div style={{ position: "absolute", bottom: "6mm", left: 0, right: 0, textAlign: "center", fontSize: "10px", color: "#999" }}>
        - {pageIdx + 1} -
      </div>
    </div>
  )

  // The hidden print root rendered via portal into body
  const printContent = printRootReady && open && pages.length > 0
    ? createPortal(
        <>{pages.map((page, idx) => renderPage(page, idx))}</>,
        document.getElementById("contract-print-root")!
      )
    : null

  return (
    <>
      {printContent}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[900px] max-h-[95vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">계약서 상세</DialogTitle>
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">계약서 상세</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                contract.status === "확정" ? "bg-green-100 text-green-700" :
                contract.status === "서명완료" ? "bg-blue-100 text-blue-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>{contract.status}</span>
            </div>
            <div className="flex items-center gap-2">
              {contract.id && (
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}
                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "삭제 중..." : "삭제"}
                </Button>
              )}
              <Button onClick={handlePrint} className="gap-2">
                <FileDown className="h-4 w-4" />
                인쇄 / PDF 저장
              </Button>
            </div>
          </div>

          {/* Preview area (screen only) */}
          <div className="bg-gray-100 p-4">
            {pages.map((page, pageIdx) => (
              <div key={pageIdx}>
                {pageIdx > 0 && <div className="h-3" />}
                <div
                  className="mx-auto shadow-lg border"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    padding: "12mm 15mm",
                    boxSizing: "border-box",
                    background: "white",
                    fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {pageIdx === 0 && (
                    <>
                      <h1 className="text-center text-xl font-bold mb-5 tracking-wider">{contract.title}</h1>
                      <p className="text-[10.5px] leading-[1.7] mb-5">
                        {contract.client_info?.company_name ? `주식회사 ${contract.client_info.company_name}` : "주식회사 홍길동"} (이하 &quot;갑&quot;이라 한다)와 {contract.company_info?.company_name || "플루타"} (이하 &quot;을&quot;이라 한다)은 {contractDateFormatted}자로
                        &apos;{dealName}&apos;(이하 &quot;{contract.category} 구축&quot;이라 한다.)에 관해 다음과 같이 계약을 체결한다.
                      </p>
                    </>
                  )}
                  {page.clauses.map(c => {
                    const body = replacePlaceholders(c.body, contract)
                    return (
                      <div key={c.order} className="mb-2.5">
                        <p className="font-bold text-[11px] mb-0.5">{c.title}</p>
                        <p className="text-[10.5px] leading-[1.55] whitespace-pre-wrap">{body}</p>
                      </div>
                    )
                  })}
                  {page.isLast && (
                    <div style={{ position: "absolute", bottom: "14mm", left: "12mm", right: "12mm" }}>
                      <div className="text-center mb-4">
                        <p className="text-[11px] font-semibold">계약일자 : {contractDateFormatted}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-6 text-[10.5px]">
                        <div className="space-y-1.5">
                          <p className="font-bold mb-2">(갑)</p>
                          <div className="flex gap-2"><span className="font-semibold w-14 shrink-0">주 소 :</span><span>{contract.client_info?.address || ""}</span></div>
                          <div className="flex gap-2"><span className="font-semibold w-14 shrink-0">사 업 자 :</span><span>{contract.client_info?.business_number || ""}</span></div>
                          <div className="flex gap-2"><span className="font-semibold w-14 shrink-0">회 사 명 :</span><span>{contract.client_info?.company_name || ""}</span></div>
                          <div className="flex gap-2 items-center"><span className="font-semibold w-14 shrink-0">대 표 자 :</span><span>{clientRep}</span><span className="ml-4 text-gray-400">(인)</span></div>
                        </div>
                        <div className="space-y-1.5 relative">
                          <p className="font-bold mb-2">(을)</p>
                          <div className="flex gap-2"><span className="font-semibold w-14 shrink-0">주 소 :</span><span className="text-[10px] leading-tight">{contract.company_info?.address || ""}</span></div>
                          <div className="flex gap-2"><span className="font-semibold w-14 shrink-0">사 업 자 :</span><span>{contract.company_info?.business_number || ""}</span></div>
                          <div className="flex gap-2"><span className="font-semibold w-14 shrink-0">회 사 명 :</span><span>{contract.company_info?.company_name || ""}</span></div>
                          <div className="flex gap-2 items-center relative">
                            <span className="font-semibold w-14 shrink-0">대 표 자 :</span>
                            <span>{contract.company_info?.representative || ""}</span>
                            {contract.seal_url ? (
                              <img src={contract.seal_url} alt="도장" className="absolute right-0 -top-4 w-16 h-16 object-contain" />
                            ) : (
                              <span className="ml-4 text-gray-400">(인)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: "6mm", left: 0, right: 0, textAlign: "center", fontSize: "10px", color: "#999" }}>
                    - {pageIdx + 1} -
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
