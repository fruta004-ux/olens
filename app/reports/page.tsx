"use client"

import { useEffect, useState } from "react"
import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Printer, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getRecontactReasonText } from "@/lib/recontact-reasons"

type Deal = {
  id: string
  stage: string
  deal_name: string
  amount_range: string | null
  needs_summary: string | null
  next_contact_date: string | null
  assigned_to: string
  notes: string | null
  close_reason?: string | null
}

export default function ReportsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [recontactDeals, setRecontactDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssignee, setSelectedAssignee] = useState<string>("전체")
  const [viewMode, setViewMode] = useState<"upcoming" | "recontact">("upcoming")
  const supabase = createClient()

  useEffect(() => {
    loadDeals()
    loadRecontactDeals()
  }, [])

  async function loadDeals() {
    try {
      const today = new Date()
      today.setHours(today.getHours() + 9) // UTC → KST 변환
      const threeDaysLater = new Date(today)
      threeDaysLater.setDate(today.getDate() + 3)

      const todayStr = today.toISOString().split("T")[0]
      const threeDaysLaterStr = threeDaysLater.toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          stage,
          deal_name,
          amount_range,
          needs_summary,
          next_contact_date,
          assigned_to,
          account:accounts!account_id (
            notes
          )
        `)
        .gte("next_contact_date", todayStr)
        .lte("next_contact_date", threeDaysLaterStr)
        .order("next_contact_date", { ascending: true })
        .order("assigned_to", { ascending: true })

      if (error) {
        console.error("[v0] 리포트 로드 실패:", error)
        return
      }

      // @ts-ignore - account join 처리
      const mappedDeals = data.map((deal) => ({
        ...deal,
        notes: deal.account?.notes || null,
      }))

      setDeals(mappedDeals)
    } catch (error) {
      console.error("[v0] 리포트 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRecontactDeals() {
    try {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          stage,
          deal_name,
          amount_range,
          needs_summary,
          next_contact_date,
          assigned_to,
          close_reason,
          account:accounts!account_id (
            notes
          )
        `)
        .eq("stage", "S7_recontact")
        .order("next_contact_date", { ascending: true })

      if (error) {
        console.error("[v0] 재접촉 로드 실패:", error)
        return
      }

      // @ts-ignore - account join 처리
      const mappedDeals = data.map((deal) => ({
        ...deal,
        notes: deal.account?.notes || null,
      }))

      setRecontactDeals(mappedDeals)
    } catch (error) {
      console.error("[v0] 재접촉 로드 오류:", error)
    }
  }

  // 작업자별로 거래 그룹화
  const groupedDeals = deals.reduce(
    (acc, deal) => {
      const assignee = deal.assigned_to || "미정"
      if (!acc[assignee]) {
        acc[assignee] = []
      }
      acc[assignee].push(deal)
      return acc
    },
    {} as Record<string, Deal[]>,
  )

  // 재접촉 거래 그룹화
  const groupedRecontactDeals = recontactDeals.reduce(
    (acc, deal) => {
      const assignee = deal.assigned_to || "미정"
      if (!acc[assignee]) {
        acc[assignee] = []
      }
      acc[assignee].push(deal)
      return acc
    },
    {} as Record<string, Deal[]>,
  )

  const currentDeals = viewMode === "upcoming" ? deals : recontactDeals
  const currentGrouped = viewMode === "upcoming" ? groupedDeals : groupedRecontactDeals
  const assignees = ["전체", ...Object.keys(currentGrouped).sort()]

  const filteredDeals = selectedAssignee === "전체" ? currentDeals : currentGrouped[selectedAssignee] || []

  // 재접촉 날짜 상태 확인
  const getRecontactDateStatus = (dateString: string | null) => {
    if (!dateString) return { status: "none", label: "", className: "" }
    
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { status: "overdue", label: `${Math.abs(diffDays)}일 지남`, className: "bg-red-100 text-red-700" }
    }
    if (diffDays === 0) {
      return { status: "today", label: "오늘", className: "bg-yellow-100 text-yellow-700" }
    }
    if (diffDays <= 7) {
      return { status: "soon", label: `${diffDays}일 후`, className: "bg-blue-100 text-blue-700" }
    }
    return { status: "later", label: `${diffDays}일 후`, className: "bg-gray-100 text-gray-600" }
  }

  function formatStageWithCode(stage: string): string {
    const englishToKoreanMap: Record<string, string> = {
      new_lead: "S0_신규 유입",
      S0_new_lead: "S0_신규 유입",
      qualified: "S1_유효 리드",
      S1_qualified: "S1_유효 리드",
      consultation: "S2_상담 완료",
      S2_consultation: "S2_상담 완료",
      contact: "S2_상담 완료",
      S2_contact: "S2_상담 완료",
      proposal: "S3_제안 발송",
      S3_proposal: "S3_제안 발송",
      decision: "S4_결정 대기",
      S4_decision: "S4_결정 대기",
      negotiation: "S4_결정 대기",
      S4_negotiation: "S4_결정 대기",
      closed_won: "S4_결정 대기",
      S4_closed_won: "S4_결정 대기",
      contract: "S5_계약완료",
      S5_contract: "S5_계약완료",
      complete: "S5_계약완료",
      S5_complete: "S5_계약완료",
      closed: "S6_종료",
      S6_closed: "S6_종료",
      S6_complete: "S6_종료",
      S7_recontact: "S7_재접촉",
    }

    const koreanToCodeMap: Record<string, string> = {
      "신규 유입": "S0_신규 유입",
      "유효 리드": "S1_유효 리드",
      "상담 완료": "S2_상담 완료",
      "제안 발송": "S3_제안 발송",
      "결정 대기": "S4_결정 대기",
      "견적 내기": "S4_결정 대기",
      계약완료: "S5_계약완료",
      종료: "S6_종료",
      재문의: "S6_종료",
      재접촉: "S7_재접촉",
    }

    // 영어 형식이면 먼저 변환
    if (englishToKoreanMap[stage]) {
      return englishToKoreanMap[stage]
    }

    // 이미 코드가 포함된 경우 그대로 반환
    if (stage.match(/^S\d+_/)) {
      return stage
    }

    // 한글만 있는 경우 코드 추가
    return koreanToCodeMap[stage] || stage
  }

  // 날짜 포맷 함수
  function formatDate(date: string | null): string {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("ko-KR")
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CrmHeader />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="text-center text-muted-foreground">로딩 중...</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="print:hidden">
        <CrmSidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="print:hidden">
          <CrmHeader />
        </div>

        <main className="flex-1 overflow-y-auto p-6 print:p-0">
          <div className="mb-6 flex items-center justify-between print:mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground print:text-2xl">영업 리포트</h1>
              <p className="mt-1 text-sm text-muted-foreground print:hidden">작업자별 거래 현황을 확인하세요</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {/* 뷰 모드 토글 */}
              <div className="flex rounded-lg border bg-muted p-1">
                <button
                  onClick={() => setViewMode("upcoming")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === "upcoming"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  예정된 연락 ({deals.length})
                </button>
                <button
                  onClick={() => setViewMode("recontact")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    viewMode === "recontact"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  재접촉 대기 ({recontactDeals.length})
                </button>
              </div>
              <Button onClick={handlePrint} variant="outline" className="bg-transparent">
                <Printer className="mr-2 h-4 w-4" />
                인쇄
              </Button>
            </div>
          </div>

          <Tabs value={selectedAssignee} onValueChange={setSelectedAssignee} className="mb-6 print:hidden">
            <TabsList>
              {assignees.map((assignee) => (
                <TabsTrigger key={assignee} value={assignee}>
                  {assignee}
                  {assignee === "전체" ? ` (${deals.length}건)` : ` (${groupedDeals[assignee]?.length || 0}건)`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mb-4 hidden print:block">
            <p className="text-lg font-semibold">
              {selectedAssignee === "전체" ? "전체 거래" : `${selectedAssignee}의 거래`} ({filteredDeals.length}건)
            </p>
            <p className="text-sm text-muted-foreground">
              인쇄일: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <Card className="p-6 print:border-0 print:p-0 print:shadow-none">
            <h2 className="mb-4 text-xl font-semibold text-foreground print:hidden">
              {viewMode === "recontact" ? "재접촉 대기 목록" : (selectedAssignee === "전체" ? "전체 거래" : `${selectedAssignee}의 거래`)} ({filteredDeals.length}건)
            </h2>

            <div className="overflow-x-auto">
              <Table className="print:text-sm">
                <TableHeader>
                  <TableRow className="print:border-black">
                    <TableHead className="w-[5%] print:py-2">순번</TableHead>
                    {viewMode === "recontact" ? (
                      <>
                        <TableHead className="w-[15%] print:py-2">프로젝트명</TableHead>
                        <TableHead className="w-[12%] print:py-2">재접촉 예정일</TableHead>
                        <TableHead className="w-[20%] print:py-2">재접촉 사유</TableHead>
                        <TableHead className="w-[15%] print:py-2">규모(원)</TableHead>
                        <TableHead className="w-[15%] print:py-2">니즈</TableHead>
                        <TableHead className="w-[10%] print:py-2">담당자</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-[10%] print:py-2">상태</TableHead>
                        <TableHead className="w-[15%] print:py-2">프로젝트명</TableHead>
                        <TableHead className="w-[15%] print:py-2">규모(원)</TableHead>
                        <TableHead className="w-[20%] print:py-2">니즈</TableHead>
                        <TableHead className="w-[10%] print:py-2">다음 연락일</TableHead>
                        <TableHead className="w-[25%] print:py-2">비고</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeals.map((deal, index) => {
                    const recontactStatus = getRecontactDateStatus(deal.next_contact_date)
                    return (
                      <TableRow key={deal.id} className="print:border-black">
                        <TableCell className="print:py-2">{index + 1}</TableCell>
                        {viewMode === "recontact" ? (
                          <>
                            <TableCell className="font-medium print:py-2">{deal.deal_name}</TableCell>
                            <TableCell className="print:py-2">
                              <div className="flex items-center gap-2">
                                <span>{formatDate(deal.next_contact_date)}</span>
                                {recontactStatus.label && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${recontactStatus.className}`}>
                                    {recontactStatus.label}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="print:py-2 text-sm">
                              {deal.close_reason ? getRecontactReasonText(deal.close_reason) : "-"}
                            </TableCell>
                            <TableCell className="print:py-2">{deal.amount_range || "-"}</TableCell>
                            <TableCell className="print:py-2">{deal.needs_summary || "-"}</TableCell>
                            <TableCell className="print:py-2">{deal.assigned_to || "미정"}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="print:py-2">{formatStageWithCode(deal.stage)}</TableCell>
                            <TableCell className="font-medium print:py-2">{deal.deal_name}</TableCell>
                            <TableCell className="print:py-2">{deal.amount_range || "-"}</TableCell>
                            <TableCell className="print:py-2">{deal.needs_summary || "-"}</TableCell>
                            <TableCell className="print:py-2">{formatDate(deal.next_contact_date)}</TableCell>
                            <TableCell className="max-w-xs truncate print:py-2">{deal.notes || "-"}</TableCell>
                          </>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredDeals.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  {viewMode === "recontact" ? "재접촉 대기 중인 거래가 없습니다." : "거래 데이터가 없습니다."}
                </p>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
