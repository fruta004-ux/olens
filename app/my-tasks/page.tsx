"use client"

// 실험실 · 내 업무 — PO(마케팅/영상) 개인 워크스페이스
// 상단: 금일 업무(직접 입력 + 프로젝트에서 보낸 업무 단위)
// 하단: 내 프로젝트 (현재/이전 회차, D-day, 항목 → 단위(숏폼 제작 1·2…) 토글 체크)

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Loader2,
  Plus,
  Sun,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { type Member, fetchActiveMembers, memberDisplayName, PO_ROLES } from "@/lib/members"
import {
  type DeliverableItem,
  type ProjectStatus,
  PROJECT_STATUSES,
  PROJECT_STATUS_META,
  deriveProjectStatus,
  projectPercent,
  shiftMonth,
  resolveCycleDay,
  cycleKeyFor,
  cycleNumber,
  cycleRangeLabel,
  daysUntilCycleEnd,
} from "@/lib/monthly-deliverables"

const CARD_SHADOW = "shadow-[0_2px_8px_rgba(0,0,0,0.06)]"

interface ProjRow {
  id: string
  project_name: string | null
  category: string | null
  project_owner_id: string | null
  payment_day: number | null
  cycle_start_day: number | null
  contract_start_date: string | null
  contract_end_date: string | null
  account?: { company_name?: string | null } | null
  client?: { deal_name?: string | null } | null
}

type Item = DeliverableItem & { month: string }

interface DailyTask {
  id: string
  member_id: string
  task_date: string
  title: string
  done: boolean
  source_item_id: string | null
  unit_index: number | null
  sort_order: number
}

const projName = (p: ProjRow) => p.account?.company_name || p.client?.deal_name || p.project_name || "(이름 없음)"

const todayStr = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
}

const todayLabel = () => {
  const t = new Date()
  const w = ["일", "월", "화", "수", "목", "금", "토"][t.getDay()]
  return `${t.getMonth() + 1}월 ${t.getDate()}일 (${w})`
}

/** 항목의 단위 수 (목표 수량 없으면 1개짜리) */
const unitCount = (it: Item) => Math.max(it.target_qty ?? 1, 1)

