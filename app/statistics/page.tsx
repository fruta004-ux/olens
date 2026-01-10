"use client"

import { useEffect, useState } from "react"
import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, Users, Filter, ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

type Deal = {
  id: string
  stage: string
  deal_name: string
  first_contact_date: string | null
  inflow_source: string | null
  needs_summary: string | null
  assigned_to: string | null
  amount_range: string | null
}

type CalendarDay = {
  date: Date
  deals: Deal[]
  isCurrentMonth: boolean
}

export default function StatisticsPage() {
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // 날짜 범위 필터
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    try {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          stage,
          deal_name,
          first_contact_date,
          inflow_source,
          needs_summary,
          assigned_to,
          amount_range
        `)
        .order("first_contact_date", { ascending: false })

      if (error) {
        console.error("[v0] 통계 데이터 로드 실패:", error)
        return
      }

      setAllDeals(data || [])
    } catch (error) {
      console.error("[v0] 통계 데이터 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  // 날짜 범위에 따라 필터된 거래 목록
  const deals = allDeals.filter(deal => {
    if (!deal.first_contact_date) return false
    
    const dealDate = new Date(deal.first_contact_date)
    dealDate.setHours(0, 0, 0, 0)
    
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (dealDate < start) return false
    }
    
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (dealDate > end) return false
    }
    
    return true
  })

  // 날짜 필터가 적용되지 않은 경우 전체 표시 (first_contact_date가 없는 것도 포함)
  const dealsForStats = (startDate || endDate) ? deals : allDeals

  // 날짜 범위 초기화
  const clearDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  // 빠른 날짜 범위 설정
  const setQuickDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start)
    setEndDate(end)
  }

  const setThisMonth = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(start)
    setEndDate(end)
  }

  const setLastMonth = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    setStartDate(start)
    setEndDate(end)
  }

  const setThisYear = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31)
    setStartDate(start)
    setEndDate(end)
  }

  // 월별 캘린더 데이터 생성
  const generateCalendarData = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const startDateCal = new Date(firstDay)
    startDateCal.setDate(startDateCal.getDate() - firstDay.getDay())
    
    const endDateCal = new Date(lastDay)
    endDateCal.setDate(endDateCal.getDate() + (6 - lastDay.getDay()))
    
    const days: CalendarDay[] = []
    const current = new Date(startDateCal)
    
    while (current <= endDateCal) {
      const dateStr = current.toISOString().split("T")[0]
      const dayDeals = allDeals.filter(deal => {
        if (!deal.first_contact_date) return false
        const dealDate = deal.first_contact_date.split("T")[0]
        return dealDate === dateStr
      })
      
      days.push({
        date: new Date(current),
        deals: dayDeals,
        isCurrentMonth: current.getMonth() === month
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  // 유입 경로별 통계
  const getInflowSourceStats = () => {
    const stats: Record<string, number> = {}
    const targetDeals = dealsForStats
    
    targetDeals.forEach(deal => {
      const source = deal.inflow_source || "미지정"
      stats[source] = (stats[source] || 0) + 1
    })
    
    const total = targetDeals.length
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
  }

  // 니즈 축약별 통계
  const getNeedsSummaryStats = () => {
    const stats: Record<string, number> = {}
    const targetDeals = dealsForStats
    
    targetDeals.forEach(deal => {
      if (deal.needs_summary) {
        const needs = deal.needs_summary.split(",").map(n => n.trim()).filter(Boolean)
        needs.forEach(need => {
          stats[need] = (stats[need] || 0) + 1
        })
      } else {
        stats["미지정"] = (stats["미지정"] || 0) + 1
      }
    })
    
    const total = targetDeals.length
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([need, count]) => ({ need, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
  }

  // 월별 첫 문의 통계
  const getMonthlyStats = () => {
    const stats: Record<string, number> = {}
    const targetDeals = dealsForStats
    
    targetDeals.forEach(deal => {
      if (deal.first_contact_date) {
        const date = new Date(deal.first_contact_date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        stats[key] = (stats[key] || 0) + 1
      }
    })
    
    return Object.entries(stats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, count]) => ({ month, count }))
  }

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const calendarData = generateCalendarData()
  const inflowStats = getInflowSourceStats()
  const needsStats = getNeedsSummaryStats()
  const monthlyStats = getMonthlyStats()

  // 요일 헤더
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"]

  // 현재 월의 총 문의 수
  const currentMonthDeals = allDeals.filter(deal => {
    if (!deal.first_contact_date) return false
    const date = new Date(deal.first_contact_date)
    return date.getFullYear() === currentDate.getFullYear() && 
           date.getMonth() === currentDate.getMonth()
  })

  // 필터 적용 여부
  const isFiltered = startDate || endDate

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CrmHeader />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">통계 데이터 로딩중...</p>
              </div>
            </div>
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

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">통계</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              첫 문의 기준 캘린더, 유입 경로, 니즈 축약 통계를 확인하세요
            </p>
          </div>

          {/* 날짜 범위 필터 */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">기간 설정</Label>
                </div>
                
                {/* 시작일 */}
                <div className="flex items-center gap-2">
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[160px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "yyyy-MM-dd") : "시작일"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date)
                          setStartDateOpen(false)
                        }}
                        locale={ko}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-muted-foreground">~</span>
                  
                  {/* 종료일 */}
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[160px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "yyyy-MM-dd") : "종료일"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          setEndDateOpen(false)
                        }}
                        locale={ko}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* 빠른 선택 버튼 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                    최근 7일
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                    최근 30일
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                    최근 90일
                  </Button>
                  <Button variant="outline" size="sm" onClick={setThisMonth}>
                    이번 달
                  </Button>
                  <Button variant="outline" size="sm" onClick={setLastMonth}>
                    지난 달
                  </Button>
                  <Button variant="outline" size="sm" onClick={setThisYear}>
                    올해
                  </Button>
                </div>

                {/* 필터 초기화 */}
                {isFiltered && (
                  <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-1" />
                    초기화
                  </Button>
                )}
              </div>
              
              {/* 필터 적용 결과 표시 */}
              {isFiltered && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {startDate && format(startDate, "yyyy.MM.dd", { locale: ko })}
                    {startDate && endDate && " ~ "}
                    {endDate && format(endDate, "yyyy.MM.dd", { locale: ko })}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    총 <span className="font-semibold text-foreground">{dealsForStats.length}건</span>의 거래
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isFiltered ? "필터된 거래" : "전체 거래"}
                    </p>
                    <p className="text-2xl font-bold">{dealsForStats.length}건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">이번 달 문의</p>
                    <p className="text-2xl font-bold">{currentMonthDeals.length}건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">유입 경로 수</p>
                    <p className="text-2xl font-bold">{inflowStats.length}개</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Filter className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">니즈 카테고리</p>
                    <p className="text-2xl font-bold">{needsStats.length}개</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                첫 문의 캘린더
              </TabsTrigger>
              <TabsTrigger value="inflow" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                유입 경로
              </TabsTrigger>
              <TabsTrigger value="needs" className="gap-2">
                <Filter className="h-4 w-4" />
                니즈 축약
              </TabsTrigger>
            </TabsList>

            {/* 첫 문의 캘린더 탭 */}
            <TabsContent value="calendar">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 첫 문의 현황
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={goToToday}>
                        오늘
                      </Button>
                      <Button variant="outline" size="sm" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    이번 달 총 {currentMonthDeals.length}건의 첫 문의
                  </p>
                </CardHeader>
                <CardContent>
                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day, index) => (
                      <div 
                        key={day} 
                        className={cn(
                          "text-center text-sm font-medium py-2",
                          index === 0 && "text-red-500",
                          index === 6 && "text-blue-500"
                        )}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* 캘린더 그리드 */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarData.map((day, index) => {
                      const isToday = day.date.toDateString() === new Date().toDateString()
                      const dayOfWeek = day.date.getDay()
                      
                      return (
                        <div
                          key={index}
                          className={cn(
                            "min-h-[100px] p-2 border rounded-lg transition-colors",
                            day.isCurrentMonth ? "bg-card" : "bg-muted/30",
                            isToday && "ring-2 ring-primary",
                            day.deals.length > 0 && day.isCurrentMonth && "bg-purple-50 dark:bg-purple-950/30"
                          )}
                        >
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            !day.isCurrentMonth && "text-muted-foreground",
                            dayOfWeek === 0 && "text-red-500",
                            dayOfWeek === 6 && "text-blue-500",
                            isToday && "text-primary font-bold"
                          )}>
                            {day.date.getDate()}
                          </div>
                          
                          {day.deals.length > 0 && (
                            <div className="space-y-1">
                              {day.deals.slice(0, 3).map((deal) => (
                                <div
                                  key={deal.id}
                                  className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate"
                                  title={deal.deal_name}
                                >
                                  {deal.deal_name}
                                </div>
                              ))}
                              {day.deals.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{day.deals.length - 3}건 더
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 유입 경로 탭 */}
            <TabsContent value="inflow">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>유입 경로별 통계</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {isFiltered ? "필터된 기간" : "전체"} {dealsForStats.length}건 기준
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inflowStats.map((stat, index) => (
                        <div key={stat.source} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground w-6">
                                {index + 1}.
                              </span>
                              <span className="font-medium">{stat.source}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{stat.count}건</Badge>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {stat.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden ml-8">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      
                      {inflowStats.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          유입 경로 데이터가 없습니다.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>월별 첫 문의 추이</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {isFiltered ? "필터된 기간" : "최근 12개월"} 기준
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monthlyStats.map((stat) => {
                        const [year, month] = stat.month.split("-")
                        const maxCount = Math.max(...monthlyStats.map(s => s.count))
                        const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0
                        
                        return (
                          <div key={stat.month} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {year}년 {parseInt(month)}월
                              </span>
                              <Badge variant="outline">{stat.count}건</Badge>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      
                      {monthlyStats.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          월별 데이터가 없습니다.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 니즈 축약 탭 */}
            <TabsContent value="needs">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>니즈 축약별 통계</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {isFiltered ? "필터된 기간" : "전체"} 거래의 니즈 분포 (중복 포함)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {needsStats.map((stat, index) => (
                        <div key={stat.need} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground w-6">
                                {index + 1}.
                              </span>
                              <span className="font-medium">{stat.need}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{stat.count}건</Badge>
                              <span className="text-sm text-muted-foreground w-12 text-right">
                                {stat.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden ml-8">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      
                      {needsStats.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          니즈 축약 데이터가 없습니다.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>니즈별 상세 현황</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      각 니즈에 해당하는 거래 목록
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {needsStats.slice(0, 5).map((stat) => {
                        const relatedDeals = dealsForStats.filter(deal => 
                          deal.needs_summary?.includes(stat.need) || 
                          (stat.need === "미지정" && !deal.needs_summary)
                        )
                        
                        return (
                          <div key={stat.need} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">{stat.need}</span>
                              <Badge>{stat.count}건</Badge>
                            </div>
                            <div className="space-y-1">
                              {relatedDeals.slice(0, 3).map(deal => (
                                <div 
                                  key={deal.id}
                                  className="text-sm text-muted-foreground pl-2 border-l-2 border-muted"
                                >
                                  {deal.deal_name}
                                </div>
                              ))}
                              {relatedDeals.length > 3 && (
                                <div className="text-xs text-muted-foreground pl-2">
                                  외 {relatedDeals.length - 3}건
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
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
