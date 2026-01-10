"use client"

import { useState, useEffect, useMemo } from "react"
import { CrmSidebar } from "@/components/crm-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarIcon, TrendingDown, BarChart3, AlertCircle, Building2 } from "lucide-react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { ko } from "date-fns/locale"
import { createBrowserClient } from "@/lib/supabase/client"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  CLOSE_REASONS,
  CLOSE_REASON_CATEGORIES,
  getCloseReasonByCode,
  getCloseReasonText,
  type CloseReason,
} from "@/lib/close-reasons"

export default function RetrospectivePage() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 1)))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const loadDeals = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from("deals")
      .select(`
        id,
        deal_name,
        stage,
        close_reason,
        assigned_to,
        first_contact_date,
        updated_at,
        amount_range,
        account:accounts!account_id (
          id,
          company_name
        )
      `)
      .or("stage.eq.S6_complete,stage.eq.S6_closed")
      .gte("updated_at", startDate.toISOString())
      .lte("updated_at", endDate.toISOString())
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("데이터 로드 오류:", JSON.stringify(error, null, 2))
      console.error("오류 메시지:", error.message)
      console.error("오류 코드:", error.code)
    } else {
      console.log("로드된 데이터:", data?.length, "건")
      setDeals(data || [])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadDeals()
  }, [startDate, endDate])

  // 통계 계산
  const statistics = useMemo(() => {
    const categoryStats: Record<string, number> = { C: 0, P: 0, R: 0, I: 0, S: 0 }
    const reasonStats: Record<string, number> = {}
    const unknownCount = { count: 0 }

    deals.forEach((deal) => {
      if (deal.close_reason) {
        const reason = getCloseReasonByCode(deal.close_reason)
        if (reason) {
          categoryStats[reason.category] = (categoryStats[reason.category] || 0) + 1
          reasonStats[deal.close_reason] = (reasonStats[deal.close_reason] || 0) + 1
        } else {
          unknownCount.count++
        }
      } else {
        unknownCount.count++
      }
    })

    return { categoryStats, reasonStats, unknownCount: unknownCount.count }
  }, [deals])

  // 선택된 카테고리에 따른 필터된 딜 목록
  const filteredDeals = useMemo(() => {
    if (!selectedCategory) return deals
    
    return deals.filter((deal) => {
      if (selectedCategory === "unknown") {
        return !deal.close_reason || !getCloseReasonByCode(deal.close_reason)
      }
      const reason = getCloseReasonByCode(deal.close_reason)
      return reason?.category === selectedCategory
    })
  }, [deals, selectedCategory])

  // 상위 종료 사유 (많은 순)
  const topReasons = useMemo(() => {
    return Object.entries(statistics.reasonStats)
      .map(([code, count]) => ({
        code,
        reason: getCloseReasonByCode(code),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [statistics])

  const totalClosed = deals.length

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">회고 · 데이터</h1>
              <p className="text-muted-foreground mt-1">
                종료된 거래의 패턴을 분석하고 개선점을 찾아보세요
              </p>
            </div>

            {/* 날짜 필터 */}
            <div className="flex items-center gap-2">
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "yyyy-MM-dd", { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date)
                        setStartDateOpen(false)
                      }
                    }}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">~</span>

              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "yyyy-MM-dd", { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date)
                        setEndDateOpen(false)
                      }
                    }}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            {/* 전체 종료 */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCategory === null && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedCategory(null)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  전체 종료
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClosed}건</div>
              </CardContent>
            </Card>

            {/* 카테고리별 카드 */}
            {Object.entries(CLOSE_REASON_CATEGORIES).map(([key, category]) => (
              <Card 
                key={key}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedCategory === key && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Badge className={cn("text-xs", category.color)}>{key}</Badge>
                    {category.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.categoryStats[key] || 0}건
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {totalClosed > 0
                      ? `${Math.round(((statistics.categoryStats[key] || 0) / totalClosed) * 100)}%`
                      : "0%"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 상위 종료 사유 */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  상위 종료 사유
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topReasons.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    해당 기간에 종료 사유가 기록된 거래가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topReasons.map(({ code, reason, count }) => (
                      <div key={code} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {reason && (
                            <Badge className={cn("text-xs", CLOSE_REASON_CATEGORIES[reason.category].color)}>
                              {reason.category}
                            </Badge>
                          )}
                          <span className="text-sm">
                            <span className="font-mono text-xs text-muted-foreground mr-1">{code}</span>
                            {reason?.reason || "알 수 없음"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(count / (topReasons[0]?.count || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {statistics.unknownCount > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div 
                      className={cn(
                        "flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-muted",
                        selectedCategory === "unknown" && "bg-muted"
                      )}
                      onClick={() => setSelectedCategory(selectedCategory === "unknown" ? null : "unknown")}
                    >
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">사유 미입력</span>
                      </div>
                      <span className="text-sm font-medium">{statistics.unknownCount}건</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 종료 거래 목록 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    종료 거래 목록
                    {selectedCategory && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedCategory === "unknown" 
                          ? "사유 미입력" 
                          : CLOSE_REASON_CATEGORIES[selectedCategory as keyof typeof CLOSE_REASON_CATEGORIES]?.label}
                        만 표시
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-normal text-muted-foreground">
                    {filteredDeals.length}건
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
                ) : filteredDeals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    해당 기간에 종료된 거래가 없습니다
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>거래처</TableHead>
                          <TableHead>거래명</TableHead>
                          <TableHead>종료 사유</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>종료일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeals.map((deal) => {
                          const reason = getCloseReasonByCode(deal.close_reason)
                          return (
                            <TableRow key={deal.id}>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/deals/${deal.id}`}
                                  className="hover:underline text-primary"
                                >
                                  {deal.account?.company_name || "-"}
                                </Link>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {deal.deal_name || "-"}
                              </TableCell>
                              <TableCell>
                                {reason ? (
                                  <div className="flex items-center gap-1">
                                    <Badge className={cn("text-xs", CLOSE_REASON_CATEGORIES[reason.category].color)}>
                                      {deal.close_reason}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                      {reason.reason}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>{deal.assigned_to || "-"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {deal.updated_at
                                  ? format(new Date(deal.updated_at), "yyyy-MM-dd", { locale: ko })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 카테고리별 상세 분석 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>카테고리별 상세 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(CLOSE_REASON_CATEGORIES).map(([categoryKey, category]) => {
                  const reasons = CLOSE_REASONS.filter((r) => r.category === categoryKey)
                  const categoryTotal = statistics.categoryStats[categoryKey] || 0

                  return (
                    <div key={categoryKey} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={cn("text-xs font-bold", category.color)}>{categoryKey}</Badge>
                        <span className="font-medium">{category.label}</span>
                        <span className="text-muted-foreground text-sm ml-auto">
                          {categoryTotal}건
                        </span>
                      </div>
                      <div className="space-y-1">
                        {reasons.map((reason) => {
                          const count = statistics.reasonStats[reason.code] || 0
                          if (count === 0) return null
                          return (
                            <div
                              key={reason.code}
                              className="flex items-center justify-between text-sm py-1"
                            >
                              <span className="text-muted-foreground truncate">
                                <span className="font-mono text-xs">{reason.code}</span> {reason.reason}
                              </span>
                              <span className="font-medium ml-2">{count}</span>
                            </div>
                          )
                        })}
                        {categoryTotal === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-2">
                            데이터 없음
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