export default function MyTasksPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()

  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<Member | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null) // 보고 있는 PO
  const [projects, setProjects] = useState<ProjRow[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [checks, setChecks] = useState<Record<string, Set<number>>>({}) // item_id → 체크된 unit_index (실제 DB 행)
  const [daily, setDaily] = useState<DailyTask[]>([])
  const [tabs, setTabs] = useState<Record<string, "cur" | "prev">>({}) // 프로젝트별 현재/이전 회차 탭
  const [expanded, setExpanded] = useState<Set<string>>(new Set()) // 펼친 항목 id
  const [newTask, setNewTask] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null) // 처리 중인 unit key

  const poMembers = useMemo(() => members.filter((m) => PO_ROLES.includes(m.role)), [members])

  // ── 로드 ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const memberList = await fetchActiveMembers(supabase)
      setMembers(memberList)

      const { data: auth } = await supabase.auth.getUser()
      const meMember = auth?.user ? memberList.find((m) => m.id === auth.user!.id) || null : null
      setMe(meMember)

      // PO 본인이면 자기 자신 고정, 아니면(관리자 등) 선택 — 기본 첫 PO
      const poList = memberList.filter((m) => PO_ROLES.includes(m.role))
      const target =
        meMember && PO_ROLES.includes(meMember.role)
          ? meMember.id
          : targetId || poList[0]?.id || null
      setTargetId(target)

      if (!target) {
        setProjects([])
        setItems([])
        setDaily([])
        return
      }

      const { data: projData, error: projErr } = await supabase
        .from("recurring_projects")
        .select(
          "id, project_name, category, project_owner_id, payment_day, cycle_start_day, contract_start_date, contract_end_date, account:accounts(company_name), client:clients(deal_name)"
        )
        .eq("is_active", true)
        .eq("project_owner_id", target)
      if (projErr) throw projErr
      const projList = (projData || []) as unknown as ProjRow[]
      setProjects(projList)

      // 현재+이전 회차 키 수집
      const keySet = new Set<string>()
      for (const p of projList) {
        const cur = cycleKeyFor(resolveCycleDay(p))
        keySet.add(cur)
        keySet.add(shiftMonth(cur, -1))
      }

      let itemList: Item[] = []
      if (projList.length > 0 && keySet.size > 0) {
        const { data: itemData, error: itemErr } = await supabase
          .from("monthly_deliverable_items")
          .select("*")
          .in("recurring_project_id", projList.map((p) => p.id))
          .in("month", Array.from(keySet))
          .order("sort_order", { ascending: true })
        if (itemErr) throw itemErr
        itemList = (itemData || []) as Item[]
      }
      setItems(itemList)

      // 단위 체크 로드
      const checkMap: Record<string, Set<number>> = {}
      if (itemList.length > 0) {
        const { data: checkData } = await supabase
          .from("deliverable_unit_checks")
          .select("item_id, unit_index")
          .in("item_id", itemList.map((i) => i.id))
        for (const c of (checkData || []) as { item_id: string; unit_index: number }[]) {
          ;(checkMap[c.item_id] ||= new Set()).add(c.unit_index)
        }
      }
      setChecks(checkMap)

      // 금일 업무
      const { data: dailyData } = await supabase
        .from("personal_daily_tasks")
        .select("*")
        .eq("member_id", target)
        .eq("task_date", todayStr())
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
      setDaily((dailyData || []) as DailyTask[])
    } catch (err: any) {
      console.error("[내 업무] 로드 오류:", err)
      toast.error(`로드 실패: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, targetId])

  useEffect(() => {
    load()
  }, [load])

  // ── 표시용: 항목의 체크 상태 (DB 행 없으면 done_qty 만큼 앞에서부터 가상 체크) ──
  const checkedSetOf = useCallback(
    (it: Item): Set<number> => {
      const real = checks[it.id]
      if (real && real.size > 0) return real
      const virtual = new Set<number>()
      for (let i = 0; i < Math.min(it.done_qty, unitCount(it)); i++) virtual.add(i)
      return virtual
    },
    [checks]
  )

  // ── 단위 체크 토글 (핵심 primitive) ─────────────────────────
  const setUnitChecked = useCallback(
    async (item: Item, idx: number, checked: boolean) => {
      const unitKey = `${item.id}:${idx}`
      setBusy(unitKey)
      try {
        // 1) DB 행이 없고 done_qty>0 이면 기존 완료분(0..done_qty-1)을 먼저 시드
        const real = checks[item.id]
        const cur = real && real.size > 0 ? new Set(real) : new Set<number>()
        if (cur.size === 0 && item.done_qty > 0) {
          const seedRows = []
          for (let i = 0; i < Math.min(item.done_qty, unitCount(item)); i++) {
            seedRows.push({ item_id: item.id, unit_index: i, done_by: me?.id ?? null })
            cur.add(i)
          }
          if (seedRows.length > 0) {
            await supabase
              .from("deliverable_unit_checks")
              .upsert(seedRows, { onConflict: "item_id,unit_index", ignoreDuplicates: true })
          }
        }

        // 2) 토글 적용
        if (checked && !cur.has(idx)) {
          const { error } = await supabase
            .from("deliverable_unit_checks")
            .upsert([{ item_id: item.id, unit_index: idx, done_by: me?.id ?? null }], {
              onConflict: "item_id,unit_index",
              ignoreDuplicates: true,
            })
          if (error) throw error
          cur.add(idx)
        } else if (!checked && cur.has(idx)) {
          const { error } = await supabase
            .from("deliverable_unit_checks")
            .delete()
            .eq("item_id", item.id)
            .eq("unit_index", idx)
          if (error) throw error
          cur.delete(idx)
        }
        setChecks((prev) => ({ ...prev, [item.id]: cur }))

        // 3) 항목 done_qty / status 동기화 (트래커 보드·상세에 즉시 반영)
        const doneQty = cur.size
        const target = unitCount(item)
        const status =
          doneQty >= target ? "완료" : item.status === "이월" ? "이월" : doneQty > 0 ? "진행중" : "대기"
        const { error: upErr } = await supabase
          .from("monthly_deliverable_items")
          .update({ done_qty: doneQty, status, updated_at: new Date().toISOString() })
          .eq("id", item.id)
        if (upErr) throw upErr
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, done_qty: doneQty, status: status as Item["status"] } : i))
        )

        // 4) 이 단위가 금일 업무로 보내져 있으면 완료 상태 동기화
        setDaily((prev) =>
          prev.map((t) =>
            t.source_item_id === item.id && t.unit_index === idx && t.done !== checked ? { ...t, done: checked } : t
          )
        )
        await supabase
          .from("personal_daily_tasks")
          .update({ done: checked, updated_at: new Date().toISOString() })
          .eq("source_item_id", item.id)
          .eq("unit_index", idx)
          .eq("task_date", todayStr())
      } catch (err: any) {
        console.error("[내 업무] 체크 오류:", err)
        toast.error(`저장 실패: ${err?.message || "알 수 없는 오류"}`)
      } finally {
        setBusy(null)
      }
    },
    [supabase, checks, me]
  )

  // ── 금일 업무 ────────────────────────────────────────────────
  const addManualTask = async () => {
    const title = newTask.trim()
    if (!title || !targetId) return
    setNewTask("")
    const { data, error } = await supabase
      .from("personal_daily_tasks")
      .insert({ member_id: targetId, task_date: todayStr(), title, sort_order: daily.length })
      .select("*")
      .single()
    if (error) {
      toast.error(`추가 실패: ${error.message}`)
      return
    }
    setDaily((prev) => [...prev, data as DailyTask])
  }

  const sendToToday = async (p: ProjRow, item: Item, idx: number | null) => {
    if (!targetId) return
    const title =
      idx === null ? `[${projName(p)}] ${item.item_name}` : `[${projName(p)}] ${item.item_name} ${idx + 1}`
    const { data, error } = await supabase
      .from("personal_daily_tasks")
      .insert({
        member_id: targetId,
        task_date: todayStr(),
        title,
        source_item_id: item.id,
        unit_index: idx ?? 0,
        sort_order: daily.length,
        done: checkedSetOf(item).has(idx ?? 0),
      })
      .select("*")
      .single()
    if (error) {
      toast.error(`보내기 실패: ${error.message}`)
      return
    }
    setDaily((prev) => [...prev, data as DailyTask])
    toast.success("금일 업무에 추가했습니다.")
  }

  const toggleDaily = async (t: DailyTask) => {
    const nowDone = !t.done
    setDaily((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: nowDone } : x)))
    const { error } = await supabase
      .from("personal_daily_tasks")
      .update({ done: nowDone, updated_at: new Date().toISOString() })
      .eq("id", t.id)
    if (error) {
      toast.error(`저장 실패: ${error.message}`)
      return
    }
    // 프로젝트 항목 단위와 연동돼 있으면 단위 체크도 동기화
    if (t.source_item_id && t.unit_index !== null) {
      const item = items.find((i) => i.id === t.source_item_id)
      if (item) await setUnitChecked(item, t.unit_index, nowDone)
    }
  }

  const deleteDaily = async (t: DailyTask) => {
    setDaily((prev) => prev.filter((x) => x.id !== t.id))
    await supabase.from("personal_daily_tasks").delete().eq("id", t.id)
  }

  // ── 파생 ────────────────────────────────────────────────────
  const isPoUser = !!me && PO_ROLES.includes(me.role)
  const dailyDone = daily.filter((t) => t.done).length
  const targetName = targetId ? memberDisplayName(members.find((m) => m.id === targetId) || ({} as Member)) : ""

  const itemsFor = useCallback(
    (p: ProjRow, which: "cur" | "prev") => {
      const cur = cycleKeyFor(resolveCycleDay(p))
      const key = which === "cur" ? cur : shiftMonth(cur, -1)
      return { key, list: items.filter((i) => i.recurring_project_id === p.id && i.month === key) }
    },
    [items]
  )

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const sentUnits = useMemo(() => {
    const s = new Set<string>()
    daily.forEach((t) => {
      if (t.source_item_id && t.unit_index !== null) s.add(`${t.source_item_id}:${t.unit_index}`)
    })
    return s
  }, [daily])

  return (
    <div className="flex h-screen bg-muted/30">
      <CrmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />
        <main className="flex-1 overflow-y-auto p-3 xl:p-8">
          <div className="mx-auto max-w-[860px] space-y-5 pb-16">
            {/* 헤더 */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  내 업무
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">실험실</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">{todayLabel()} · {targetName}님의 업무</p>
              </div>
              {!isPoUser && poMembers.length > 0 && (
                <Select value={targetId || ""} onValueChange={(v) => setTargetId(v)}>
                  <SelectTrigger className="h-9 w-[150px] text-sm">
                    <SelectValue placeholder="PO 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {poMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {memberDisplayName(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {loading ? (
              <div className="py-28 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : !targetId ? (
              <div className="py-28 text-center text-muted-foreground">PO 역할(마케팅/영상) 멤버가 없습니다.</div>
            ) : (
              <>
                {/* ── 금일 업무 ── */}
                <div className={cn("rounded-2xl bg-card p-5", CARD_SHADOW)}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[17px] font-bold flex items-center gap-2">
                      <Sun className="h-4.5 w-4.5 text-amber-500" />
                      금일 업무
                    </h2>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      <b className="text-foreground">{dailyDone}</b> / {daily.length} 완료
                    </span>
                  </div>

                  {/* 직접 입력 */}
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) addManualTask()
                      }}
                      placeholder="오늘 할 일을 입력하고 Enter"
                      className="h-10 rounded-xl border-transparent bg-muted/50 focus-visible:bg-background focus-visible:border-input focus-visible:ring-0"
                    />
                    <Button size="sm" className="h-10 rounded-xl gap-1 shrink-0" onClick={addManualTask} disabled={!newTask.trim()}>
                      <Plus className="h-4 w-4" />
                      추가
                    </Button>
                  </div>

                  {daily.length === 0 ? (
                    <p className="text-sm text-muted-foreground/70 text-center py-6">
                      아직 금일 업무가 없어요. 직접 입력하거나, 아래 프로젝트 업무에서 올려보세요.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {daily.map((t) => (
                        <div
                          key={t.id}
                          className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => toggleDaily(t)}
                            className={cn(
                              "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                              t.done ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                            )}
                          >
                            {t.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </button>
                          <span className={cn("flex-1 text-sm", t.done && "line-through text-muted-foreground")}>
                            {t.title}
                          </span>
                          {t.source_item_id && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                              프로젝트
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteDaily(t)}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-500 transition-opacity"
                            title="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── 내 프로젝트 ── */}
                {projects.length === 0 ? (
                  <div className={cn("rounded-2xl bg-card p-10 text-center text-muted-foreground", CARD_SHADOW)}>
                    담당(PO) 프로젝트가 없습니다.
                  </div>
                ) : (
                  projects.map((p) => {
                    const cycleDay = resolveCycleDay(p)
                    const which = tabs[p.id] || "cur"
                    const { key, list } = itemsFor(p, which)
                    const dLeft = daysUntilCycleEnd(key, cycleDay)
                    const cNum = cycleNumber(p.contract_start_date, key, cycleDay)
                    const pct = projectPercent(list as DeliverableItem[])
                    const status = deriveProjectStatus(list as DeliverableItem[])
                    return (
                      <div key={p.id} className={cn("rounded-2xl bg-card overflow-hidden", CARD_SHADOW)}>
                        {/* 프로젝트 헤더 */}
                        <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => router.push(`/monthly-tracker/${p.id}?month=${key}`)}
                                className="text-[17px] font-bold hover:text-primary transition-colors flex items-center gap-1"
                                title="프로젝트 상세로"
                              >
                                {projName(p)}
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                              </button>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                                  PROJECT_STATUS_META[status].chip
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full", PROJECT_STATUS_META[status].dot)} />
                                {PROJECT_STATUS_META[status].label || status}
                              </span>
                            </div>
                            <div className="text-[12px] text-muted-foreground mt-0.5 tabular-nums">
                              {cNum ? `${cNum}회차 · ` : ""}
                              {cycleRangeLabel(key, cycleDay)} · 완수율 {pct}%
                            </div>
                          </div>
                          {/* D-day 크게 */}
                          <div
                            className={cn(
                              "text-2xl font-extrabold tabular-nums shrink-0",
                              which !== "cur" || dLeft < 0
                                ? "text-muted-foreground/50"
                                : dLeft <= 5
                                  ? "text-red-500"
                                  : "text-primary"
                            )}
                            title="회차 종료까지"
                          >
                            {dLeft < 0 ? "종료" : dLeft === 0 ? "D-DAY" : `D-${dLeft}`}
                          </div>
                        </div>

                        {/* 회차 탭 */}
                        <div className="px-5">
                          <div className="inline-flex rounded-lg bg-muted p-0.5">
                            {(["cur", "prev"] as const).map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => setTabs((prev) => ({ ...prev, [p.id]: w }))}
                                className={cn(
                                  "px-3 h-7 rounded-md text-[12px] font-semibold transition-colors",
                                  which === w ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                                )}
                              >
                                {w === "cur" ? "현재 회차" : "이전 회차"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 항목 목록 */}
                        <div className="px-3 py-3">
                          {list.length === 0 ? (
                            <p className="text-sm text-muted-foreground/70 text-center py-6">
                              이 회차에 등록된 업무가 없어요.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {list.map((it) => {
                                const units = unitCount(it)
                                const checked = checkedSetOf(it)
                                const isOpen = expanded.has(it.id)
                                const full = checked.size >= units
                                return (
                                  <div key={it.id} className="rounded-xl border border-border/60 overflow-hidden">
                                    {/* 항목 행 */}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(it.id)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                                    >
                                      {isOpen ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <span
                                        className={cn(
                                          "flex-1 text-sm font-medium",
                                          full && "line-through text-muted-foreground"
                                        )}
                                      >
                                        {it.item_name}
                                        {(it.carried_over || it.status === "이월") && (
                                          <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 no-underline inline-block">
                                            이월
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                                        {checked.size}/{units}
                                      </span>
                                      <div className="w-16 h-1.5 rounded bg-muted overflow-hidden shrink-0">
                                        <div
                                          className="h-full bg-primary transition-all"
                                          style={{ width: `${Math.round((checked.size / units) * 100)}%` }}
                                        />
                                      </div>
                                    </button>

                                    {/* 단위 목록 */}
                                    {isOpen && (
                                      <div className="border-t border-border/60 bg-muted/20 px-3 py-2 space-y-0.5">
                                        {Array.from({ length: units }, (_, idx) => {
                                          const isChecked = checked.has(idx)
                                          const unitKey = `${it.id}:${idx}`
                                          const isSent = sentUnits.has(unitKey)
                                          const isBusy = busy === unitKey
                                          return (
                                            <div
                                              key={idx}
                                              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-background transition-colors"
                                            >
                                              <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => setUnitChecked(it, idx, !isChecked)}
                                                className={cn(
                                                  "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                                                  isChecked
                                                    ? "bg-primary border-primary"
                                                    : "border-muted-foreground/30 hover:border-primary"
                                                )}
                                              >
                                                {isBusy ? (
                                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                ) : (
                                                  isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                                )}
                                              </button>
                                              <span
                                                className={cn(
                                                  "flex-1 text-sm",
                                                  isChecked && "line-through text-muted-foreground"
                                                )}
                                              >
                                                {it.item_name}
                                                {units > 1 ? ` ${idx + 1}` : ""}
                                              </span>
                                              {isSent ? (
                                                <span className="text-[11px] text-muted-foreground shrink-0">
                                                  금일 업무에 있음
                                                </span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => sendToToday(p, it, units > 1 ? idx : null)}
                                                  className="opacity-0 group-hover:opacity-100 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 hover:bg-amber-200 transition-all flex items-center gap-0.5"
                                                  title="금일 업무로 보내기"
                                                >
                                                  <Sun className="h-3 w-3" />
                                                  오늘 업무로
                                                </button>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
