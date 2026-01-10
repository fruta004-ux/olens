"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { CrmSidebar } from "@/components/crm-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeedbackEditor } from "@/components/feedback-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Lightbulb, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Trash2
} from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
type FeatureRequest = {
  id: string
  title: string
  description: string | null
  requester: string
  category: string
  priority: string
  status: string
  images: string[] | null
  admin_comment: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  proposed: { label: "제안됨", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: <Lightbulb className="h-3 w-3" /> },
  reviewing: { label: "검토중", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "승인됨", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  in_progress: { label: "개발중", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", icon: <Loader2 className="h-3 w-3" /> },
  completed: { label: "완료", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "반려", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", icon: <XCircle className="h-3 w-3" /> },
  hold: { label: "보류", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", icon: <Clock className="h-3 w-3" /> },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: "높음", color: "bg-red-500" },
  medium: { label: "보통", color: "bg-amber-500" },
  low: { label: "낮음", color: "bg-green-500" },
}

const CATEGORY_OPTIONS = ["UI/UX", "자동화", "보고서", "데이터 연동", "성능 개선", "기타"]

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null)
  const [newRequest, setNewRequest] = useState({
    title: "",
    description: "",
    requester: "",
    category: "기타",
    priority: "medium",
    images: [] as string[],
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("기능 제안 로드 실패:", error.message, error.details, error.hint)
        return
      }
      setRequests(data || [])
    } catch (error: any) {
      console.error("기능 제안 로드 실패:", error?.message || error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("feature_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("상태 변경 실패:", error.message)
        alert(`상태 변경 실패: ${error.message}`)
        return
      }

      // 로컬 상태 업데이트
      setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r))
      if (selectedRequest?.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus })
      }
    } catch (error) {
      console.error("상태 변경 에러:", error)
    }
  }

  const handleUpdateComment = async (id: string, comment: string) => {
    try {
      const { error } = await supabase
        .from("feature_requests")
        .update({ admin_comment: comment || null, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("코멘트 저장 실패:", error.message)
        return
      }

      // 로컬 상태 업데이트
      setRequests(requests.map(r => r.id === id ? { ...r, admin_comment: comment } : r))
      if (selectedRequest?.id === id) {
        setSelectedRequest({ ...selectedRequest, admin_comment: comment })
      }
    } catch (error) {
      console.error("코멘트 저장 에러:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 기능 제안을 삭제하시겠습니까?")) return

    try {
      const { error } = await supabase
        .from("feature_requests")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("삭제 실패:", error.message)
        alert(`삭제 실패: ${error.message}`)
        return
      }

      // 로컬 상태 업데이트
      setRequests(requests.filter(r => r.id !== id))
      setSelectedRequest(null)
    } catch (error) {
      console.error("삭제 에러:", error)
    }
  }

  const handleSubmit = async () => {
    if (!newRequest.title.trim() || !newRequest.requester.trim()) {
      alert("제목과 요청자를 입력해주세요.")
      return
    }

    try {
      const { error } = await supabase.from("feature_requests").insert({
        title: newRequest.title,
        description: newRequest.description || null,
        requester: newRequest.requester,
        category: newRequest.category,
        priority: newRequest.priority,
        images: newRequest.images.length > 0 ? newRequest.images : null,
        status: "proposed",
      })

      if (error) {
        console.error("기능 제안 등록 실패:", error.message, error.details, error.hint)
        alert(`등록 실패: ${error.message}`)
        return
      }

      setNewRequest({
        title: "",
        description: "",
        requester: "",
        category: "기타",
        priority: "medium",
        images: [],
      })
      setIsDialogOpen(false)
      loadRequests()
    } catch (error) {
      console.error("기능 제안 등록 실패:", error)
      alert("등록에 실패했습니다.")
    }
  }

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || req.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: requests.length }
    requests.forEach((req) => {
      counts[req.status] = (counts[req.status] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="flex min-h-screen bg-background">
      <CrmSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-amber-500" />
                기능 제안
              </h1>
              <p className="text-muted-foreground mt-1">
                새로운 기능 아이디어를 제안하고 진행 상태를 확인하세요
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  새 제안 등록
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>새 기능 제안</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목 *</Label>
                    <Input
                      id="title"
                      placeholder="기능 제안 제목을 입력하세요"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>상세 설명 + 참고 이미지</Label>
                    <FeedbackEditor
                      value={newRequest.description}
                      onChange={(value) => setNewRequest({ ...newRequest, description: value })}
                      placeholder="기능에 대한 상세한 설명을 입력하세요&#10;&#10;예시: 어떤 문제를 해결하고 싶은지, 기대하는 동작 등"
                      images={newRequest.images}
                      onImagesChange={(images) => setNewRequest({ ...newRequest, images })}
                      bucketName="feedback-images"
                      folderPath="feature-requests"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="requester">요청자 *</Label>
                      <Input
                        id="requester"
                        placeholder="이름"
                        value={newRequest.requester}
                        onChange={(e) => setNewRequest({ ...newRequest, requester: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">카테고리</Label>
                      <Select
                        value={newRequest.category}
                        onValueChange={(value) => setNewRequest({ ...newRequest, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">우선순위</Label>
                    <Select
                      value={newRequest.priority}
                      onValueChange={(value) => setNewRequest({ ...newRequest, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 높음</SelectItem>
                        <SelectItem value="medium">🟡 보통</SelectItem>
                        <SelectItem value="low">🟢 낮음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">취소</Button>
                  </DialogClose>
                  <Button onClick={handleSubmit}>등록</Button>
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
              placeholder="제목, 요청자, 설명으로 검색..."
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
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>등록된 기능 제안이 없습니다</p>
                  <p className="text-sm mt-1">새로운 아이디어를 등록해보세요!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">상태</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead className="w-[100px]">카테고리</TableHead>
                      <TableHead className="w-[80px] text-center">우선순위</TableHead>
                      <TableHead className="w-[80px]">요청자</TableHead>
                      <TableHead className="w-[100px]">등록일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow
                        key={req.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedRequest(req)}
                      >
                        <TableCell>
                          <Badge className={`gap-1 ${STATUS_CONFIG[req.status]?.color || ""}`}>
                            {STATUS_CONFIG[req.status]?.icon}
                            {STATUS_CONFIG[req.status]?.label || req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{req.title}</span>
                            {req.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {req.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{req.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className={`h-3 w-3 rounded-full mx-auto ${PRIORITY_CONFIG[req.priority]?.color || "bg-gray-400"}`}
                            title={PRIORITY_CONFIG[req.priority]?.label || req.priority}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{req.requester}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(req.created_at), "MM.dd", { locale: ko })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 상세 보기 다이얼로그 */}
          <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
            <DialogContent className="sm:max-w-[600px]">
              {selectedRequest && (
                <>
                  <DialogHeader>
                    <div className="flex items-start gap-3">
                      <Badge className={`${STATUS_CONFIG[selectedRequest.status]?.color || ""}`}>
                        {STATUS_CONFIG[selectedRequest.status]?.icon}
                        {STATUS_CONFIG[selectedRequest.status]?.label}
                      </Badge>
                      <DialogTitle className="flex-1">{selectedRequest.title}</DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">요청자:</span>{" "}
                        <span className="font-medium">{selectedRequest.requester}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">카테고리:</span>{" "}
                        <Badge variant="outline">{selectedRequest.category}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">우선순위:</span>
                        <div
                          className={`h-3 w-3 rounded-full ${PRIORITY_CONFIG[selectedRequest.priority]?.color}`}
                        />
                        <span>{PRIORITY_CONFIG[selectedRequest.priority]?.label}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">상세 설명</Label>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                        {selectedRequest.description || "설명 없음"}
                      </div>
                    </div>

                    {/* 첨부 이미지 */}
                    {selectedRequest.images && selectedRequest.images.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">참고 이미지</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedRequest.images.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block aspect-video bg-muted rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={url}
                                alt={`참고 이미지 ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRequest.admin_comment && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          관리자 코멘트
                        </Label>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-sm whitespace-pre-wrap border border-purple-200 dark:border-purple-800">
                          {selectedRequest.admin_comment}
                        </div>
                      </div>
                    )}

                    {/* 관리자 영역 */}
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">상태 변경</Label>
                        <Select
                          value={selectedRequest.status}
                          onValueChange={(value) => handleUpdateStatus(selectedRequest.id, value)}
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

                      <div className="space-y-2">
                        <Label className="text-sm">관리자 코멘트</Label>
                        <textarea
                          className="w-full p-2 text-sm border rounded-md bg-background resize-none"
                          rows={3}
                          placeholder="검토 의견이나 진행 상황을 기록하세요..."
                          defaultValue={selectedRequest.admin_comment || ""}
                          onBlur={(e) => handleUpdateComment(selectedRequest.id, e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          등록일: {format(new Date(selectedRequest.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(selectedRequest.id)}
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

