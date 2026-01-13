"use client"

import { useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

// A4 인쇄용 스타일
const printStyles = `
  @media print {
    /* 페이지 설정 - A4 세로 */
    @page {
      size: A4 portrait;
      margin: 0;
    }

    /* 모든 요소 숨기기 */
    body * {
      visibility: hidden;
    }

    /* 인쇄 영역만 보이기 */
    .print-page,
    .print-page * {
      visibility: visible;
    }

    /* 인쇄 영역 위치 고정 */
    .print-page {
      position: fixed;
      left: 0;
      top: 0;
      width: 210mm !important;
      height: 297mm !important;
      padding: 15mm 20mm !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      background: white !important;
      font-size: 11pt !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* 다이얼로그 관련 요소 숨기기 */
    [role="dialog"],
    [data-radix-portal] {
      position: static !important;
      display: contents !important;
    }

    /* 배경색 인쇄 */
    .bg-gray-100 {
      background-color: #f3f4f6 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* 테이블 스타일 최적화 */
    table {
      border-collapse: collapse !important;
    }

    /* 페이지 분할 방지 */
    .print-page > div {
      page-break-inside: avoid;
    }

    /* 스크롤바 제거 */
    html, body {
      overflow: visible !important;
      height: auto !important;
    }
  }
`

interface QuotationViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: {
    quotation_number: string
    company: "플루타" | "오코랩스"
    title: string
    items: Array<{ name: string; quantity: number; unit_price: number; amount: number }> | string
    supply_amount: number
    vat_amount: number
    total_amount: number
    valid_until?: string
    notes?: string
    created_at: string
  }
  clientName?: string
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
    logo: "/images/fruta-logo.png",
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
    logo: "/images/ocolabs-logo.png",
  },
}

