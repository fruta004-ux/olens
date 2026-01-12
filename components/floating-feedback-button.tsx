"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Lightbulb, Bug, ChevronLeft, ChevronRight, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { MemoDialog } from "@/components/memo-dialog"

export function FloatingFeedbackButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showMemoDialog, setShowMemoDialog] = useState(false)

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  const handleOpenMemo = () => {
    setIsOpen(false)
    setShowMemoDialog(true)
  }

  return (
    <>
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
        {/* 슬라이드 패널 */}
        <div
          className={cn(
            "flex flex-col gap-2 p-2 bg-background/95 backdrop-blur-sm border border-r-0 rounded-l-lg shadow-lg transition-all duration-300 ease-in-out",
            isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
          )}
        >
          {/* 메모장 버튼 */}
          <Button
            variant="ghost"
            className="justify-start gap-3 h-11 px-3 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950 dark:hover:text-purple-300 transition-colors"
            onClick={handleOpenMemo}
          >
            <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
              <StickyNote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">메모장</span>
          </Button>

          <Button
            variant="ghost"
            className="justify-start gap-3 h-11 px-3 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950 dark:hover:text-amber-300 transition-colors"
            onClick={() => handleNavigate("/feature-requests")}
          >
            <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">기능 제안</span>
          </Button>

          <Button
            variant="ghost"
            className="justify-start gap-3 h-11 px-3 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-300 transition-colors"
            onClick={() => handleNavigate("/bug-reports")}
          >
            <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
              <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">버그 신고</span>
          </Button>
        </div>

        {/* 슬라이드 탭 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center w-6 h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-l-md shadow-lg transition-all duration-200",
            "hover:w-7 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          )}
          title="피드백"
        >
          {isOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 메모장 다이얼로그 */}
      <MemoDialog
        open={showMemoDialog}
        onOpenChange={setShowMemoDialog}
      />
    </>
  )
}
