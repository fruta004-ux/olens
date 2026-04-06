"use client"

import { useEffect, useState } from "react"
import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Eye, Pencil } from "lucide-react"
import { CreateQuotationDialog } from "@/components/create-quotation-dialog"
import { QuotationViewDialog } from "@/components/quotation-view-dialog"
import { createClient } from "@/lib/supabase/client"

type Quotation = {
  id: string
  quotation_number: string
  company: "플루타" | "오코랩스"
  deal_name: string
  client_name: string
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
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("견적서 로드 실패:", error)
        return
      }

      // deal_id 또는 client_id가 있는 견적서의 거래처명 조회
      const dealIds = data.filter(q => q.deal_id).map(q => q.deal_id)
      const clientIds = data.filter(q => q.client_id).map(q => q.client_id)

      let dealsMap: Record<string, { deal_name: string; assigned_to: string }> = {}
      let clientsMap: Record<string, { company_name: string }> = {}

      // deals 정보 조회
      if (dealIds.length > 0) {
        const { data: deals } = await supabase
          .from("deals")
          .select("id, deal_name, assigned_to")
          .in("id", dealIds)
        
        if (deals) {
          dealsMap = deals.reduce((acc, d) => {
            acc[d.id] = { deal_name: d.deal_name, assigned_to: d.assigned_to }
            return acc
          }, {} as Record<string, { deal_name: string; assigned_to: string }>)
        }
      }

      // clients 정보 조회 (client_activities와 연결된 클라이언트)
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("accounts")
          .select("id, company_name")
          .in("id", clientIds)
        
        if (clients) {
          clientsMap = clients.reduce((acc, c) => {
            acc[c.id] = { company_name: c.company_name }
            return acc
          }, {} as Record<string, { company_name: string }>)
        }
      }

      const mappedQuotations = data.map((q) => ({
        ...q,
        deal_name: q.deal_id ? (dealsMap[q.deal_id]?.deal_name || "-") : "-",
        client_name: q.client_id ? (clientsMap[q.client_id]?.company_name || "-") : "-",
        assigned_to: q.deal_id ? (dealsMap[q.deal_id]?.assigned_to || "미정") : "미정",
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
                      <TableCell>{quotation.deal_name !== "-" ? quotation.deal_name : quotation.client_name}</TableCell>
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

      {/* 견적서 상세 다이얼로그 - deals 페이지와 동일한 형태 */}
      {selectedQuotation && (
        <QuotationViewDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          quotation={selectedQuotation}
          clientName={selectedQuotation.deal_name !== "-" ? selectedQuotation.deal_name : selectedQuotation.client_name}
          onEdit={() => {
            setShowDetailDialog(false)
            handleEditQuotation(selectedQuotation)
          }}
        />
      )}

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
