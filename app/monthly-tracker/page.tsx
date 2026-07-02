"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  summarizeItems,
  shiftMonth,
  resolveCycleDay,
  cycleKeyFor,
  cycleDayLabel,
  cycleRangeLabel,
  daysUntilCycleEnd,
} from "@/lib/monthly-deliverables"

interface ProjectRow {
  id: string
  project_name: string | null
  category: string | null
  assigned_to: string | null
  project_owner_id: string | null
  payment_day: number | null
  cycle_start_day: number | null
  start_month: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  account?: { company_name?: string | null; brand_name?: string | null } | null
  client?: { deal_name?: string | null } | null
}

// 날짜 표기 (2026-05-04 → 26.05.04)
const fmtDate = (d: string | null) => (d ? d.slice(2).replace(/-/g, ".") : "—")

interface MonthStatusRow {
  recurring_project_id: string
  month: string
  status_override: string | null
  note: string | null
}

const projectName = (p: ProjectRow) =>
  p.account?.company_name || p.client?.deal_name || p.project_name || "(이름 없음)"

function StatusChip({ status, manual }: { status: ProjectStatus; manual?: boolean }) {
  const meta = PROJECT_STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        meta.chip
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label || status}
      {manual && <span className="opacity-60 font-normal">·수동</span>}
    </span>
  )
}

