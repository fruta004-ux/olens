"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { type Member, fetchActiveMembers, memberDisplayName, SALES_ROLES, PO_ROLES } from "@/lib/members"
import {
  type DeliverableItem,
  type ItemStatus,
  type ProjectStatus,
  ITEM_STATUSES,
  ITEM_STATUS_META,
  PROJECT_STATUSES,
  PROJECT_STATUS_META,
  deriveProjectStatus,
  projectPercent,
  currentMonth,
  shiftMonth,
  resolveCycleDay,
  cycleKeyFor,
  cycleNumber,
  cycleDayLabel,
  cycleRange,
  cycleRangeLabel,
  daysUntilCycleEnd,
} from "@/lib/monthly-deliverables"

interface ProjectInfo {
  id: string
  project_name: string | null
  category: string | null
  assigned_to: string | null
  project_owner_id: string | null
  payment_day: number | null
  cycle_start_day: number | null
  start_month: string | null
  monthly_amount: number | null
  contract_start_date: string | null
  contract_end_date: string | null
  account?: { company_name?: string | null; brand_name?: string | null } | null
  client?: { deal_name?: string | null } | null
}

interface WItem {
  item_name: string
  target_qty: number | null
  done_qty: number
  status: ItemStatus
  carried_over: boolean
  reason: string
  link_url: string
  content: string
}

const projName = (p: ProjectInfo | null) =>
  p?.account?.company_name || p?.client?.deal_name || p?.project_name || "(이름 없음)"

const emptyItem = (): WItem => ({
  item_name: "",
  target_qty: null,
  done_qty: 0,
  status: "대기",
  carried_over: false,
  reason: "",
  link_url: "",
  content: "",
})

// Toss: 단일 레이어 · 순수 블랙 저투명 그림자 (테두리 대신 그림자로 표면 구분)
const CARD_SHADOW = "shadow-[0_2px_8px_rgba(0,0,0,0.06)]"

function itemPercent(it: WItem): number {
  if (it.target_qty && it.target_qty > 0) return Math.min(Math.round((it.done_qty / it.target_qty) * 100), 100)
  return it.status === "완료" ? 100 : it.status === "진행중" ? 50 : 0
}

/** 완수율 링 — 데이터 시각화(장식 아님). primary 진행 + 은은한 트랙. */
function Ring({ value, size = 104, stroke = 11 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(Math.max(value, 0), 100) / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className="text-primary/12" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums tracking-tight">{value}%</span>
      </div>
    </div>
  )
}

/** Toss weak/elephant 배지 (테두리 없는 pill) */
function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">
      {children}
    </span>
  )
}

/** 라벨 + 컴팩트 컨트롤 (자주 안 바꾸는 값 — 한 줄 인라인) */
function InlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

// 인라인 셀렉트 트리거 — 텍스트처럼 보이는 컴팩트 pill
const INLINE_TRIGGER =
  "h-8 w-auto min-w-[80px] gap-1 rounded-lg border-0 bg-muted/60 px-2.5 text-[13px] font-semibold shadow-none hover:bg-muted focus:ring-0 data-[placeholder]:text-muted-foreground"

