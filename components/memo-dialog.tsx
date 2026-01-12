"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Type, 
  Palette, 
  Image as ImageIcon,
  Save,
  Loader2,
  FileText,
  ExternalLink
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface MemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memoId?: string | null
  onSaved?: () => void
}

export function MemoDialog({ open, onOpenChange, memoId, onSaved }: MemoDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState("새 메모")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [currentMemoId, setCurrentMemoId] = useState<string | null>(memoId || null)
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createBrowserClient()

  // 메모 로드
  useEffect(() => {
    if (open && memoId) {
      loadMemo(memoId)
    } else if (open && !memoId) {
      // 새 메모
      setTitle("새 메모")
      setContent("")
      setCurrentMemoId(null)
      setLastSaved(null)
    }
  }, [open, memoId])

  const loadMemo = async (id: string) => {
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("id", id)
      .single()

    if (!error && data) {
      setTitle(data.title || "새 메모")
      setContent(data.content || "")
      setCurrentMemoId(data.id)
      setLastSaved(new Date(data.updated_at))
    }
  }

  // 자동 저장 (1.5초 debounce)
  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave()
    }, 1500)
  }, [currentMemoId, title])

  const handleSave = async () => {
    const editorContent = editorRef.current?.innerHTML || ""
    if (!editorContent.trim() && !title.trim()) return

    setIsSaving(true)
    try {
      if (currentMemoId) {
        // 업데이트
        await supabase
          .from("memos")
          .update({
            title,
            content: editorContent,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentMemoId)
      } else {
        // 새로 생성
        const { data } = await supabase
          .from("memos")
          .insert({
            title,
            content: editorContent,
            created_by: "사용자"
          })
          .select()
          .single()

        if (data) {
          setCurrentMemoId(data.id)
        }
      }
      setLastSaved(new Date())
      onSaved?.()
    } catch (error) {
      console.error("메모 저장 실패:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const applyStyle = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    scheduleAutoSave()
  }

  const handleImageInsert = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // 파일을 Base64로 변환
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        document.execCommand("insertImage", false, base64)
        scheduleAutoSave()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleContentChange = () => {
    scheduleAutoSave()
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    scheduleAutoSave()
  }

  // 컴포넌트 언마운트 시 저장
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        // 즉시 저장
        handleSave()
      }
    }
  }, [])

  // content가 변경되면 에디터에 반영
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  const fontSizes = [
    { label: "아주 작게", value: "1" },
    { label: "작게", value: "2" },
    { label: "보통", value: "3" },
    { label: "크게", value: "4" },
    { label: "아주 크게", value: "5" },
    { label: "매우 크게", value: "6" },
    { label: "최대", value: "7" },
  ]

  const colors = [
    "#000000", "#374151", "#6B7280", "#9CA3AF",
    "#EF4444", "#F97316", "#F59E0B", "#EAB308",
    "#22C55E", "#10B981", "#14B8A6", "#06B6D4",
    "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
    "#EC4899", "#F43F5E", "#FFFFFF", "#9333EA",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <div className="sr-only">
          <DialogTitle>메모장</DialogTitle>
          <DialogDescription>메모를 작성하고 저장할 수 있습니다.</DialogDescription>
        </div>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Input
                value={title}
                onChange={handleTitleChange}
                placeholder="메모 제목"
                className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isSaving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                    저장 중...
                  </>
                ) : lastSaved ? (
                  <>
                    <Save className="h-3 w-3 inline mr-1" />
                    {lastSaved.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 저장됨
                  </>
                ) : null}
              </span>
              <Button
                size="sm"
                onClick={async () => {
                  await handleSave()
                  onOpenChange(false)
                  router.push("/memos")
                }}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                저장
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 툴바 */}
        <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/30 flex-shrink-0 flex-wrap">
          {/* 글꼴 스타일 */}
          <Button type="button" size="sm" variant="ghost" onClick={() => applyStyle("bold")} className="h-8 w-8 p-0">
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => applyStyle("italic")} className="h-8 w-8 p-0">
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => applyStyle("underline")} className="h-8 w-8 p-0">
            <Underline className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* 글꼴 크기 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2 gap-1">
                <Type className="h-4 w-4" />
                <span className="text-xs">크기</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-2">
              <div className="flex flex-col gap-1">
                {fontSizes.map((size) => (
                  <Button
                    key={size.value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => applyStyle("fontSize", size.value)}
                    className="justify-start text-xs h-7"
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* 글꼴 색상 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2 gap-1">
                <Palette className="h-4 w-4" />
                <span className="text-xs">색상</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3">
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyStyle("foreColor", color)}
                    className={cn(
                      "h-7 w-7 rounded border-2 hover:scale-110 transition-transform",
                      color === "#FFFFFF" ? "border-gray-300" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          {/* 리스트 */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyStyle("insertUnorderedList")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => applyStyle("insertOrderedList")}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* 이미지 삽입 */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleImageInsert}
            className="h-8 px-2 gap-1"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="text-xs">이미지</span>
          </Button>
        </div>

        {/* 에디터 영역 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          className="flex-1 min-h-[400px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 prose prose-sm max-w-none overflow-auto bg-background"
          style={{ 
            lineHeight: "1.8",
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
