"use client"

import { CrmSidebar } from "@/components/crm-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react"
import { CHANGE_TYPE_CONFIG } from "@/lib/patch-notes"
import { usePatchNotes } from "@/lib/use-patch-notes"
import { getChangeIcon } from "@/components/patch-notes-dialog"

export default function PatchNotesPage() {
  const { patchNotes, currentVersion, loading } = usePatchNotes()

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <Link href="/deals">
              <Button variant="ghost" size="sm" className="mb-4 gap-2">
                <ArrowLeft className="h-4 w-4" />
                돌아가기
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">📋 패치노트</h1>
              <Badge variant="secondary" className="text-sm">
                현재 v{currentVersion}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              oort 영업 SOS CRM의 모든 업데이트 내역을 확인하세요
            </p>
          </div>

          {/* 로딩 */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : patchNotes.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              패치노트가 없습니다
            </div>
          ) : (
            <>
              {/* 패치노트 목록 */}
              <div className="space-y-6">
                {patchNotes.map((note, index) => (
                  <Card key={note.id} className={cn(index === 0 && "border-primary")}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3">
                        <Badge
                          variant={index === 0 ? "default" : "outline"}
                          className="text-sm font-mono"
                        >
                          v{note.version}
                        </Badge>
                        <span className="font-semibold text-xl">{note.title}</span>
                        {index === 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 ml-auto">
                            최신 버전
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{note.date}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {note.changes.map((change) => {
                          const config = CHANGE_TYPE_CONFIG[change.type]
                          return (
                            <div
                              key={change.id}
                              className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
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
                              <span className="text-foreground leading-relaxed flex-1">
                                {change.description}
                              </span>
                              {change.link && (
                                <Link
                                  href={change.link}
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  바로가기
                                </Link>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 푸터 */}
              <Separator className="my-8" />
              <div className="text-center text-sm text-muted-foreground pb-8">
                <p>© 2026 oort 영업 SOS. All rights reserved.</p>
                <p className="mt-1">총 {patchNotes.length}개의 버전이 기록되어 있습니다.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
