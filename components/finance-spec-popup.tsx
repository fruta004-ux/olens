"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BellRing, Check } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

type FinancePopupRow = {
  id: string
  project_name: string | null
  created_at: string
  finance_assigned_to: string | null
  account?: {
    company_name?: string | null
    brand_name?: string | null
  } | null
}

// 명세서의 재무 담당자 값(현재 1명) — project_specs.finance_assigned_to 와 매칭
const FINANCE_ASSIGNEE_NAME = "김다예"
const POLL_INTERVAL_MS = 60_000

const buildCompanyLabel = (company?: string | null, brand?: string | null) => {
  const c = (company || "").trim()
  const b = (brand || "").trim()
  if (!c) return "거래처 미확인"
  if (!b || b === c) return c
  return `${c} (${b})`
}

export default function FinanceSpecPopup() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [userId, setUserId] = useState<string>("")
  const [isFinanceUser, setIsFinanceUser] = useState(false)
  const [items, setItems] = useState<FinancePopupRow[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  const baselineRef = useRef<string | null>(null)

  const baselineKey = userId ? `finance-spec-popup-baseline:${userId}` : ""
  const dismissedKey = userId ? `finance-spec-popup-dismissed:${userId}` : ""

  // 로그인 사용자 식별 — user_profiles.role = 'finance' 인 계정만 팝업 노출
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return

      setUserId(user.id)

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        console.error("[finance-spec-popup] 프로필 조회 실패:", error)
        return
      }
      setIsFinanceUser(profile?.role === "finance")
    }
    loadUser()
  }, [supabase])

  // 계정별 dismiss 목록 로드
  useEffect(() => {
    if (!dismissedKey) return
    try {
      const raw = localStorage.getItem(dismissedKey)
      if (!raw) {
        setDismissedIds([])
        return
      }
      const parsed = JSON.parse(raw)
      setDismissedIds(Array.isArray(parsed) ? parsed : [])
    } catch {
      setDismissedIds([])
    }
  }, [dismissedKey])

  const saveDismissed = useCallback(
    (next: string[]) => {
      if (!dismissedKey) return
      localStorage.setItem(dismissedKey, JSON.stringify(next))
    },
    [dismissedKey]
  )

  const closeOne = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        if (prev.includes(id)) return prev
        const next = [...prev, id]
        saveDismissed(next)
        return next
      })
    },
    [saveDismissed]
  )

  const closeAll = useCallback(() => {
    const ids = items.map((i) => i.id)
    if (ids.length === 0) return
    setDismissedIds((prev) => {
      const merged = Array.from(new Set([...prev, ...ids]))
      saveDismissed(merged)
      return merged
    })
  }, [items, saveDismissed])

  const loadItems = useCallback(async () => {
    if (!isFinanceUser || !userId) {
      setItems([])
      return
    }

    if (!baselineRef.current) {
      const existingBaseline = baselineKey ? localStorage.getItem(baselineKey) : null
      if (existingBaseline) {
        baselineRef.current = existingBaseline
      } else {
        // 첫 진입에서는 최근 7일만 대상으로 시작 (기존 전체 폭주 방지 + 바로 테스트 가능)
        const initial = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        baselineRef.current = initial
        if (baselineKey) localStorage.setItem(baselineKey, initial)
      }
    }

    const baseline = baselineRef.current
    if (!baseline) return

    const { data, error } = await supabase
      .from("project_specs")
      .select("id, project_name, created_at, finance_assigned_to, account:accounts(company_name, brand_name)")
      .eq("finance_assigned_to", FINANCE_ASSIGNEE_NAME)
      .gt("created_at", baseline)
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) {
      console.error("[finance-spec-popup] 로드 실패:", error)
      return
    }
    setItems((data || []) as FinancePopupRow[])
  }, [baselineKey, isFinanceUser, supabase, userId])

  useEffect(() => {
    loadItems()
    const t = setInterval(loadItems, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [loadItems])

  const visibleItems = useMemo(
    () => items.filter((it) => !dismissedIds.includes(it.id)),
    [items, dismissedIds]
  )

  // snoozed: 이번 세션에서만 잠시 닫음 (영구 저장 X) → 새로고침하면 다시 뜸.
  // "확인" 을 누른 항목만 영구히 제거되어 누락을 방지한다.
  const [snoozed, setSnoozed] = useState(false)

  // 새 항목이 들어오면 잠시 닫아둔 상태를 해제 (새 알림은 다시 띄움)
  useEffect(() => {
    if (visibleItems.length > 0) setSnoozed(false)
  }, [visibleItems.length])

  const open = isFinanceUser && visibleItems.length > 0 && !snoozed

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // 바깥 클릭 / ESC / 코너 X → 이번에만 잠시 닫음 (영구 저장 안 함).
        // 새로고침하면 확인 안 한 항목은 다시 표시된다.
        if (!o) setSnoozed(true)
      }}
    >
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-5 w-5 text-amber-600" />
            새 프로젝트 명세서 요청
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
              {visibleItems.length}건
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            각 항목을 <span className="font-semibold text-amber-700">확인</span> 눌러야 사라집니다.
            그냥 닫으면 새로고침 시 다시 표시돼요. (누락 방지)
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4 space-y-2">
          {visibleItems.map((it) => {
            const company = buildCompanyLabel(it.account?.company_name, it.account?.brand_name)
            return (
              <Card key={it.id} className="border-amber-200 bg-amber-50/70 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900 truncate">{company}</p>
                    <p className="mt-0.5 text-xs text-amber-800 truncate">
                      {(it.project_name || "프로젝트명 미입력").trim()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 shrink-0 gap-1 bg-amber-600 text-xs text-white hover:bg-amber-700"
                    onClick={() => closeOne(it.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    확인
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        <DialogFooter className="px-5 py-3 border-t gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setSnoozed(true)}>
            나중에
          </Button>
          <Button
            onClick={() => {
              router.push("/project-specs")
              setSnoozed(true)
            }}
          >
            요청서 열기
          </Button>
          <Button
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={closeAll}
          >
            모두 확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

