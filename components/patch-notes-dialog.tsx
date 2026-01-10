"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Sparkles, Wrench, Bug, RefreshCw, ArrowRight, Loader2 } from "lucide-react"
import { CHANGE_TYPE_CONFIG, type PatchNote } from "@/lib/patch-notes"
import { usePatchNotes } from "@/lib/use-patch-notes"

interface PatchNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const getChangeIcon = (type: PatchNote["changes"][0]["type"]) => {
  switch (type) {
    case "feature":
      return <Sparkles className="h-3.5 w-3.5" />
    case "improvement":
      return <Wrench className="h-3.5 w-3.5" />
    case "fix":
      return <Bug className="h-3.5 w-3.5" />
    case "change":
      return <RefreshCw className="h-3.5 w-3.5" />
  }
}

export function PatchNotesDialog({ open, onOpenChange }: PatchNotesDialogProps) {
  const router = useRouter()
  const { recentNotes, currentVersion, loading } = usePatchNotes()

  const handleViewAll = () => {
    onOpenChange(false)
    router.push("/patch-notes")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            📋 패치노트
            <Badge variant="secondary" className="ml-2">
              v{currentVersion}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            oort 영업 SOS CRM 업데이트 내역
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              패치노트가 없습니다
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {recentNotes.map((note, index) => (
                <div key={note.id}>
                  {/* 버전 헤더 */}
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant={index === 0 ? "default" : "outline"}
                      className="text-sm font-mono"
                    >
                      v{note.version}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {note.date}
                    </span>
                    {index === 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        최신
                      </Badge>
                    )}
                  </div>

                  {/* 버전 제목 */}
                  <h3 className="font-semibold text-lg mb-3">{note.title}</h3>

                  {/* 변경 사항 목록 */}
                  <div className="space-y-2 ml-1">
                    {note.changes.map((change) => {
                      const config = CHANGE_TYPE_CONFIG[change.type]
                      return (
                        <div
                          key={change.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Badge
                            className={cn(
                              "text-xs flex items-center gap-1 shrink-0",
                              config.color
                            )}
                          >
                            {getChangeIcon(change.type)}
                            {config.label}
                          </Badge>
                          <span className="text-foreground leading-relaxed">
                            {change.description}
                            {change.link && (
                              <Link
                                href={change.link}
                                className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
                                onClick={() => onOpenChange(false)}
                              >
                                <ExternalLink className="h-3 w-3" />
                                바로가기
                              </Link>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 구분선 (마지막 제외) */}
                  {index < recentNotes.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 패치노트 모두 보기 버튼 - 하단 고정 */}
        <div className="shrink-0 border-t pt-4 mt-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleViewAll}
          >
            패치노트 모두 보기
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
