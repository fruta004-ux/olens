"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { CrmSidebar } from "@/components/crm-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeedbackEditor } from "@/components/feedback-editor"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Bug, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
  Trash2
} from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
type BugReport = {
  id: string
  title: string
  description: string | null
  reporter: string
  severity: string
  status: string
  affected_area: string | null
  images: string[] | null
  resolution: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "접수됨", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: <AlertCircle className="h-3 w-3" /> },
  investigating: { label: "조사중", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: <Search className="h-3 w-3" /> },
  in_progress: { label: "수정중", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: <Wrench className="h-3 w-3" /> },
  resolved: { label: "해결됨", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  closed: { label: "종료", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  wont_fix: { label: "수정안함", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: <XCircle className="h-3 w-3" /> },
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  critical: { label: "심각", color: "text-red-600", bgColor: "bg-red-500", icon: <AlertTriangle className="h-4 w-4" /> },
  high: { label: "높음", color: "text-orange-600", bgColor: "bg-orange-500", icon: <AlertCircle className="h-4 w-4" /> },
  medium: { label: "보통", color: "text-amber-600", bgColor: "bg-amber-500", icon: <Info className="h-4 w-4" /> },
  low: { label: "낮음", color: "text-green-600", bgColor: "bg-green-500", icon: <Info className="h-4 w-4" /> },
}

const AFFECTED_AREA_OPTIONS = [
  "대시보드",
  "영업현황",
  "거래 상세",
  "연락처",
  "견적서",
  "설정",
  "로그인/인증",
  "기타",
]

export default function BugReportsPage() {
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
  const [newReport, setNewReport] = useState({
    title: "",
    description: "",
    reporter: "",
    severity: "medium",
    affected_area: "기타",
    images: [] as string[],
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("버그 리포트 로드 실패:", error.message, error.details, error.hint)
        return
      }
      setReports(data || [])
    } catch (error: any) {
      console.error("버그 리포트 로드 실패:", error?.message || error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() }
      
      // resolved 상태로 변경 시 resolved_at 기록
      if (newStatus === "resolved" || newStatus === "closed") {
        updateData.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from("bug_reports")
        .update(updateData)
        .eq("id", id)

      if (error) {
        console.error("상태 변경 실패:", error.message)
        alert(`상태 변경 실패: ${error.message}`)
        return
      }

      // 로컬 상태 업데이트
      setReports(reports.map(r => r.id === id ? { ...r, ...updateData } : r))
      if (selectedReport?.id === id) {
        setSelectedReport({ ...selectedReport, ...updateData })
      }
    } catch (error) {
      console.error("상태 변경 에러:", error)
    }
  }

  const handleUpdateResolution = async (id: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ 
          resolution, 
          resolved_by: "관리자", // 나중에 실제 사용자로 변경 가능
          updated_at: new Date().toISOString() 
        })
        .eq("id", id)

      if (error) {
        console.error("해결 방법 저장 실패:", error.message)
        return
      }

      // 로컬 상태 업데이트
      setReports(reports.map(r => r.id === id ? { ...r, resolution, resolved_by: "관리자" } : r))
      if (selectedReport?.id === id) {
        setSelectedReport({ ...selectedReport, resolution, resolved_by: "관리자" })
      }
    } catch (error) {
      console.error("해결 방법 저장 에러:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 버그 리포트를 삭제하시겠습니까?")) return

    try {
      const { error } = await supabase
        .from("bug_reports")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("삭제 실패:", error.message)
        alert(`삭제 실패: ${error.message}`)
        return
      }

      // 로컬 상태 업데이트
      setReports(reports.filter(r => r.id !== id))
      setSelectedReport(null)
    } catch (error) {
      console.error("삭제 에러:", error)
    }
  }

  const handleSubmit = async () => {
    if (!newReport.title.trim() || !newReport.reporter.trim()) {
      alert("제목과 신고자를 입력해주세요.")
      return
    }

    try {
      const { error } = await supabase.from("bug_reports").insert({
        title: newReport.title,
        description: newReport.description || null,
        reporter: newReport.reporter,
        severity: newReport.severity,
        affected_area: newReport.affected_area,
        images: newReport.images.length > 0 ? newReport.images : null,
        status: "open",
      })

      if (error) {
        console.error("버그 등록 실패:", error.message, error.details, error.hint)
        alert(`등록 실패: ${error.message}`)
        return
      }

      setNewReport({
        title: "",
        description: "",
        reporter: "",
        severity: "medium",
        affected_area: "기타",
        images: [],
      })
      setIsDialogOpen(false)
      loadReports()
    } catch (error) {
      console.error("버그 리포트 등록 실패:", error)
      alert("등록에 실패했습니다.")
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporter.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: reports.length }
    reports.forEach((report) => {
      counts[report.status] = (counts[report.status] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  // 미해결 버그 수
  const openBugsCount = reports.filter(
    (r) => r.status === "open" || r.status === "investigating" || r.status === "in_progress"
  ).length

  return (
    <div className="flex min-h-screen bg-background">
      <CrmSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bug className="h-6 w-6 text-red-500" />
                버그 리포트
                {openBugsCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {openBugsCount}건 미해결
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">
                발견된 오류를 신고하고 처리 현황을 확인하세요
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Plus className="h-4 w-4" />
                  버그 신고
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-red-500" />
                    버그 신고
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목 *</Label>
                    <Input
                      id="title"
                      placeholder="버그 제목을 입력하세요"
                      value={newReport.title}
                      onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>상세 설명 (재현 방법 포함) + 스크린샷</Label>
                    <FeedbackEditor
                      value={newReport.description}
                      onChange={(value) => setNewReport({ ...newReport, description: value })}
                      placeholder="1. 어떤 화면에서&#10;2. 어떤 동작을 하면&#10;3. 어떤 문제가 발생하는지"
                      images={newReport.images}
                      onImagesChange={(images) => setNewReport({ ...newReport, images })}
                      bucketName="feedback-images"
                      folderPath="bug-reports"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reporter">신고자 *</Label>
                      <Input
                        id="reporter"
                        placeholder="이름"
                        value={newReport.reporter}
                        onChange={(e) => setNewReport({ ...newReport, reporter: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="severity">심각도</Label>
                      <Select
                        value={newReport.severity}
                        onValueChange={(value) => setNewReport({ ...newReport, severity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">🔴 심각 - 시스템 장애</SelectItem>
                          <SelectItem value="high">🟠 높음 - 주요 기능 불가</SelectItem>
                          <SelectItem value="medium">🟡 보통 - 기능 일부 장애</SelectItem>
                          <SelectItem value="low">🟢 낮음 - 사소한 이슈</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="affected_area">영향받는 영역</Label>
                    <Select
                      value={newReport.affected_area}
                      onValueChange={(value) => setNewReport({ ...newReport, affected_area: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AFFECTED_AREA_OPTIONS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">취소</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleSubmit}>신고하기</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 상태 필터 탭 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="gap-1"
            >
              전체 <Badge variant="secondary" className="ml-1">{statusCounts.all || 0}</Badge>
            </Button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={statusFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(key)}
                className="gap-1"
              >
                {config.icon}
                {config.label}
                {statusCounts[key] > 0 && (
                  <Badge variant="secondary" className="ml-1">{statusCounts[key]}</Badge>
                )}
              </Button>
            ))}
          </div>

          {/* 검색 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="제목, 신고자, 설명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 테이블 */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bug className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>등록된 버그 리포트가 없습니다</p>
                  <p className="text-sm mt-1">문제가 발견되면 신고해주세요!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">심각도</TableHead>
                      <TableHead className="w-[100px]">상태</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead className="w-[100px]">영향 영역</TableHead>
                      <TableHead className="w-[80px]">신고자</TableHead>
                      <TableHead className="w-[100px]">등록일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedReport(report)}
                      >
                        <TableCell className="text-center">
                          <div
                            className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${SEVERITY_CONFIG[report.severity]?.color}`}
                            title={SEVERITY_CONFIG[report.severity]?.label}
                          >
                            {SEVERITY_CONFIG[report.severity]?.icon}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${STATUS_CONFIG[report.status]?.color || ""}`}>
                            {STATUS_CONFIG[report.status]?.icon}
                            {STATUS_CONFIG[report.status]?.label || report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{report.title}</span>
                            {report.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.affected_area}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{report.reporter}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(report.created_at), "MM.dd", { locale: ko })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 상세 보기 다이얼로그 */}
          <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
            <DialogContent className="sm:max-w-[600px]">
              {selectedReport && (
                <>
                  <DialogHeader>
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex items-center justify-center h-8 w-8 rounded-full ${SEVERITY_CONFIG[selectedReport.severity]?.color}`}
                      >
                        {SEVERITY_CONFIG[selectedReport.severity]?.icon}
                      </div>
                      <div className="flex-1">
                        <Badge className={`mb-2 ${STATUS_CONFIG[selectedReport.status]?.color || ""}`}>
                          {STATUS_CONFIG[selectedReport.status]?.icon}
                          {STATUS_CONFIG[selectedReport.status]?.label}
                        </Badge>
                        <DialogTitle>{selectedReport.title}</DialogTitle>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">신고자:</span>{" "}
                        <span className="font-medium">{selectedReport.reporter}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">영향 영역:</span>{" "}
                        <Badge variant="outline">{selectedReport.affected_area}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">심각도:</span>
                        <span className={SEVERITY_CONFIG[selectedReport.severity]?.color}>
                          {SEVERITY_CONFIG[selectedReport.severity]?.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">상세 설명</Label>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                        {selectedReport.description || "설명 없음"}
                      </div>
                    </div>

                    {/* 첨부 이미지 */}
                    {selectedReport.images && selectedReport.images.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">첨부 이미지</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedReport.images.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block aspect-video bg-muted rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={url}
                                alt={`첨부 이미지 ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReport.resolution && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          해결 방법
                        </Label>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm whitespace-pre-wrap border border-green-200 dark:border-green-800">
                          {selectedReport.resolution}
                        </div>
                        {selectedReport.resolved_by && selectedReport.resolved_at && (
                          <p className="text-xs text-muted-foreground">
                            {selectedReport.resolved_by}님이{" "}
                            {format(new Date(selectedReport.resolved_at), "M월 d일", { locale: ko })}에 해결
                          </p>
                        )}
                      </div>
                    )}

                    {/* 관리자 영역 */}
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">상태 변경</Label>
                        <Select
                          value={selectedReport.status}
                          onValueChange={(value) => handleUpdateStatus(selectedReport.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  {config.icon}
                                  {config.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(selectedReport.status === "resolved" || selectedReport.status === "closed") && (
                        <div className="space-y-2">
                          <Label className="text-sm">해결 방법</Label>
                          <textarea
                            className="w-full p-2 text-sm border rounded-md bg-background resize-none"
                            rows={3}
                            placeholder="어떻게 해결했는지 기록하세요..."
                            defaultValue={selectedReport.resolution || ""}
                            onBlur={(e) => handleUpdateResolution(selectedReport.id, e.target.value)}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          신고일: {format(new Date(selectedReport.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(selectedReport.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}