export function QuotationViewDialog({ open, onOpenChange, quotation, clientName }: QuotationViewDialogProps) {
  const companyInfo = COMPANY_INFO[quotation.company]

  // 인쇄 스타일 주입
  useEffect(() => {
    const styleId = "quotation-print-styles"
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleElement) {
      styleElement = document.createElement("style")
      styleElement.id = styleId
      styleElement.textContent = printStyles
      document.head.appendChild(styleElement)
    }

    return () => {
      // 컴포넌트 언마운트 시 스타일 제거 (선택적)
      // const el = document.getElementById(styleId)
      // if (el) el.remove()
    }
  }, [])

  const formatNumber = (num: number | null | undefined) => {
    if (num == null || isNaN(num)) return "0"
    return num.toLocaleString("ko-KR")
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  const handlePrint = () => {
    window.print()
  }

  const parseItems = () => {
    if (!quotation.items) return []
    if (Array.isArray(quotation.items)) return quotation.items
    if (typeof quotation.items === "string") {
      try {
        return JSON.parse(quotation.items)
      } catch {
        return []
      }
    }
    return []
  }

  const items = parseItems()
  // A4 사이즈에 맞게 행 수 조정 (비고 유무에 따라 다르게)
  // MIN: 최소 행 수, MAX: 최대 행 수 (항목이 많으면 그대로 표시)
  const MIN_ROWS = quotation.notes ? 17 : 20
  const MAX_ROWS = quotation.notes ? 17 : 20
  const filledItems = [...items]
  // 항목이 MIN보다 적으면 빈 행 추가
  while (filledItems.length < MIN_ROWS) {
    filledItems.push({ name: "", quantity: 0, unit_price: 0, amount: 0 })
  }
  // 항목이 MAX보다 많으면 MAX까지만 (페이지 넘침 방지)
  const displayItems = filledItems.slice(0, Math.max(items.length, MAX_ROWS))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[850px] max-h-[95vh] overflow-y-auto p-0">
        <div className="p-4 border-b print:hidden flex justify-between items-center">
          <h2 className="text-lg font-semibold">견적서 상세</h2>
          <Button onClick={handlePrint} className="gap-2">
            <FileDown className="h-4 w-4" />
            인쇄 / PDF 저장
          </Button>
        </div>

        <div className="flex justify-center p-4 print:p-0 print:block">
          <div
            className="print-page bg-white shadow-lg print:shadow-none"
            style={{
              width: "210mm",
              minHeight: "297mm",
              maxHeight: "297mm",
              padding: "15mm 20mm",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* 제목 + 로고 */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-24">
                {/* 왼쪽 여백 (로고와 균형) */}
              </div>
              <div className="text-center flex-1">
                <h1 className="text-2xl font-bold mb-1 underline decoration-2 underline-offset-4">견 적 서</h1>
                <p className="text-xs text-gray-500 mt-1">NO: {quotation.quotation_number}</p>
              </div>
              <div className="w-24 flex justify-end">
                <img 
                  src={companyInfo.logo} 
                  alt={companyInfo.name} 
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>

            {/* 메인 테이블 */}
            <div className="border-2 border-black mb-4">
              {/* 상단: 고객 정보 + 공급자 정보 */}
              <div className="grid grid-cols-2 border-b-2 border-black">
                {/* 왼쪽: 고객 정보 */}
                <div className="p-4 border-r-2 border-black">
                  <div className="mb-2">
                    <h3 className="text-lg font-bold mb-1">{clientName || "○○○"} 귀하</h3>
                  </div>
                  <div className="text-xs">
                    <p className="mb-1">견적일자: {formatDate(quotation.created_at)}</p>
                    {quotation.valid_until && <p className="mb-1">유효기간: {quotation.valid_until}</p>}
                    <div className="mt-2">
                      <p className="font-semibold text-sm">제 목: {quotation.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-600">
                      견적요청에 감사드리며 아래와 같이 견적합니다.
                    </p>
                  </div>
                </div>

                {/* 오른쪽: 공급자 정보 */}
                <div className="p-0">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-400">
                        <td className="py-1 px-2 bg-gray-100 font-semibold w-20 border-r border-gray-400">등록번호</td>
                        <td className="py-1 px-2" colSpan={3}>
                          {companyInfo.registration}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-400">
                        <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">상 호</td>
                        <td className="py-1 px-2 border-r border-gray-400">{companyInfo.name}</td>
                        <td className="py-1 px-2 bg-gray-100 font-semibold text-center border-r border-gray-400 w-12">
                          성명
                        </td>
                        <td className="py-1 px-2">{companyInfo.representative}</td>
                      </tr>
                      <tr className="border-b border-gray-400">
                        <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">주 소</td>
                        <td className="py-1 px-2 text-xs leading-tight" colSpan={3}>
                          {companyInfo.address} {companyInfo.addressDetail}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-400">
                        <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-gray-400">업 태</td>
                        <td className="py-1 px-2 border-r border-gray-400">{companyInfo.business_type}</td>
                        <td className="py-1 px-2 bg-gray-100 font-semibold text-center border-r border-gray-400 w-12">
                          종목
                        </td>
                        <td className="py-1 px-2 text-xs">{companyInfo.business_item}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 bg-gray-100 font-semibold border-r border-black">전화번호</td>
                        <td className="py-1 px-2 border-r border-black">{companyInfo.phone}</td>
                        <td className="py-1 px-2 bg-gray-100 font-semibold text-center border-r border-black w-12">
                          팩스
                        </td>
                        <td className="py-1 px-2">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 품목 테이블 */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black">
                    <th className="py-1 px-2 border-r border-black text-center w-10 font-semibold">NO</th>
                    <th className="py-1 px-2 border-r border-black text-center font-semibold">품 목</th>
                    <th className="py-1 px-2 border-r border-black text-center w-14 font-semibold">수량</th>
                    <th className="py-1 px-2 border-r border-black text-center w-24 font-semibold">단가</th>
                    <th className="py-1 px-2 text-center w-28 font-semibold">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-300" style={{ height: "29px" }}>
                      <td className="py-1 px-2 border-r border-gray-300 text-center text-xs">{item.name ? idx + 1 : ""}</td>
                      <td className="py-1 px-2 border-r border-gray-300 text-xs">{item.name}</td>
                      <td className="py-1 px-2 border-r border-gray-300 text-center text-xs">
                        {item.quantity > 0 ? item.quantity : ""}
                      </td>
                      <td className="py-1 px-2 border-r border-gray-300 text-right text-xs">
                        {item.unit_price > 0 ? `₩${formatNumber(item.unit_price)}` : ""}
                      </td>
                      <td className="py-1 px-2 text-right text-xs">{item.amount > 0 ? `₩${formatNumber(item.amount)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 합계 */}
              <div className="border-t-2 border-black">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="py-1 px-3 bg-gray-100 font-semibold w-28">공급가액</td>
                      <td className="py-1 px-3 text-right font-semibold">₩ {formatNumber(quotation.supply_amount)}</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1 px-3 bg-gray-100 font-semibold">부가세 (10%)</td>
                      <td className="py-1 px-3 text-right font-semibold">₩ {formatNumber(quotation.vat_amount)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3 bg-gray-100 font-semibold text-sm">총 액</td>
                      <td className="py-1 px-3 text-right font-bold text-sm">
                        ₩ {formatNumber(quotation.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 비고 */}
            {quotation.notes && (
              <div className="mt-3">
                <h4 className="font-semibold text-xs mb-1">비고:</h4>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-tight">{quotation.notes}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
