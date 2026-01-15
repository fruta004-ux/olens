"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CrmSidebar } from "@/components/crm-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Target,
  FileText,
  Clock,
  Calendar,
  TrendingUp,
  ExternalLink,
  Megaphone,
  Home,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"

// 배너 이미지 (이미지만 사용)
const banners = [
  { id: 1, image: "/images/banner-1.png", alt: "배너 1" },
]

// 하단 배너 이미지
const bottomBanners = [
  { id: 1, image: "/images/banner-1.png", alt: "광고 배너 1" },
  { id: 2, image: "/images/ad-banner-2.png", alt: "광고 배너 2" },
]

// 공지사항 더미 데이터
const notices = [
  { id: 1, type: "안내", title: "영업 CRM 사용방법, 쉽게 알려드려요 :)", isNew: true },
  { id: 2, type: "공지", title: "v1.7 패치노트 업데이트 안내", isNew: true },
  { id: 3, type: "공지", title: "새로운 견적서 템플릿 추가 안내", isNew: false },
  { id: 4, type: "공지", title: "파이프라인 분석 기능 개선", isNew: false },
  { id: 5, type: "공지", title: "시스템 정기 점검 안내 (1/15)", isNew: false },
]

// 빠른 바로가기
const quickLinks = [
  { name: "대시보드", href: "/dashboard", icon: LayoutDashboard, description: "영업 현황 한눈에" },
  { name: "영업 현황", href: "/deals", icon: Target, description: "딜 관리하기" },
  { name: "견적서", href: "/quotations", icon: FileText, description: "견적 작성하기" },
]

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentBanner, setCurrentBanner] = useState(0)
  const [currentBottomBanner, setCurrentBottomBanner] = useState(0)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [pipelineStats, setPipelineStats] = useState({ s3Count: 0, s3Amount: 0, s4Count: 0, s4Amount: 0 })
  const [currentDate] = useState(new Date())

  // 배너 자동 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // 데이터 로드
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // 파이프라인 통계
    const { data: s3Deals } = await supabase
      .from("deals")
      .select("amount_range")
      .in("stage", ["S3_proposal", "S3_제안 발송"])

    const { data: s4Deals } = await supabase
      .from("deals")
      .select("amount_range")
      .in("stage", ["S4_negotiation", "S4_decision", "S4_결정 대기", "S4_협상"])

    setPipelineStats({
      s3Count: s3Deals?.length || 0,
      s3Amount: 78600000, // 더미
      s4Count: s4Deals?.length || 0,
      s4Amount: 127400000, // 더미
    })

    // 최근 활동
    const { data: activities } = await supabase
      .from("activities")
      .select("id, title, activity_type, created_at, deal_id")
      .order("created_at", { ascending: false })
      .limit(5)

    if (activities) {
      setRecentActivities(activities)
    }
  }

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % banners.length)
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)
  const nextBottomBanner = () => setCurrentBottomBanner((prev) => (prev + 1) % bottomBanners.length)
  const prevBottomBanner = () => setCurrentBottomBanner((prev) => (prev - 1 + bottomBanners.length) % bottomBanners.length)

  const formatWon = (amount: number) => `${amount.toLocaleString()}원`

  return (
    <div className="flex min-h-screen">
      <CrmSidebar />
      
      <main className="flex-1 flex flex-col">
        {/* 헤더 - 여백 없이 */}
        <PageHeader icon={Home} title="홈" className="shrink-0" />
        
        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex flex-col gap-4 xl:gap-6 px-4 xl:px-12 py-4 xl:py-6">
          
          {/* 1행: 배너 + 환영/바로가기 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* 상단 배너 - 이미지 전용 */}
            <div className="lg:col-span-3 relative overflow-hidden rounded-xl shadow-lg bg-muted">
              <div className="relative h-full min-h-[200px]">
                {/* 배너 이미지 */}
                <Image
                  src={banners[currentBanner].image}
                  alt={banners[currentBanner].alt}
                  fill
                  className="object-cover"
                  priority
                />
                {/* 배너가 2개 이상일 때만 화살표/인디케이터 표시 */}
                {banners.length > 1 && (
                  <>
                    <button onClick={prevBanner} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors z-10">
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </button>
                    <button onClick={nextBanner} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors z-10">
                      <ChevronRight className="h-6 w-6 text-white" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {banners.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentBanner(idx)} className={cn("w-2.5 h-2.5 rounded-full transition-all", currentBanner === idx ? "bg-white w-6" : "bg-white/50")} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 환영 + 바로가기 */}
            <div className="lg:col-span-2 bg-muted/50 rounded-2xl p-6 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-primary">오렌즈님!</h2>
                <p className="text-base text-foreground">쉽고 재밌는 영업 관리 시작해요 :)</p>
              </div>
              <div className="grid grid-cols-3 gap-3 flex-1">
                {quickLinks.map((link) => (
                  <button key={link.name} onClick={() => router.push(link.href)} className="bg-background rounded-xl p-4 text-left hover:shadow-md transition-all group flex flex-col">
                    <h3 className="font-bold text-sm mb-1">{link.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>바로가기</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    <div className="mt-auto flex justify-end pt-3">
                      <link.icon className="h-12 w-12 text-primary/70 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2행: 공지사항 + 파이프라인 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* 공지사항 */}
            <Card className="lg:col-span-3 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    공지사항
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-sm text-muted-foreground">
                    더보기 <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1">
                <div className="space-y-1">
                  {notices.slice(0, 3).map((notice) => (
                    <div key={notice.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                      <Badge variant={notice.type === "안내" ? "default" : "secondary"} className={cn("text-xs px-2 shrink-0", notice.type === "안내" && "bg-primary")}>{notice.type}</Badge>
                      <span className="flex-1 text-sm truncate">{notice.title}</span>
                      {notice.isNew && <Badge variant="destructive" className="text-xs px-1.5">N</Badge>}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 파이프라인 요약 */}
            <Card className="lg:col-span-2 flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  이번 달 파이프라인
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-xs">S3</Badge>
                    <span className="text-sm">제안발송 {pipelineStats.s3Count}건</span>
                  </div>
                  <span className="text-sm font-medium">{formatWon(pipelineStats.s3Amount)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500 text-xs">S4</Badge>
                    <span className="text-sm">결정대기 {pipelineStats.s4Count}건</span>
                  </div>
                  <span className="text-sm font-medium">{formatWon(pipelineStats.s4Amount)}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm">예상 매출</span>
                  <span className="text-base font-bold text-green-600">{formatWon(pipelineStats.s3Amount * 0.1 + pipelineStats.s4Amount * 0.2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3행: 하단배너 + 캘린더 + 최근활동 (1줄) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 하단 배너 - 이미지 전용 */}
            <div className="relative overflow-hidden rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-muted">
              <div className="relative h-full min-h-[120px]">
                {/* 배너 이미지 */}
                <Image
                  src={bottomBanners[currentBottomBanner].image}
                  alt={bottomBanners[currentBottomBanner].alt}
                  fill
                  className="object-cover"
                />
                <button onClick={prevBottomBanner} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center z-10">
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button onClick={nextBottomBanner} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center z-10">
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {bottomBanners.map((_, idx) => (
                    <button key={idx} onClick={() => setCurrentBottomBanner(idx)} className={cn("w-2 h-2 rounded-full transition-all", currentBottomBanner === idx ? "bg-white w-4" : "bg-white/50")} />
                  ))}
                </div>
              </div>
            </div>

            {/* 미니 캘린더 */}
            <Card className="flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {format(currentDate, "yyyy년 M월", { locale: ko })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex items-center">
                <div className="grid grid-cols-7 gap-1 text-center text-xs w-full">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
                    <div key={day} className={cn("py-1 font-medium", idx === 0 && "text-red-500", idx === 6 && "text-primary")}>{day}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
                    const lastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
                    const day = i - firstDay + 1
                    const isToday = day === currentDate.getDate()
                    const isValid = day > 0 && day <= lastDate
                    return (
                      <div key={i} className={cn("py-1 rounded-full", isValid && "hover:bg-muted cursor-pointer", isToday && "bg-primary text-white font-bold", !isValid && "text-transparent")}>
                        {isValid ? day : "."}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 최근 활동 */}
            <Card className="flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    최근 활동
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-sm text-muted-foreground">더보기</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-auto">
                {recentActivities.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivities.slice(0, 4).map((activity) => (
                      <div key={activity.id} className="flex items-center gap-2 py-1.5 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="flex-1 truncate">{activity.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{format(new Date(activity.created_at), "M/d")}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-sm text-muted-foreground">최근 활동 없음</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
