"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Users,
  Target,
  Settings,
  TrendingUp,
  Lock,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Shield,
  FileText,
  History,
  ScrollText,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { PatchNotesDialog } from "@/components/patch-notes-dialog"
import { usePatchNotes } from "@/lib/use-patch-notes"
import { useHelpSettings } from "@/lib/use-help-settings"

const processStages = [
  { id: 0, name: "목표·기준 설정", enabled: true }, // 활성화
  { id: 1, name: "유입 설계", enabled: true }, // 활성화
  { id: 2, name: "영업 CRM", enabled: true },
  { id: 3, name: "내부 전달", enabled: false },
  { id: 4, name: "실행·관리", enabled: false },
  { id: 5, name: "검수·종료", enabled: false },
  { id: 6, name: "회고·데이터", enabled: true }, // 활성화
  { id: 7, name: "재활용·확장", enabled: false },
]

const stage0SubMenus = [
  { name: "목표 매출 관리", href: "https://v0-design-system-guide-eta.vercel.app/", icon: TrendingUp, external: true },
]

const stage1SubMenus = [
  { name: "영업 전략표", href: "/sales-strategy", icon: Target },
]

const stage2SubMenus = [
  { name: "대시보드", href: "/dashboard", icon: LayoutDashboard, disabled: false },
  { name: "영업 현황", href: "/deals", icon: Target, disabled: false },
  { name: "연락처", href: "/contacts", icon: Users, disabled: false },
  { name: "작업", href: "/tasks", icon: CheckSquare, disabled: false },
  { name: "견적서", href: "/quotations", icon: FileText, disabled: false },
  { name: "리포트", href: "/reports", icon: BarChart3, disabled: false },
  { name: "통계", href: "/statistics", icon: TrendingUp, disabled: false },
]

const stage6SubMenus = [
  { name: "종료 분석", href: "/retrospective", icon: History },
]

export function CrmSidebar() {
  const pathname = usePathname()
  const [expandedStage, setExpandedStage] = useState<number | null>(2)
  const [patchNotesOpen, setPatchNotesOpen] = useState(false)
  const { currentVersion } = usePatchNotes()
  const { markPatchNotesAsSeen, checkHasNewPatchNotes } = useHelpSettings()
  
  const hasNewPatchNotes = checkHasNewPatchNotes(currentVersion)

  const toggleStage = (stageId: number, enabled: boolean) => {
    if (!enabled) return
    setExpandedStage(expandedStage === stageId ? null : stageId)
  }

  const handleOpenPatchNotes = () => {
    setPatchNotesOpen(true)
    markPatchNotesAsSeen(currentVersion)
  }

  return (
    <>
      <div className="fixed left-0 top-2 z-50 flex h-screen w-48 flex-col border-r border-border bg-card">
        {/* 로고 */}
        <div className="flex h-14 items-center justify-center px-2">
          <Image
            src="/images/olens-logo.png"
            alt="OLENS logo"
            width={80}
            height={28}
            className="h-auto w-[80px]"
          />
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          <div className="space-y-0.5 px-1.5">
            {processStages.map((stage) => {
              const isExpanded = expandedStage === stage.id
              const hasSubMenu = stage.id === 0 || stage.id === 1 || stage.id === 2 || stage.id === 6

              return (
                <div key={stage.id}>
                  {/* 단계 버튼 */}
                  <button
                    onClick={() => toggleStage(stage.id, stage.enabled)}
                    disabled={!stage.enabled}
                    className={cn(
                      "group relative w-full flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                      stage.enabled
                        ? isExpanded
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary"
                        : "text-muted-foreground cursor-not-allowed opacity-60",
                    )}
                  >
                    {/* 단계 번호 */}
                    <div
                      className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold",
                        stage.enabled
                          ? isExpanded
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {stage.id}
                    </div>

                    {/* 단계 이름 */}
                    <span className="flex-1 text-left">{stage.name}</span>

                    {/* 우측 아이콘 */}
                    {!stage.enabled ? (
                      <Lock className="h-3 w-3 flex-shrink-0" />
                    ) : hasSubMenu ? (
                      isExpanded ? (
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )
                    ) : null}
                  </button>

                  {stage.id === 0 && isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5">
                      {stage0SubMenus.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {stage.id === 1 && isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5">
                      {stage1SubMenus.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {stage.id === 2 && isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5">
                      {stage2SubMenus.map((item) => {
                        const isActive = pathname === item.href
                        if (item.disabled) {
                          return (
                            <div
                              key={item.name}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground opacity-60 cursor-not-allowed"
                            >
                              <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{item.name}</span>
                              <Lock className="h-2.5 w-2.5 ml-auto flex-shrink-0" />
                            </div>
                          )
                        }
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {stage.id === 6 && isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5">
                      {stage6SubMenus.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        <div className="border-t border-border p-2 flex items-center gap-1">
          {/* 왼쪽: 관리자, 설정 */}
          <div className="flex-1 space-y-0.5">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Shield className="h-3.5 w-3.5 flex-shrink-0" />
              <span>관리자</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5 flex-shrink-0" />
              <span>설정</span>
            </Link>
          </div>
          
          {/* 오른쪽: 패치노트 */}
          <div className="relative">
            <button
              onClick={handleOpenPatchNotes}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground border border-border"
            >
              <span className="text-[10px]">패치노트</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              v{currentVersion}
            </Badge>
            </button>
            
            {/* 새 패치노트 알림 말풍선 */}
            {hasNewPatchNotes && (
              <div className="absolute -top-12 right-0 z-50 animate-bounce">
                <div className="relative bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                  새 패치노트가 있어요! 🎉
                  {/* 말풍선 꼬리 */}
                  <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-primary transform rotate-45" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-48" />
      
      {/* 패치노트 다이얼로그 */}
      <PatchNotesDialog open={patchNotesOpen} onOpenChange={setPatchNotesOpen} />
    </>
  )
}

export default CrmSidebar
