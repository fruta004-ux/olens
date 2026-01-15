"use client"

import { useState, useEffect } from "react"
import { CrmSidebar } from "@/components/crm-sidebar"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Clock,
  Search,
  MoreVertical
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { MemoDialog } from "@/components/memo-dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Memo {
  id: string
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function MemosPage() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMemoDialog, setShowMemoDialog] = useState(false)
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memoToDelete, setMemoToDelete] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const loadMemos = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .order("updated_at", { ascending: false })

    if (!error && data) {
      setMemos(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadMemos()
  }, [])

  const handleCreateNew = () => {
    setSelectedMemoId(null)
    setShowMemoDialog(true)
  }

  const handleOpenMemo = (id: string) => {
    setSelectedMemoId(id)
    setShowMemoDialog(true)
  }

  const handleDeleteMemo = async () => {
    if (!memoToDelete) return

    await supabase.from("memos").delete().eq("id", memoToDelete)
    setMemoToDelete(null)
    setDeleteDialogOpen(false)
    loadMemos()
  }

  const confirmDelete = (id: string) => {
    setMemoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const filteredMemos = memos.filter((memo) => 
    memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memo.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diff / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diff / (1000 * 60))

    if (diffMinutes < 1) return "방금 전"
    if (diffMinutes < 60) return `${diffMinutes}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  }

  // HTML 태그 제거하고 텍스트만 추출
  const stripHtml = (html: string) => {
    if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "")
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  // 미리보기 텍스트 생성 (최대 100자)
  const getPreviewText = (content: string) => {
    if (!content) return ""
    const text = stripHtml(content)
    return text.length > 100 ? text.substring(0, 100) + "..." : text
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CrmSidebar />

      <div className="flex-1 ml-48">
        <PageHeader icon={StickyNote} title="메모장" />

        <main className="p-2 xl:p-6">
          {/* 상단 액션 바 */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="메모 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              새 메모
            </Button>
          </div>

          {/* 메모 그리드 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "검색 결과가 없습니다" : "아직 메모가 없습니다"}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateNew} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  첫 메모 작성하기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMemos.map((memo) => (
                <Card 
                  key={memo.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
                  onClick={() => handleOpenMemo(memo.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        {memo.title || "제목 없음"}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              confirmDelete(memo.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3 min-h-[3.75rem]">
                      {getPreviewText(memo.content) || "내용 없음"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(memo.updated_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 메모 다이얼로그 */}
      <MemoDialog
        open={showMemoDialog}
        onOpenChange={setShowMemoDialog}
        memoId={selectedMemoId}
        onSaved={loadMemos}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메모 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 메모를 삭제하시겠습니까? 삭제된 메모는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMemo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