export default function ProjectDetailPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = String(params.projectId)

  const [month, setMonth] = useState<string>(searchParams.get("month") || currentMonth())
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<WItem[]>([])
  const [note, setNote] = useState("")
  const [statusOverride, setStatusOverride] = useState("auto")
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [projectOwnerId, setProjectOwnerId] = useState<string | null>(null)
  const [contractStart, setContractStart] = useState("")
  const [contractEnd, setContractEnd] = useState("")
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  const dataRef = useRef({ items, note, statusOverride, assignedTo, projectOwnerId, contractStart, contractEnd, month })
  useEffect(() => {
    dataRef.current = { items, note, statusOverride, assignedTo, projectOwnerId, contractStart, contractEnd, month }
  })
  const savingRef = useRef(false)
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)
  const initKeyRef = useRef(false) // URL 에 month 없이 진입 시 프로젝트 회차 기준으로 1회 보정

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: proj, error: projErr }, memberList] = await Promise.all([
        supabase
          .from("recurring_projects")
          .select(
            "id, project_name, category, assigned_to, project_owner_id, payment_day, cycle_start_day, start_month, monthly_amount, contract_start_date, contract_end_date, account:accounts(company_name, brand_name), client:clients(deal_name)"
          )
          .eq("id", projectId)
          .maybeSingle(),
        fetchActiveMembers(supabase),
      ])
      if (projErr) throw projErr
      const pInfo = proj as unknown as ProjectInfo | null
      setProject(pInfo)
      setMembers(memberList)
      setAssignedTo(pInfo?.assigned_to ?? null)
      setProjectOwnerId(pInfo?.project_owner_id ?? null)
      setContractStart(pInfo?.contract_start_date ?? "")
      setContractEnd(pInfo?.contract_end_date ?? "")

      // URL 에 month 파라미터 없이 들어온 경우: 이 프로젝트의 "현재 회차" 키로 1회 보정
      if (!initKeyRef.current) {
        initKeyRef.current = true
        if (!searchParams.get("month") && pInfo) {
          const k = cycleKeyFor(resolveCycleDay(pInfo))
          if (k !== month) {
            setMonth(k) // month 변경 → load 재실행
            return
          }
        }
      }

      const [{ data: itemData }, { data: statusData }] = await Promise.all([
        supabase
          .from("monthly_deliverable_items")
          .select("*")
          .eq("recurring_project_id", projectId)
          .eq("month", month)
          .order("sort_order", { ascending: true }),
        supabase
          .from("monthly_project_status")
          .select("status_override, note")
          .eq("recurring_project_id", projectId)
          .eq("month", month)
          .maybeSingle(),
      ])

      setItems(
        ((itemData || []) as DeliverableItem[]).map((it) => ({
          item_name: it.item_name,
          target_qty: it.target_qty,
          done_qty: it.done_qty,
          status: it.status,
          carried_over: it.carried_over,
          reason: it.reason || "",
          link_url: it.link_url || "",
          content: it.content || "",
        }))
      )
      setNote((statusData as any)?.note || "")
      setStatusOverride((statusData as any)?.status_override || "auto")
      loadedRef.current = true
    } catch (err: any) {
      console.error("[프로젝트 상세] 로드 오류:", err)
      toast.error(`로드 실패: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId, month])

  useEffect(() => {
    loadedRef.current = false
    load()
  }, [load])

  const doPersist = useCallback(async () => {
    if (savingRef.current) {
      dirtyRef.current = true
      return
    }
    savingRef.current = true
    setSaveState("saving")
    try {
      const d = dataRef.current
      const { error: projErr } = await supabase
        .from("recurring_projects")
        .update({
          assigned_to: d.assignedTo || null,
          project_owner_id: d.projectOwnerId || null,
          contract_start_date: d.contractStart || null,
          contract_end_date: d.contractEnd || null,
        })
        .eq("id", projectId)
      if (projErr) throw projErr

      const clean = d.items.map((it) => ({ ...it, item_name: it.item_name.trim() })).filter((it) => it.item_name)
      const { error: delErr } = await supabase
        .from("monthly_deliverable_items")
        .delete()
        .eq("recurring_project_id", projectId)
        .eq("month", d.month)
      if (delErr) throw delErr
      if (clean.length > 0) {
        const rows = clean.map((it, idx) => ({
          recurring_project_id: projectId,
          month: d.month,
          item_name: it.item_name,
          target_qty: it.target_qty,
          done_qty: it.done_qty || 0,
          status: it.status,
          carried_over: it.carried_over,
          reason: it.reason?.trim() || null,
          link_url: it.link_url?.trim() || null,
          content: it.content?.trim() || null,
          sort_order: idx,
        }))
        const { error: insErr } = await supabase.from("monthly_deliverable_items").insert(rows)
        if (insErr) throw insErr
      }

      const { error: stErr } = await supabase.from("monthly_project_status").upsert(
        {
          recurring_project_id: projectId,
          month: d.month,
          status_override: d.statusOverride === "auto" ? null : d.statusOverride,
          note: d.note.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "recurring_project_id,month" }
      )
      if (stErr) throw stErr

      setSaveState("saved")
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000)
    } catch (err: any) {
      console.error("[프로젝트 상세] 자동 저장 오류:", err)
      setSaveState("idle")
      toast.error(`저장 실패: ${err?.message || "알 수 없는 오류"}`)
    } finally {
      savingRef.current = false
      if (dirtyRef.current) {
        dirtyRef.current = false
        doPersist()
      }
    }
  }, [supabase, projectId])

  const schedulePersist = useCallback(() => {
    if (!loadedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doPersist(), 500)
  }, [doPersist])

  const flushPersist = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await doPersist()
  }, [doPersist])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        doPersist()
      }
    }
  }, [doPersist])

  const salesOptions = useMemo(() => {
    const set = new Set<string>()
    members.filter((m) => SALES_ROLES.includes(m.role)).forEach((m) => set.add(memberDisplayName(m)))
    if (assignedTo) set.add(assignedTo)
    return Array.from(set)
  }, [members, assignedTo])

  const poOptions = useMemo(() => {
    const base = members.filter((m) => PO_ROLES.includes(m.role))
    if (projectOwnerId && !base.some((m) => m.id === projectOwnerId)) {
      const cur = members.find((m) => m.id === projectOwnerId)
      if (cur) return [...base, cur]
    }
    return base
  }, [members, projectOwnerId])

  const pct = projectPercent(items as unknown as DeliverableItem[])
  const autoStatus = deriveProjectStatus(items as unknown as DeliverableItem[])
  const displayedStatus: ProjectStatus = statusOverride === "auto" ? autoStatus : (statusOverride as ProjectStatus)
  const total = items.length
  const doneCount = items.filter((i) => i.status === "완료").length
  const carriedCount = items.filter((i) => i.carried_over || i.status === "이월").length

  // ── 회차 정보 ──
  const cycleDay = project ? resolveCycleDay(project) : 1
  const cNum = project ? cycleNumber(project.contract_start_date, month, cycleDay) : null
  const currentKey = project ? cycleKeyFor(cycleDay) : currentMonth()
  const dLeft = daysUntilCycleEnd(month, cycleDay)
  const notStarted = cycleRange(month, cycleDay).start.getTime() > Date.now()
  const [keyYear] = month.split("-")

  const updateItem = (idx: number, patch: Partial<WItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    schedulePersist()
  }

  const goMonth = async (delta: number) => {
    await flushPersist()
    setMonth((m) => shiftMonth(m, delta))
  }
  const goCurrent = async () => {
    await flushPersist()
    setMonth(currentKey)
  }
  const goList = async () => {
    await flushPersist()
    router.push("/monthly-tracker")
  }

  // Toss 입력: 표면 bg + 큰 라운드(14px) + focus 시 primary 보더
  const tossInput =
    "rounded-xl border-transparent bg-muted/50 focus-visible:bg-background focus-visible:border-input focus-visible:ring-0"

  return (
    <div className="flex h-screen bg-muted/30">
      <CrmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />
        <main className="flex-1 overflow-y-auto p-3 xl:p-8">
          <div className="mx-auto max-w-[1040px] space-y-6">
            {/* 상단 바 */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5 rounded-full" onClick={goList}>
                  <ArrowLeft className="h-4 w-4" />
                  목록
                </Button>
                {/* 세그먼트형 회차 선택 */}
                <div className="flex items-center rounded-xl bg-muted p-1" title={`${keyYear}년 기준`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background" onClick={() => goMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-semibold tabular-nums min-w-[150px] text-center">
                    {cNum ? `${cNum}회차` : month.replace("-", ".")}
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                      {cycleRangeLabel(month, cycleDay)}
                    </span>
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background" onClick={() => goMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {month !== currentKey && (
                  <Button variant="ghost" size="sm" className="rounded-full text-primary hover:bg-primary/10" onClick={goCurrent}>
                    현재 회차
                  </Button>
                )}
              </div>
              <div
                className={cn(
                  "text-[13px] font-medium flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
                  saveState === "saving" && "bg-primary/10 text-primary",
                  saveState === "saved" && "bg-green-100 text-green-700",
                  saveState === "idle" && "text-muted-foreground"
                )}
              >
                {saveState === "saving" && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> 저장 중…
                  </>
                )}
                {saveState === "saved" && (
                  <>
                    <Check className="h-3.5 w-3.5" /> 저장했어요
                  </>
                )}
                {saveState === "idle" && (
                  <>
                    <Check className="h-3.5 w-3.5 opacity-40" /> 자동 저장
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-28 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : !project ? (
              <div className="py-28 text-center text-muted-foreground">프로젝트를 찾을 수 없어요.</div>
            ) : (
              <>
                {/* 헤더 카드 — 컴팩트 1줄 */}
                <div className={cn("rounded-2xl bg-card p-5", CARD_SHADOW)}>
                  <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div className="min-w-0 space-y-2.5">
                      {/* 타이틀 + 상태 */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[22px] font-bold tracking-tight leading-tight">{projName(project)}</h1>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold",
                            PROJECT_STATUS_META[displayedStatus].chip
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", PROJECT_STATUS_META[displayedStatus].dot)} />
                          {PROJECT_STATUS_META[displayedStatus].label || displayedStatus}
                        </span>
                      </div>
                      {/* 담당/PO/상태 — 컴팩트 인라인 한 줄 */}
                      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                        <InlineField label="영업담당">
                          <Select
                            value={assignedTo || "__none__"}
                            onValueChange={(v) => {
                              setAssignedTo(v === "__none__" ? null : v)
                              schedulePersist()
                            }}
                          >
                            <SelectTrigger className={INLINE_TRIGGER}><SelectValue placeholder="미지정" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">미지정</SelectItem>
                              {salesOptions.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </InlineField>
                        <InlineField label="PO">
                          <Select
                            value={projectOwnerId || "__none__"}
                            onValueChange={(v) => {
                              setProjectOwnerId(v === "__none__" ? null : v)
                              schedulePersist()
                            }}
                          >
                            <SelectTrigger className={INLINE_TRIGGER}><SelectValue placeholder="미지정" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">미지정</SelectItem>
                              {poOptions.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{memberDisplayName(m)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </InlineField>
                        <InlineField label="상태">
                          <Select
                            value={statusOverride}
                            onValueChange={(v) => {
                              setStatusOverride(v)
                              schedulePersist()
                            }}
                          >
                            <SelectTrigger className={INLINE_TRIGGER}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">자동</SelectItem>
                              {PROJECT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{PROJECT_STATUS_META[s].label || s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </InlineField>
                        <InlineField label="계약">
                          <input
                            type="date"
                            value={contractStart}
                            onChange={(e) => {
                              setContractStart(e.target.value)
                              schedulePersist()
                            }}
                            className="h-8 rounded-lg bg-muted/60 px-2 text-[13px] font-medium text-foreground outline-none hover:bg-muted focus:ring-2 focus:ring-primary/30"
                          />
                          <span className="text-muted-foreground text-xs">~</span>
                          <input
                            type="date"
                            value={contractEnd}
                            onChange={(e) => {
                              setContractEnd(e.target.value)
                              schedulePersist()
                            }}
                            className="h-8 rounded-lg bg-muted/60 px-2 text-[13px] font-medium text-foreground outline-none hover:bg-muted focus:ring-2 focus:ring-primary/30"
                          />
                        </InlineField>
                      </div>
                      {/* 메타 */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {project.category && <MetaChip>{project.category}</MetaChip>}
                        {project.project_name && <MetaChip>{project.project_name}</MetaChip>}
                        <MetaChip>회차 {cycleDayLabel(cycleDay)}</MetaChip>
                        {project.payment_day != null && <MetaChip>입금일 {project.payment_day}일</MetaChip>}
                        {project.start_month && <MetaChip>시작 {project.start_month}</MetaChip>}
                        {project.monthly_amount != null && (
                          <MetaChip>월 {Number(project.monthly_amount).toLocaleString()}원</MetaChip>
                        )}
                      </div>
                    </div>
                    {/* 완수율 + 회차 D-day */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[13px] text-muted-foreground">회차 완수율</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums",
                              notStarted
                                ? "bg-muted text-muted-foreground"
                                : dLeft < 0
                                  ? "bg-muted text-muted-foreground"
                                  : dLeft <= 5
                                    ? "bg-red-100 text-red-600"
                                    : "bg-primary/10 text-primary"
                            )}
                            title={`회차 종료일 기준 (${cycleRangeLabel(month, cycleDay)})`}
                          >
                            {notStarted ? "시작 전" : dLeft < 0 ? "종료" : dLeft === 0 ? "D-DAY" : `D-${dLeft}`}
                          </span>
                        </div>
                        <div className="text-[15px] font-medium mt-1 tabular-nums">
                          <span className="text-foreground font-bold">{doneCount}</span>
                          <span className="text-muted-foreground"> / {total} 완료</span>
                        </div>
                        {carriedCount > 0 && <div className="text-[13px] text-teal-600 mt-0.5">이월 {carriedCount}건</div>}
                      </div>
                      <Ring value={pct} size={92} />
                    </div>
                  </div>
                </div>

                {/* 이행 항목 (좌) + 비고 (우) 2단 */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
                {/* 이행 항목 */}
                <div className={cn("rounded-2xl bg-card p-6", CARD_SHADOW)}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[20px] font-bold tracking-tight">
                      이행 항목 <span className="text-muted-foreground font-medium tabular-nums">{total}</span>
                    </h2>
                    <Button variant="ghost" size="sm" className="h-9 gap-1 rounded-full text-primary hover:bg-primary/10" onClick={addItem}>
                      <Plus className="h-4 w-4" />
                      항목 추가
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    // Toss 빈 상태: 일러스트 없음 · 왜 비었는지 한 줄 + 하나의 액션
                    <div className="py-14 text-center">
                      <p className="text-[15px] text-foreground/70">이번 달 이행할 업무를 아직 정하지 않았어요.</p>
                      <button
                        onClick={addItem}
                        className="mt-4 inline-flex items-center gap-1 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        항목 추가
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((it, idx) => {
                        const ip = itemPercent(it)
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border border-border bg-card p-4 space-y-3 transition-shadow hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                          >
                            {/* 1행 */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Input
                                value={it.item_name}
                                onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                                onBlur={schedulePersist}
                                placeholder="예: 숏폼 영상 제작 A급"
                                className={cn("h-10 text-[15px] flex-1 min-w-[220px] font-semibold", tossInput)}
                              />
                              <div className="flex items-center gap-1 rounded-xl bg-muted/50 px-2 h-10">
                                <Input
                                  type="number"
                                  value={it.done_qty}
                                  onChange={(e) => updateItem(idx, { done_qty: Number(e.target.value) || 0 })}
                                  onBlur={schedulePersist}
                                  className="h-8 w-11 text-sm text-center border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 tabular-nums font-semibold"
                                  title="완료 수량"
                                />
                                <span className="text-muted-foreground text-sm">/</span>
                                <Input
                                  type="number"
                                  value={it.target_qty ?? ""}
                                  onChange={(e) =>
                                    updateItem(idx, { target_qty: e.target.value === "" ? null : Number(e.target.value) })
                                  }
                                  onBlur={schedulePersist}
                                  placeholder="-"
                                  className="h-8 w-11 text-sm text-center border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 tabular-nums"
                                  title="목표 수량"
                                />
                              </div>
                              <Select
                                value={it.status}
                                onValueChange={(v) => {
                                  updateItem(idx, { status: v as ItemStatus })
                                  schedulePersist()
                                }}
                              >
                                <SelectTrigger
                                  className={cn("h-10 w-[96px] text-[13px] font-bold rounded-full border-0", ITEM_STATUS_META[it.status].chip)}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ITEM_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => {
                                  updateItem(idx, { carried_over: !it.carried_over })
                                  schedulePersist()
                                }}
                                className={cn(
                                  "h-10 px-3 rounded-full text-[13px] font-bold transition-colors whitespace-nowrap",
                                  it.carried_over
                                    ? "bg-teal-100 text-teal-700"
                                    : "bg-muted text-muted-foreground/70 hover:bg-muted/80"
                                )}
                                title="이월 여부"
                              >
                                {it.carried_over ? "이월" : "이월X"}
                              </button>
                              <span className="text-[15px] font-bold text-primary tabular-nums w-12 text-right">{ip}%</span>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="h-10 w-9 flex items-center justify-center rounded-full text-muted-foreground/50 hover:bg-red-50 hover:text-red-500"
                                title="항목 삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* 2행: URL */}
                            <div className="flex items-center gap-2">
                              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Input
                                value={it.link_url}
                                onChange={(e) => updateItem(idx, { link_url: e.target.value })}
                                onBlur={schedulePersist}
                                placeholder="관련 링크 (산출물/게시물 URL)"
                                className={cn("h-9 text-sm", tossInput)}
                              />
                              {it.link_url?.trim() && (
                                <a
                                  href={it.link_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:text-primary/80 shrink-0"
                                  title="새 창에서 열기"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>

                            {/* 3행: 내용 */}
                            <Textarea
                              value={it.content}
                              onChange={(e) => updateItem(idx, { content: e.target.value })}
                              onBlur={schedulePersist}
                              placeholder="상세 내용 / 메모"
                              className={cn("min-h-[44px] text-sm resize-y", tossInput)}
                            />

                            {(it.carried_over || it.status === "이월") && (
                              <Input
                                value={it.reason}
                                onChange={(e) => updateItem(idx, { reason: e.target.value })}
                                onBlur={schedulePersist}
                                placeholder="이월/지연 사유"
                                className="h-9 text-sm rounded-xl border-teal-200 bg-teal-50/40 focus-visible:ring-0"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 비고 · 지연 사유 (오른쪽 사이드 박스) */}
                <div className={cn("rounded-2xl bg-card p-5 lg:sticky lg:top-4", CARD_SHADOW)}>
                  <h2 className="text-[15px] font-bold">비고 · 지연 사유</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">이번 달 이슈나 이월 사유를 적어두세요.</p>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={schedulePersist}
                    className={cn("min-h-[200px] text-sm resize-y", tossInput)}
                    placeholder="예: 클라이언트 연락 지연으로 소재 컨펌 미완료"
                  />
                  {carriedCount > 0 && (
                    <div className="mt-3 rounded-xl bg-teal-50 text-teal-700 text-[13px] font-medium px-3 py-2">
                      이월 {carriedCount}건 진행 중
                    </div>
                  )}
                </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
