"use client"

import { useEffect, useState } from "react"
import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, FileText, Pencil } from "lucide-react"
import { CreateQuotationDialog } from "@/components/create-quotation-dialog"
import { createClient } from "@/lib/supabase/client"

type Quotation = {
  id: string
  quotation_number: string
  company: string
  deal_name: string
  assigned_to: string
  total_amount: number
  supply_amount: number
  vat_amount: number
  status: string
  created_at: string
  items: Array<{
    name: string
    quantity: number
    unit_price: number
    amount: number
  }>
  title: string
  valid_until: string | null
  notes: string | null
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string>("전체")
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadQuotations()
  }, [])

  async function loadQuotations() {
    try {
      const { data, error } = await supabase
        .from("quotations")
        .select(
          `
          *,
          deal:deals!deal_id (
            deal_name,
            assigned_to
          )
        `,
        )
        .order("created_at", { ascending: false })

      if (error) {
        console.error("견적서 로드 실패:", error)
        return
      }

      // @ts-ignore - deal join 처리
      const mappedQuotations = data.map((q) => ({
        ...q,
        deal_name: q.deal?.deal_name || "-",
        assigned_to: q.deal?.assigned_to || "미정",
      }))

      setQuotations(mappedQuotations)
    } catch (error) {
      console.error("견적서 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const companies = ["전체", "플루타", "오코랩스"]

  const filteredQuotations =
    selectedCompany === "전체" ? quotations : quotations.filter((q) => q.company === selectedCompany)

  function formatAmount(amount: number): string {
    return `₩${amount.toLocaleString()}`
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("ko-KR")
  }

  function getStatusBadge(status: string): string {
    const statusMap: Record<string, string> = {
      작성중: "🟡 작성중",
      발송완료: "🟢 발송완료",
      승인: "🔵 승인",
      거절: "🔴 거절",
    }
    return statusMap[status] || status
  }

  function handleViewQuotation(quotation: Quotation) {
    setSelectedQuotation(quotation)
    setShowDetailDialog(true)
  }

  function handleEditQuotation(quotation: Quotation) {
    setEditingQuotation(quotation)
    setShowEditDialog(true)
  }

  function handleEditSuccess() {
    setShowEditDialog(false)
    setEditingQuotation(null)
    loadQuotations() // 목록 새로고침
  }

  function handlePrintQuotation() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CrmHeader />
          <main className="flex-1 overflow-y-auto p-2 xl:p-6">
            <div className="text-center text-muted-foreground">로딩 중...</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />

        <main className="flex-1 overflow-y-auto p-2 xl:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">견적서 관리</h1>
              <p className="mt-1 text-sm text-muted-foreground">모든 견적서를 한눈에 확인하고 관리하세요</p>
            </div>
          </div>

          <Tabs value={selectedCompany} onValueChange={setSelectedCompany} className="mb-6">
            <TabsList>
              {companies.map((company) => (
                <TabsTrigger key={company} value={company}>
                  {company}
                  {company === "전체"
                    ? ` (${quotations.length}건)`
                    : ` (${quotations.filter((q) => q.company === company).length}건)`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {selectedCompany === "전체" ? "전체 견적서" : `${selectedCompany} 견적서`} ({filteredQuotations.length}건)
            </h2>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">견적번호</TableHead>
                    <TableHead className="w-[10%]">회사</TableHead>
                    <TableHead className="w-[20%]">거래처</TableHead>
                    <TableHead className="w-[15%]">금액</TableHead>
                    <TableHead className="w-[10%]">상태</TableHead>
                    <TableHead className="w-[12%]">발행일</TableHead>
                    <TableHead className="w-[10%]">담당자</TableHead>
                    <TableHead className="w-[8%] text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">{quotation.quotation_number}</TableCell>
                      <TableCell>{quotation.company}</TableCell>
                      <TableCell>{quotation.deal_name}</TableCell>
                      <TableCell>{formatAmount(quotation.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell>{formatDate(quotation.created_at)}</TableCell>
                      <TableCell>{quotation.assigned_to}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            onClick={() => handleViewQuotation(quotation)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="보기"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleEditQuotation(quotation)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredQuotations.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">견적서 데이터가 없습니다.</p>
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* 견적서 상세 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>견적서 상세</DialogTitle>
          </DialogHeader>

          {selectedQuotation && (
            <div className="space-y-6">
              {/* 견적서 헤더 */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold mb-2">견 적 서</h2>
                <p className="text-sm text-muted-foreground">NO: {selectedQuotation.quotation_number}</p>
              </div>

              {/* 공급자 정보 */}
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">{selectedQuotation.deal_name} 귀하</h3>
                  <p className="text-sm text-muted-foreground">견적일자: {formatDate(selectedQuotation.created_at)}</p>
                  {selectedQuotation.valid_until && (
                    <p className="text-sm text-muted-foreground">
                      유효기간: {formatDate(selectedQuotation.valid_until)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <span className="font-semibold">상호:</span> {selectedQuotation.company}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">담당자:</span> {selectedQuotation.assigned_to}
                  </p>
                </div>
              </div>

              {/* 견적 항목 */}
              <div>
                <h3 className="font-semibold mb-2">견적 내역</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>품목</TableHead>
                      <TableHead className="text-center">수량</TableHead>
                      <TableHead className="text-right">단가</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuotation.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatAmount(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatAmount(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 금액 합계 */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">공급가액:</span>
                  <span>{formatAmount(selectedQuotation.supply_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">부가세(10%):</span>
                  <span>{formatAmount(selectedQuotation.vat_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>총액:</span>
                  <span>{formatAmount(selectedQuotation.total_amount)}</span>
                </div>
              </div>

              {/* 비고 */}
              {selectedQuotation.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">비고</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedQuotation.notes}</p>
                </div>
              )}

              {/* 인쇄 버튼 */}
              <div className="flex justify-end">
                <Button onClick={handlePrintQuotation} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  인쇄
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 견적서 수정 다이얼로그 */}
      <CreateQuotationDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) setEditingQuotation(null)
        }}
        editQuotation={editingQuotation ? {
          id: editingQuotation.id,
          quotation_number: editingQuotation.quotation_number,
          company: editingQuotation.company as "플루타" | "오코랩스",
          title: editingQuotation.title,
          valid_until: editingQuotation.valid_until,
          notes: editingQuotation.notes,
          items: editingQuotation.items.map((item, idx) => ({
            id: `item-${idx}`,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
          })),
        } : null}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