export default function MonthlyTrackerPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()
  // 회차 오프셋: 0 = 각 프로젝트의 현재 회차, -1 = 한 회차 전 …
  const [cycleOffset, setCycleOffset] = useState(0)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [itemsByProject, setItemsByProject] = useState<Record<string, DeliverableItem[]>>({})
  const [statusByProject, setStatusByProject] = useState<Record<string, MonthStatusRow>>({})
  const [loading, setLoading] = useState(true)
  const [replicating, setReplicating] = useState(false)
  const [search, setSearch] = useState("")
  const [poFilter, setPoFilter] = useState<string>("all") // all | __none__ | member id
  // 로그인 사용자가 PO 역할(마케팅/영상)이면 자기 프로젝트만 보이도록 잠금
  const [myPoId, setMyPoId] = useState<string | null>(null)

  // 프로젝트별 표시 회차 키 (오프셋 반영)
  const keyForProject = useCallback(
    (p: ProjectRow) => shiftMonth(cycleKeyFor(resolveCycleDay(p)), cycleOffset),
    [cycleOffset]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: projData, error: projErr }, memberList] = await Promise.all([
        supabase
          .from("recurring_projects")
          .select(
            "id, project_name, category, assigned_to, project_owner_id, payment_day, cycle_start_day, start_month, contract_start_date, contract_end_date, account:accounts(company_name, brand_name), client:clients(deal_name)"
          )
          .eq("is_active", true),
        fetchActiveMembers(supabase),
      ])
      if (projErr) throw projErr
      const projList = (projData || []) as unknown as ProjectRow[]
      setProjects(projList)
      setMembers(memberList)

      // 로그인 사용자가 PO 역할(마케팅/영상)이면 자기 것만 보이게 잠금
      const { data: auth } = await supabase.auth.getUser()
      const me = auth?.user ? memberList.find((m) => m.id === auth.user!.id) : null
      setMyPoId(me && PO_ROLES.includes(me.role) ? me.id : null)

      const ids = projList.map((p) => p.id)
      if (ids.length === 0) {
        setItemsByProject({})
        setStatusByProject({})
        return
      }

      // 프로젝트마다 회차 시작 달이 달라 후보 키(최대 2개 달)를 모두 조회 후 프로젝트별로 필터
      const keyById: Record<string, string> = {}
      const keySet = new Set<string>()
      for (const p of projList) {
        const k = shiftMonth(cycleKeyFor(resolveCycleDay(p)), cycleOffset)
        keyById[p.id] = k
        keySet.add(k)
      }
      const keys = Array.from(keySet)

      const [{ data: itemData }, { data: statusData }] = await Promise.all([
        supabase
          .from("monthly_deliverable_items")
          .select("*")
          .in("month", keys)
          .in("recurring_project_id", ids)
          .order("sort_order", { ascending: true }),
        supabase
          .from("monthly_project_status")
          .select("recurring_project_id, month, status_override, note")
          .in("month", keys)
          .in("recurring_project_id", ids),
      ])

      const itemsMap: Record<string, DeliverableItem[]> = {}
      for (const it of (itemData || []) as (DeliverableItem & { month: string })[]) {
        if (it.month !== keyById[it.recurring_project_id]) continue
        ;(itemsMap[it.recurring_project_id] ||= []).push(it)
      }
      setItemsByProject(itemsMap)

      const statusMap: Record<string, MonthStatusRow> = {}
      for (const s of (statusData || []) as MonthStatusRow[]) {
        if (s.month !== keyById[s.recurring_project_id]) continue
        statusMap[s.recurring_project_id] = s
      }
      setStatusByProject(statusMap)
    } catch (err: any) {
      console.error("[월별현황] 로드 오류:", err)
      toast.error(`로드 실패: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, cycleOffset])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 프로젝트의 표시 회차 유효 상태(override 우선, 없으면 자동 산출)
  const effectiveStatus = useCallback(
    (projectId: string): { status: ProjectStatus; manual: boolean } => {
      const override = statusByProject[projectId]?.status_override
      if (override && PROJECT_STATUSES.includes(override as ProjectStatus)) {
        return { status: override as ProjectStatus, manual: true }
      }
      return { status: deriveProjectStatus(itemsByProject[projectId] || []), manual: false }
    },
    [statusByProject, itemsByProject]
  )

  // 상태별 집계
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      const s = effectiveStatus(p.id).status
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [projects, effectiveStatus])

  // PO 드롭다운 후보 = 마케팅(marketer)/영상(video) 역할 멤버
  const poMembers = useMemo(() => members.filter((m) => PO_ROLES.includes(m.role)), [members])

  // 프로젝트(정기 마스터) 필드 즉시 수정 — PO
  const updateProjectField = async (id: string, patch: Partial<ProjectRow>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { error } = await supabase.from("recurring_projects").update(patch).eq("id", id)
    if (error) {
      console.error("[월별현황] 담당자 저장 오류:", error)
      toast.error(`담당자 저장 실패: ${error.message}`)
      loadData()
    }
  }

  // 멤버 id → 이름 맵 (PO 검색용)
  const memberNameById = useMemo(() => {
    const m: Record<string, string> = {}
    members.forEach((mem) => (m[mem.id] = memberDisplayName(mem)))
    return m
  }, [members])

  // PO 필터 옵션 = PO 후보(마케팅/영상) ∪ 실제 프로젝트에 지정된 PO(역할 변경돼도 유지)
  const poFilterOptions = useMemo(() => {
    const map = new Map<string, string>()
    poMembers.forEach((m) => map.set(m.id, memberDisplayName(m)))
    projects.forEach((p) => {
      if (p.project_owner_id && !map.has(p.project_owner_id)) {
        map.set(p.project_owner_id, memberNameById[p.project_owner_id] || "(알 수 없음)")
      }
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [poMembers, projects, memberNameById])

  // 검색 + PO 필터 (거래처/프로젝트명/영업담당/PO)
  // PO 역할 로그인 사용자는 자기 프로젝트만 (필터 UI 대신 강제 적용)
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      if (myPoId) {
        if (p.project_owner_id !== myPoId) return false
      } else {
        if (poFilter === "__none__" && p.project_owner_id) return false
        if (poFilter !== "all" && poFilter !== "__none__" && p.project_owner_id !== poFilter) return false
      }
      if (!q) return true
      const po = p.project_owner_id ? memberNameById[p.project_owner_id] || "" : ""
      const hay = [projectName(p), p.project_name, p.category, p.assigned_to, po]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [projects, search, memberNameById, poFilter, myPoId])

  // 프로젝트를 보드에서 제거(비활성화). 이력 보존을 위해 행은 삭제하지 않고 is_active=false.
  const deactivateProject = async (p: ProjectRow) => {
    if (!confirm(`"${projectName(p)}" 프로젝트를 목록에서 제거할까요?\n(정기 프로젝트가 비활성화되며, 매월 갱신 후보에서도 빠집니다. 중복으로 잘못 생긴 경우 사용하세요)`)) {
      return
    }
    const { error } = await supabase.from("recurring_projects").update({ is_active: false }).eq("id", p.id)
    if (error) {
      toast.error(`제거 실패: ${error.message}`)
      return
    }
    setProjects((prev) => prev.filter((x) => x.id !== p.id))
    toast.success("목록에서 제거했습니다.")
  }

  const openProject = (p: ProjectRow) => {
    router.push(`/monthly-tracker/${p.id}?month=${encodeURIComponent(keyForProject(p))}`)
  }

  // 이전 회차 복제 + 미완료 자동 이월 (프로젝트별 회차 키 기준)
  const replicateFromPrev = async () => {
    if (!confirm(`각 프로젝트의 "이전 회차" 항목을 현재 표시 중인 회차로 복제합니다.\n완료 항목은 새로(대기) 생성하고, 미완료 항목은 '이월'로 이어옵니다.\n(이미 항목이 있는 프로젝트는 건너뜁니다)`)) {
      return
    }
    setReplicating(true)
    try {
      const ids = projects.map((p) => p.id)
      if (ids.length === 0) return

      const curKeyById: Record<string, string> = {}
      const prevKeyById: Record<string, string> = {}
      const prevKeys = new Set<string>()
      for (const p of projects) {
        const k = keyForProject(p)
        curKeyById[p.id] = k
        const pk = shiftMonth(k, -1)
        prevKeyById[p.id] = pk
        prevKeys.add(pk)
      }

      const { data: prevItems, error } = await supabase
        .from("monthly_deliverable_items")
        .select("*")
        .in("month", Array.from(prevKeys))
        .in("recurring_project_id", ids)
        .order("sort_order", { ascending: true })
      if (error) throw error

      const prevByProject: Record<string, DeliverableItem[]> = {}
      for (const it of (prevItems || []) as (DeliverableItem & { month: string })[]) {
        if (it.month !== prevKeyById[it.recurring_project_id]) continue
        ;(prevByProject[it.recurring_project_id] ||= []).push(it)
      }

      const rows: any[] = []
      let skipped = 0
      for (const p of projects) {
        if ((itemsByProject[p.id] || []).length > 0) {
          skipped++
          continue // 표시 회차에 이미 있음
        }
        const src = prevByProject[p.id] || []
        src.forEach((it, idx) => {
          const completed = it.status === "완료"
          rows.push({
            recurring_project_id: p.id,
            month: curKeyById[p.id],
            item_name: it.item_name,
            target_qty: it.target_qty,
            done_qty: completed ? 0 : it.done_qty,
            status: completed ? "대기" : "이월",
            carried_over: completed ? false : true,
            reason: completed ? null : it.reason,
            link_url: it.link_url ?? null,
            content: completed ? null : it.content ?? null,
            sort_order: idx,
          })
        })
      }

      if (rows.length === 0) {
        toast.info("복제할 이전 회차 항목이 없습니다.")
        return
      }
      const { error: insErr } = await supabase.from("monthly_deliverable_items").insert(rows)
      if (insErr) throw insErr
      toast.success(`${rows.length}개 항목 복제 완료${skipped ? ` (${skipped}개 프로젝트는 이미 있어 건너뜀)` : ""}`)
      await loadData()
    } catch (err: any) {
      console.error("[월별현황] 복제 오류:", err)
      toast.error(`복제 실패: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setReplicating(false)
    }
  }

  const offsetLabel =
    cycleOffset === 0 ? "현재 회차" : cycleOffset < 0 ? `${-cycleOffset}회차 전` : `${cycleOffset}회차 후`

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />
        <main className="flex-1 overflow-y-auto p-2 xl:p-6">
          {/* 헤더 */}
          <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                월별 업무 완수 현황
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                각 프로젝트의 회차(계약 사이클) 기준으로 이행 항목 완수 여부를 체크합니다. 행을 클릭하면 상세로 이동합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 회차 선택 */}
              <div className="flex items-center rounded-md border bg-card">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCycleOffset((o) => o - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm font-semibold min-w-[88px] text-center">{offsetLabel}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCycleOffset((o) => o + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {cycleOffset !== 0 && (
                <Button variant="outline" size="sm" onClick={() => setCycleOffset(0)}>
                  현재 회차
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={replicateFromPrev} disabled={replicating || loading}>
                {replicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CopyPlus className="h-3.5 w-3.5" />}
                이전 회차 복제 + 이월
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData} title="새로고침">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 상태 요약 */}
          <div className="mb-4 flex flex-wrap gap-2">
            {PROJECT_STATUSES.map((s) => (
              <span
                key={s}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  PROJECT_STATUS_META[s].chip
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", PROJECT_STATUS_META[s].dot)} />
                {PROJECT_STATUS_META[s].label || s}
                <span className="font-bold">{statusCounts[s] || 0}</span>
              </span>
            ))}
          </div>

          {/* 검색 + PO 필터 */}
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="거래처·프로젝트·담당 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              {myPoId ? (
                <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 text-sm font-medium text-primary">
                  내 프로젝트만 표시 중 ({memberNameById[myPoId] || ""})
                </span>
              ) : (
                <>
                  <Select value={poFilter} onValueChange={setPoFilter}>
                    <SelectTrigger
                      className={cn("h-9 w-[140px] text-sm", poFilter !== "all" && "border-primary/50 text-primary font-medium")}
                    >
                      <SelectValue placeholder="PO 전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">PO 전체</SelectItem>
                      <SelectItem value="__none__">PO 미지정</SelectItem>
                      {poFilterOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {poFilter !== "all" && (
                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => setPoFilter("all")}>
                      초기화
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{filteredProjects.length}개 프로젝트</div>
          </div>

          {/* 보드 */}
          <Card className="overflow-hidden">
            <Table className="[&_th]:px-4 [&_td]:px-4 [&_td]:py-3 [&_th:first-child]:pl-6 [&_td:first-child]:pl-6 [&_th:last-child]:pr-6 [&_td:last-child]:pr-6">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[13%]">거래처명</TableHead>
                  <TableHead className="w-[8%]">PO</TableHead>
                  <TableHead className="w-[10%]">현재상황</TableHead>
                  <TableHead className="w-[10%]">완수율</TableHead>
                  <TableHead className="w-[8%] text-center">계약 시작일</TableHead>
                  <TableHead className="w-[8%] text-center">계약 종료일</TableHead>
                  <TableHead className="w-[10%] text-center">회차 진행</TableHead>
                  <TableHead>업무 이행 항목</TableHead>
                  <TableHead className="w-[12%]">비고</TableHead>
                  <TableHead className="w-[4%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                      활성 정기 프로젝트가 없습니다. (S5 계약완료 시 정기 프로젝트로 생성됩니다)
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((p) => {
                    const items = itemsByProject[p.id] || []
                    const { total, done, carried } = summarizeItems(items)
                    const pct = projectPercent(items)
                    const { status, manual } = effectiveStatus(p.id)
                    const note = statusByProject[p.id]?.note
                    const cycleDay = resolveCycleDay(p)
                    const key = keyForProject(p)
                    const dLeft = daysUntilCycleEnd(key, cycleDay)
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50 align-top"
                        onClick={() => openProject(p)}
                      >
                        {/* 거래처명 */}
                        <TableCell>
                          <div className="font-medium text-sm">{projectName(p)}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.category || "—"}
                            {p.project_name && p.account?.company_name ? ` · ${p.project_name}` : ""}
                          </div>
                        </TableCell>
                        {/* PO */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            // 현재 PO 가 후보(마케팅/영상)에 없으면(역할 변경 등) 그 멤버도 옵션에 포함해 표시 유지
                            const current =
                              p.project_owner_id && !poMembers.some((m) => m.id === p.project_owner_id)
                                ? members.find((m) => m.id === p.project_owner_id)
                                : null
                            const opts = current ? [...poMembers, current] : poMembers
                            return (
                              <Select
                                value={p.project_owner_id || "__none__"}
                                onValueChange={(v) =>
                                  updateProjectField(p.id, { project_owner_id: v === "__none__" ? null : v })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="PO" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">미지정</SelectItem>
                                  {opts.map((m) => (
                                    <SelectItem key={m!.id} value={m!.id}>
                                      {memberDisplayName(m!)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          })()}
                        </TableCell>
                        {/* 현재상황 */}
                        <TableCell>
                          <StatusChip status={status} manual={manual} />
                        </TableCell>
                        {/* 완수율 */}
                        <TableCell>
                          {total === 0 ? (
                            <span className="text-xs text-muted-foreground">미설정</span>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs tabular-nums">
                                <span className="font-semibold">{pct}%</span>
                                <span className="text-muted-foreground">
                                  {done}/{total}
                                  {carried > 0 && <span className="ml-1 text-teal-600">이월{carried}</span>}
                                </span>
                              </div>
                              <div className="h-1.5 rounded bg-muted overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                        </TableCell>
                        {/* 계약 시작일 */}
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                          {fmtDate(p.contract_start_date)}
                        </TableCell>
                        {/* 계약 종료일 */}
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                          {fmtDate(p.contract_end_date)}
                        </TableCell>
                        {/* 회차 진행 */}
                        <TableCell className="text-center text-xs tabular-nums">
                          <div className="text-muted-foreground">{cycleDayLabel(cycleDay)}</div>
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{cycleRangeLabel(key, cycleDay)}</div>
                          {cycleOffset === 0 && dLeft >= 0 && (
                            <span className="inline-block mt-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                              {dLeft === 0 ? "D-DAY" : `D-${dLeft}`}
                            </span>
                          )}
                        </TableCell>
                        {/* 업무 이행 항목 */}
                        <TableCell>
                          {items.length === 0 ? (
                            <span className="text-xs text-muted-foreground">미설정</span>
                          ) : (
                            <div className="space-y-0.5">
                              {items.map((it, i) => (
                                <div key={i} className="text-xs leading-snug">
                                  <span className={cn(it.status === "완료" && "text-muted-foreground line-through")}>
                                    {it.item_name}
                                  </span>
                                  {it.target_qty != null && (
                                    <span className="text-muted-foreground tabular-nums">
                                      {" "}
                                      ({it.done_qty}/{it.target_qty})건
                                    </span>
                                  )}
                                  {it.target_qty == null && it.status !== "대기" && (
                                    <span className="text-muted-foreground"> · {it.status}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        {/* 비고 */}
                        <TableCell className="text-xs text-muted-foreground max-w-0">
                          <div className="line-clamp-3 whitespace-pre-wrap">{note || ""}</div>
                        </TableCell>
                        {/* 삭제 */}
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                          <button
                            type="button"
                            onClick={() => deactivateProject(p)}
                            title="이 프로젝트를 목록에서 제거(비활성화)"
                            className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </main>
      </div>
    </div>
  )
}
