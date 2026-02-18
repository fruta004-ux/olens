"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

interface QuotationDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: {
    quotation_number: string
    company: "플루타" | "오코랩스"
    title: string
    items: Array<{ name: string; quantity: number; unit_price: number; amount: number }>
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

export function QuotationDetailDialog({ open, onOpenChange, quotation, clientName }: QuotationDetailDialogProps) {
  const companyInfo = COMPANY_INFO[quotation.company]
  const formatNumber = (num: number) => num.toLocaleString("ko-KR")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  const handlePrint = () => {
    window.print()
  }

  const MIN_ROWS = 15
  const filledItems = [...quotation.items]
  while (filledItems.length < MIN_ROWS) {
    filledItems.push({ name: "", quantity: 0, unit_price: 0, amount: 0 })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[210mm] max-h-[95vh] overflow-y-auto p-0">
        {/* 인쇄 버튼 */}
        <div className="p-4 border-b print:hidden flex justify-between items-center">
          <h2 className="text-lg font-semibold">견적서 상세</h2>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            인쇄
          </Button>
        </div>

        <div className="quotation-print p-8 bg-white" id="quotation-content">
          {/* 제목 */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2 underline decoration-2 underline-offset-4">견 적 서</h1>
            <p className="text-sm text-gray-600 mt-2">NO: {quotation.quotation_number}</p>
          </div>

          <div className="border-2 border-black mb-6">
            <div className="grid grid-cols-2 border-b-2 border-black">
              {/* 왼쪽: 수신자 정보 */}
              <div className="p-6 border-r-2 border-black">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">{clientName || "○○○"} 귀하</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p>견적일자: {formatDate(quotation.created_at)}</p>
                  {quotation.valid_until && <p>유효기간: {quotation.valid_until}</p>}
                  <div className="mt-4">
                    <p className="font-semibold">제 목: {quotation.title}</p>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed">견적요청에 감사드리며 아래 와 같이 견적합니다.</p>
                </div>
              </div>

              {/* 오른쪽: 공급자 정보 표 */}
              <div className="p-0">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-400">
                      <td className="py-2 px-3 bg-gray-100 font-semibold w-24 border-r border-gray-400">등록번호</td>
                      <td className="py-2 px-3" colSpan={3}>
                        {companyInfo.registration}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="py-2 px-3 bg-gray-100 font-semibold border-r border-gray-400">상 호</td>
                      <td className="py-2 px-3 border-r border-gray-400">{companyInfo.name}</td>
                      <td className="py-2 px-3 bg-gray-100 font-semibold text-center border-r border-gray-400">성명</td>
                      <td className="py-2 px-3">{companyInfo.representative}</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="py-2 px-3 bg-gray-100 font-semibold border-r border-gray-400">주 소</td>
                      <td className="py-2 px-3 text-xs leading-relaxed" colSpan={3}>
                        {companyInfo.address}
                        <br />
                        {companyInfo.addressDetail}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="py-2 px-3 bg-gray-100 font-semibold border-r border-gray-400">업 태</td>
                      <td className="py-2 px-3 border-r border-gray-400">{companyInfo.business_type}</td>
                      <td className="py-2 px-3 bg-gray-100 font-semibold text-center border-r border-gray-400">
                        종 목
                      </td>
                      <td className="py-2 px-3 text-xs">{companyInfo.business_item}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 bg-gray-100 font-semibold border-r border-gray-400">전화번호</td>
                      <td className="py-2 px-3 border-r border-gray-400">{companyInfo.phone}</td>
                      <td className="py-2 px-3 bg-gray-100 font-semibold text-center border-r border-gray-400">
                        팩스번호
                      </td>
                      <td className="py-2 px-3">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-black">
                  <th className="py-2 px-2 border-r border-black text-center w-12">NO</th>
                  <th className="py-2 px-2 border-r border-black text-center">품 목</th>
                  <th className="py-2 px-2 border-r border-black text-center w-16">수량</th>
                  <th className="py-2 px-2 border-r border-black text-center w-28">단가</th>
                  <th className="py-2 px-2 text-center w-32">금액</th>
                </tr>
              </thead>
              <tbody>
                {filledItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-300">
                    <td className="py-2 px-2 border-r border-gray-300 text-center">{item.name ? idx + 1 : ""}</td>
                    <td className="py-2 px-2 border-r border-gray-300">{item.name}</td>
                    <td className="py-2 px-2 border-r border-gray-300 text-center">
                      {item.quantity !== 0 ? item.quantity : ""}
                    </td>
                    <td className="py-2 px-2 border-r border-gray-300 text-right">
                      {item.unit_price !== 0 ? `₩${formatNumber(item.unit_price)}` : ""}
                    </td>
                    <td className={`py-2 px-2 text-right ${item.amount < 0 ? "text-red-600" : ""}`}>
                      {item.amount !== 0 ? `₩${formatNumber(item.amount)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 합계 */}
            <div className="border-t-2 border-black">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 px-4 bg-gray-100 font-semibold w-32">공급가액</td>
                    <td className="py-2 px-4 text-right font-semibold">₩ {formatNumber(quotation.supply_amount)}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 px-4 bg-gray-100 font-semibold">부가세 (10%)</td>
                    <td className="py-2 px-4 text-right font-semibold">₩ {formatNumber(quotation.vat_amount)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 bg-gray-200 font-bold text-lg">총 견적금액</td>
                    <td className="py-3 px-4 text-right font-bold text-lg text-primary">
                      ₩ {formatNumber(quotation.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 비고 */}
          {quotation.notes && (
            <div className="border-2 border-black mb-4">
              <div className="flex">
                <div className="bg-gray-100 px-3 py-2 font-semibold text-sm border-r-2 border-black flex items-start w-20 shrink-0">
                  비고
                </div>
                <div className="px-3 py-2 flex-1">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
