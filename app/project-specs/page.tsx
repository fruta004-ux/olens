"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  ClipboardList,
  Plus,
  Search,
  Trash2,
  CalendarIcon,
  ExternalLink,
  Filter,
  RefreshCw,
  X,
  Repeat,
  AlertCircle,
  StickyNote,
} from "lucide-react"
import { toast } from "sonner"

import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import SearchableSelect from "@/components/searchable-select"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Category = "마케팅" | "홈페이지" | "개발" | "그 외"
type CostType = "계약금" | "중도금" | "완납금" | "일괄 완납금" | "월 대행비"
type ProgressStatus = "작성대기" | "작성필요" | "작성완료"
type InvoiceStatus = "발행필요" | "발행대기" | "발행완료" | "카드결제"

interface ProjectSpec {
  id: string
  client_id: string | null
  account_id: string | null
  linked_contract_id: string | null
  linked_deal_id: string | null
  recurring_project_id: string | null
  spec_month: string | null
  category: Category
  project_name: string | null
  cost_type: CostType
  amount: number | null
  payment_due_date: string | null
  progress_status: ProgressStatus
  invoice_issue_date: string | null
  invoice_status: InvoiceStatus
  notes: string | null
  assigned_to: string | null
  finance_assigned_to: string | null
  created_at: string
  updated_at: string
  // 조인된 데이터
  account_company_name?: string
  client_id_resolved?: string
}

interface AccountOption {
  id: string
  company_name: string
  client_id: string | null
  client_assigned_to: string | null
}

// 정기 프로젝트 마스터
interface RecurringProject {
  id: string
  client_id: string | null
  account_id: string | null
  source_deal_id: string | null
  category: Category
  project_name: string | null
  monthly_amount: number | null
  payment_day: number | null
  cost_type: CostType
  assigned_to: string | null
  finance_assigned_to: string | null
  notes: string | null
  is_active: boolean
  start_month: string
  created_at: string
  updated_at: string
}

// 갱신 모달의 1행 상태 (사용자가 모달에서 편집 가능한 필드들)
type ApplyScope = "this_month" | "permanent"

interface RenewalRow {
  recurring_id: string
  account_company_name: string  // 표시용
  project_name: string
  category: Category
  cost_type: CostType
  amount: number | null
  payment_day: number | null  // 매월 며칠
  assigned_to: string | null
  finance_assigned_to: string | null
  notes: string
  // 시스템 정보
  alreadyExists: boolean       // 이번 달 이미 생성된 경우 → 비활성화
  excluded: boolean            // 이번 갱신에서 사용자가 제외(이번만/영구 둘 다 동일하게 빠짐)
  permanentlyDisabled: boolean // 영구 제외 후 토글 표시용 (모달 내 즉시 시각 피드백)
  // 변경 감지 + 적용 범위
  applyScope: ApplyScope       // "this_month" (기본) 또는 "permanent"
  // 마스터 원본값 (편집 후 비교용)
  master: {
    project_name: string
    category: Category
    cost_type: CostType
    monthly_amount: number | null
    payment_day: number | null
    assigned_to: string | null
    finance_assigned_to: string | null
    notes: string
  }
}

// 영업 담당자 옵션 (다른 폼들과 동일한 리스트)
const SALES_ASSIGNEES = ["오일환", "박상혁", "윤경호", "미정"]

// 재무 담당자 옵션 (추후 관리자 페이지에서 CRUD 예정)
const FINANCE_ASSIGNEES = ["김다예"]

// 월 비교 헬퍼: "yyyy-MM" 문자열로 정규화
const toMonthKey = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const currentMonthKey = () => toMonthKey(new Date())

const monthKeyToLabel = (key: string) => {
  const [y, m] = key.split("-")
  return `${y}년 ${Number(m)}월`
}

// 날짜 헬퍼: "yyyy-MM-dd"
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const firstDayOfCurrentMonth = () => {
  const now = new Date()
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1))
}

const lastDayOfCurrentMonth = () => {
  const now = new Date()
  return toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0))
}

const dateKeyToLabel = (key: string) => {
  const [y, m, d] = key.split("-")
  return `${y}.${Number(m)}.${Number(d)}`
}

const CATEGORIES: Category[] = ["마케팅", "홈페이지", "개발", "그 외"]
const COST_TYPES: CostType[] = ["계약금", "중도금", "완납금", "일괄 완납금", "월 대행비"]
const PROGRESS_STATUSES: ProgressStatus[] = ["작성대기", "작성필요", "작성완료"]
const INVOICE_STATUSES: InvoiceStatus[] = ["발행필요", "발행대기", "발행완료", "카드결제"]

const CATEGORY_COLORS: Record<Category, string> = {
  "마케팅": "bg-purple-50 text-purple-700 border-purple-200",
  "홈페이지": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "개발": "bg-orange-50 text-orange-700 border-orange-200",
  "그 외": "bg-gray-50 text-gray-700 border-gray-200",
}

const COST_TYPE_COLORS: Record<CostType, string> = {
  "계약금": "bg-blue-50 text-blue-700 border-blue-200",
  "중도금": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "완납금": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "일괄 완납금": "bg-teal-50 text-teal-700 border-teal-200",
  "월 대행비": "bg-amber-50 text-amber-700 border-amber-200",
}

const PROGRESS_COLORS: Record<ProgressStatus, string> = {
  "작성대기": "bg-gray-50 text-gray-700 border-gray-200",
  "작성필요": "bg-amber-50 text-amber-700 border-amber-200",
  "작성완료": "bg-green-50 text-green-700 border-green-200",
}

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  "발행필요": "bg-rose-50 text-rose-700 border-rose-200",
  "발행대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "발행완료": "bg-green-50 text-green-700 border-green-200",
  "카드결제": "bg-blue-50 text-blue-700 border-blue-200",
}

const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  "작성대기": "대기",
  "작성필요": "필요",
  "작성완료": "완료",
}

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  "발행필요": "필요",
  "발행대기": "대기",
  "발행완료": "완료",
  "카드결제": "카드",
}

const ASSIGNEE_PALETTE = [
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-violet-50 text-violet-700",
  "bg-cyan-50 text-cyan-700",
  "bg-orange-50 text-orange-700",
  "bg-teal-50 text-teal-700",
  "bg-pink-50 text-pink-700",
  "bg-indigo-50 text-indigo-700",
]
const assigneeColorCache: Record<string, string> = {}
let assigneeColorIdx = 0
const getAssigneeColor = (name: string) => {
  if (!assigneeColorCache[name]) {
    assigneeColorCache[name] = ASSIGNEE_PALETTE[assigneeColorIdx % ASSIGNEE_PALETTE.length]
    assigneeColorIdx++
  }
  return assigneeColorCache[name]
}

const formatNumber = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(n)) return ""
  return Number(n).toLocaleString("ko-KR")
}

const parseFormattedNumber = (s: string): number | null => {
  if (!s) return null
  const cleaned = s.replace(/[^0-9]/g, "")
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

const formatDateKo = (date: string | null | undefined) => {
  if (!date) return ""
  try {
    return format(new Date(date), "yyyy.MM.dd", { locale: ko })
  } catch {
    return date
  }
}

export default function ProjectSpecsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [specs, setSpecs] = useState<ProjectSpec[]>([])
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 필터
  const [filterCategory, setFilterCategory] = useState<string>("전체")
  const [filterProgress, setFilterProgress] = useState<string>("전체")
  const [filterInvoice, setFilterInvoice] = useState<string>("전체")
  const [filterAssigned, setFilterAssigned] = useState<string>("전체")
  const [filterFinanceAssigned, setFilterFinanceAssigned] = useState<string>("전체")
  const [searchQuery, setSearchQuery] = useState("")
  // 입금 예정일 기준월 필터 (yyyy-MM)
  // 기본: 시작일 = 이번 달 1일, 종료일 = 이번 달 말일
  // 날짜 기반 필터 ("yyyy-MM-dd")
  const [filterStartDate, setFilterStartDate] = useState<string | null>(firstDayOfCurrentMonth())
  const [filterEndDate, setFilterEndDate] = useState<string | null>(lastDayOfCurrentMonth())
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [endPickerOpen, setEndPickerOpen] = useState(false)

  // 행 추가 모달
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newRowAccountId, setNewRowAccountId] = useState<string>("")
  const [newRowProjectName, setNewRowProjectName] = useState("")
  const [newRowCategory, setNewRowCategory] = useState<Category>("그 외")

  // 삭제 확인
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // 인라인 amount 편집 (콤마 표시 위해 별도 상태)
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({})
  // 비고 임시 편집
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  // 프로젝트명 임시 편집
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({})

  // ───── 정기 프로젝트 갱신 ─────
  const [renewalOpen, setRenewalOpen] = useState(false)
  const [renewalLoading, setRenewalLoading] = useState(false)
  const [renewalRunning, setRenewalRunning] = useState(false)
  const [renewalTargetMonth, setRenewalTargetMonth] = useState<string>(currentMonthKey()) // yyyy-MM
  const [renewalRows, setRenewalRows] = useState<RenewalRow[]>([])
  const [renewalMonthPickerOpen, setRenewalMonthPickerOpen] = useState(false)

  // 제외 분기 다이얼로그 (이번 달만 vs 영구)
  const [excludeChoice, setExcludeChoice] = useState<{
    open: boolean
    rowIndex: number | null
  }>({ open: false, rowIndex: null })

  // 정기 마스터 캐시 (매월 갱신 안 됨 배너 계산용)
  const [activeRecurring, setActiveRecurring] = useState<RecurringProject[]>([])
  const [recurringTableMissing, setRecurringTableMissing] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setLoadError(null)
    setTableMissing(false)
    try {
      // 1. project_specs
      const { data: specsData, error: specsErr } = await supabase
        .from("project_specs")
        .select("*")
        .order("created_at", { ascending: false })

      if (specsErr) {
        // Supabase 에러 객체는 enumerable 속성이 적어 console.error로 {}로 보임 → 직접 펼치기
        const detail = {
          message: specsErr.message,
          code: (specsErr as any).code,
          details: (specsErr as any).details,
          hint: (specsErr as any).hint,
        }
        console.error("[project-specs] 로드 오류:", detail)

        // PGRST205 / 42P01 = 테이블 없음 → 마이그레이션 미적용 안내
        const isMissing =
          detail.code === "PGRST205" ||
          detail.code === "42P01" ||
          /relation .* does not exist/i.test(detail.message || "") ||
          /Could not find the table/i.test(detail.message || "")
        if (isMissing) {
          setTableMissing(true)
        } else {
          setLoadError(detail.message || JSON.stringify(detail))
        }
        setSpecs([])
        return
      }

      // 2. accounts (인포 컬럼용)
      const accountIds = Array.from(
        new Set((specsData || []).map((s: any) => s.account_id).filter(Boolean))
      )
      let accountMap: Record<string, string> = {}
      if (accountIds.length > 0) {
        const { data: accs } = await supabase
          .from("accounts")
          .select("id, company_name, brand_name")
          .in("id", accountIds)
        if (accs) {
          accountMap = accs.reduce((acc: any, a: any) => {
            const _b = (a.brand_name || "").trim()
            acc[a.id] = _b && _b !== a.company_name
              ? `${a.company_name} (${_b})`
              : a.company_name
            return acc
          }, {})
        }
      }

      // 3. clients (account → client 역매핑)
      const clientIds = Array.from(
        new Set((specsData || []).map((s: any) => s.client_id).filter(Boolean))
      )
      let clientResolveMap: Record<string, string> = {}
      if (clientIds.length > 0) {
        clientIds.forEach((cid) => {
          clientResolveMap[cid] = cid
        })
      }

      const enriched: ProjectSpec[] = (specsData || []).map((s: any) => ({
        ...s,
        account_company_name: s.account_id ? accountMap[s.account_id] || "" : "",
        client_id_resolved: s.client_id || null,
      }))

      setSpecs(enriched)

      // 4. 정기 프로젝트 마스터 (활성만)
      try {
        const { data: recurData, error: recurErr } = await supabase
          .from("recurring_projects")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        if (recurErr) {
          const code = (recurErr as any).code
          const isMissing =
            code === "PGRST205" ||
            code === "42P01" ||
            /relation .* does not exist/i.test(recurErr.message || "") ||
            /Could not find the table/i.test(recurErr.message || "")
          if (isMissing) {
            setRecurringTableMissing(true)
            setActiveRecurring([])
          } else {
            console.error("[project-specs] recurring 로드 오류:", recurErr)
            setActiveRecurring([])
          }
        } else {
          setRecurringTableMissing(false)
          setActiveRecurring((recurData as any) || [])
        }
      } catch (e) {
        console.error("[project-specs] recurring 로드 예외:", e)
        setActiveRecurring([])
      }

      // 5. 행 추가용 거래처 옵션 로드 (client의 영업 담당자도 함께)
      const { data: clientList } = await supabase
        .from("clients")
        .select("id, account_id, assigned_to, account:accounts!account_id(id, company_name, brand_name)")
        .order("created_at", { ascending: false })
      if (clientList) {
        const opts: AccountOption[] = (clientList as any[])
          .filter((c) => c.account?.company_name)
          .map((c) => {
            const _b = (c.account.brand_name || "").trim()
            const _label = _b && _b !== c.account.company_name
              ? `${c.account.company_name} (${_b})`
              : c.account.company_name
            return {
              id: c.account.id,
              company_name: _label,
              client_id: c.id,
              client_assigned_to: c.assigned_to || null,
            }
          })
        // 중복 제거 (같은 account_id가 여러 client에 있을 수 있으나 그대로 가장 최근 것 유지)
        const seen = new Set<string>()
        const dedup = opts.filter((o) => {
          if (seen.has(o.id)) return false
          seen.add(o.id)
          return true
        })
        setAccountOptions(dedup)
      }
    } finally {
      setLoading(false)
    }
  }

  // ──────────────────────────────────────────────────────────
  // 필터 / 검색
  // ──────────────────────────────────────────────────────────
  const assignedToOptions = useMemo(() => {
    const set = new Set<string>(SALES_ASSIGNEES)
    specs.forEach((s) => s.assigned_to && set.add(s.assigned_to))
    return Array.from(set).sort()
  }, [specs])

  const financeAssignedToOptions = useMemo(() => {
    const set = new Set<string>(FINANCE_ASSIGNEES)
    specs.forEach((s) => s.finance_assigned_to && set.add(s.finance_assigned_to))
    return Array.from(set).sort()
  }, [specs])

  const filteredSpecs = useMemo(() => {
    return specs.filter((s) => {
      if (filterCategory !== "전체" && s.category !== filterCategory) return false
      if (filterProgress !== "전체" && s.progress_status !== filterProgress) return false
      if (filterInvoice !== "전체" && s.invoice_status !== filterInvoice) return false
      if (filterAssigned !== "전체" && (s.assigned_to || "") !== filterAssigned) return false
      if (
        filterFinanceAssigned !== "전체" &&
        (s.finance_assigned_to || "") !== filterFinanceAssigned
      )
        return false

      // 날짜 범위 필터: 입금 예정일이 있는 행만 비교 (없으면 항상 표시 — 새 행 등 작성 중 항목 보호)
      if (s.payment_due_date) {
        const itemDate = s.payment_due_date
        if (filterStartDate && itemDate < filterStartDate) return false
        if (filterEndDate && itemDate > filterEndDate) return false
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const inName = (s.project_name || "").toLowerCase().includes(q)
        const inAccount = (s.account_company_name || "").toLowerCase().includes(q)
        if (!inName && !inAccount) return false
      }
      return true
    })
  }, [
    specs,
    filterCategory,
    filterProgress,
    filterInvoice,
    filterAssigned,
    filterFinanceAssigned,
    filterStartDate,
    filterEndDate,
    searchQuery,
  ])

  // ──────────────────────────────────────────────────────────
  // 인라인 업데이트
  // ──────────────────────────────────────────────────────────
  const updateField = async (id: string, patch: Partial<ProjectSpec>) => {
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    const { error } = await supabase.from("project_specs").update(patch).eq("id", id)
    if (error) {
      console.error("[project-specs] 업데이트 실패:", error)
      alert(`업데이트 실패: ${error.message}`)
      // 실패 시 재로드
      loadAll()
    }
  }

  const handleAmountBlur = async (id: string) => {
    const draft = amountDraft[id]
    if (draft === undefined) return
    const amount = parseFormattedNumber(draft)
    setAmountDraft((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    await updateField(id, { amount })
  }

  const handleNotesBlur = async (id: string) => {
    const draft = notesDraft[id]
    if (draft === undefined) return
    setNotesDraft((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    await updateField(id, { notes: draft })
  }

  const handleNameBlur = async (id: string) => {
    const draft = nameDraft[id]
    if (draft === undefined) return
    setNameDraft((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    await updateField(id, { project_name: draft })
  }

  // ──────────────────────────────────────────────────────────
  // 정기 프로젝트 갱신
  // ──────────────────────────────────────────────────────────

  // 매월 입금 예정일 계산: 그 달에 해당 일자가 없으면 말일로 보정
  const buildMonthlyDueDate = (monthKey: string, day: number | null): string | null => {
    if (!day) return null
    const [yStr, mStr] = monthKey.split("-")
    const y = Number(yStr)
    const m = Number(mStr)
    if (!y || !m) return null
    const lastDay = new Date(y, m, 0).getDate()
    const safeDay = Math.min(Math.max(1, day), lastDay)
    return `${y}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
  }

  // 갱신 모달 열기 — 활성 마스터 로드 + 직전 달 행 데이터로 prefill
  const openRenewalModal = async (targetMonth: string = currentMonthKey()) => {
    if (recurringTableMissing) {
      alert(
        "정기 프로젝트 기능이 활성화되지 않았습니다.\nSupabase SQL Editor에서 scripts/047_recurring_projects.sql 을 실행해주세요."
      )
      return
    }
    setRenewalTargetMonth(targetMonth)
    setRenewalOpen(true)
    setRenewalLoading(true)
    try {
      // 1) 활성 마스터 로드 + 거래처명 조인
      const accountIds = Array.from(new Set(activeRecurring.map((r) => r.account_id).filter(Boolean))) as string[]
      let accNameMap: Record<string, string> = {}
      if (accountIds.length > 0) {
        const { data: accs } = await supabase
          .from("accounts")
          .select("id, company_name, brand_name")
          .in("id", accountIds)
        if (accs) {
          accNameMap = (accs as any[]).reduce((acc, a) => {
            const _b = (a.brand_name || "").trim()
            acc[a.id] = _b && _b !== a.company_name ? `${a.company_name} (${_b})` : a.company_name
            return acc
          }, {} as Record<string, string>)
        }
      }

      // 2) 이번 달에 이미 생성된 행 찾기 (중복 방지)
      const recurringIds = activeRecurring.map((r) => r.id)
      let existingMap: Record<string, ProjectSpec> = {}
      if (recurringIds.length > 0) {
        const { data: existRows } = await supabase
          .from("project_specs")
          .select("*")
          .in("recurring_project_id", recurringIds)
          .eq("spec_month", targetMonth)
        if (existRows) {
          existRows.forEach((r: any) => {
            existingMap[r.recurring_project_id] = r as ProjectSpec
          })
        }
      }

      // 3) RenewalRow 빌드 — 항상 마스터 값 기준으로 prefill
      // "영구 변경"은 마스터를 업데이트하므로 마스터가 항상 최신 정보.
      // "이번 달만" 변경은 행 레벨에만 반영되고 마스터는 그대로이므로
      // 다음 달 갱신 시 마스터의 원래 값이 자연스럽게 나옴.
      const rows: RenewalRow[] = activeRecurring.map((m) => {
        const projectName = m.project_name ?? ""
        const category = (m.category ?? "그 외") as Category
        const costType = (m.cost_type ?? "월 대행비") as CostType
        const amount = m.monthly_amount ?? null
        const paymentDay = m.payment_day ?? null
        const assignedTo = m.assigned_to ?? null
        const financeAssignedTo = m.finance_assigned_to ?? null
        const notes = m.notes ?? ""

        return {
          recurring_id: m.id,
          account_company_name: m.account_id ? accNameMap[m.account_id] || "" : "",
          project_name: projectName,
          category,
          cost_type: costType,
          amount,
          payment_day: paymentDay,
          assigned_to: assignedTo,
          finance_assigned_to: financeAssignedTo,
          notes,
          alreadyExists: !!existingMap[m.id],
          excluded: !!existingMap[m.id],
          permanentlyDisabled: false,
          applyScope: "this_month" as ApplyScope,
          master: {
            project_name: m.project_name ?? "",
            category: (m.category ?? "그 외") as Category,
            cost_type: (m.cost_type ?? "월 대행비") as CostType,
            monthly_amount: m.monthly_amount ?? null,
            payment_day: m.payment_day ?? null,
            assigned_to: m.assigned_to ?? null,
            finance_assigned_to: m.finance_assigned_to ?? null,
            notes: m.notes ?? "",
          },
        }
      })

      setRenewalRows(rows)
    } catch (e: any) {
      console.error("[renewal] 모달 로드 실패:", e)
      alert(`갱신 후보 로드 실패: ${e?.message || e}`)
    } finally {
      setRenewalLoading(false)
    }
  }

  // 행이 마스터 대비 변경되었는지 감지
  const isRowChanged = (r: RenewalRow): boolean => {
    return (
      r.project_name !== r.master.project_name ||
      r.category !== r.master.category ||
      r.cost_type !== r.master.cost_type ||
      r.amount !== r.master.monthly_amount ||
      r.payment_day !== r.master.payment_day ||
      r.assigned_to !== r.master.assigned_to ||
      r.finance_assigned_to !== r.master.finance_assigned_to
    )
  }

  // 갱신 실행 — 체크된 행만 그 달치 project_specs로 일괄 생성
  // "영구" 행은 마스터도 업데이트
  const runRenewal = async () => {
    const toCreate = renewalRows.filter((r) => !r.excluded && !r.alreadyExists)
    if (toCreate.length === 0) {
      toast.info("생성할 정기 프로젝트가 없습니다.")
      return
    }
    setRenewalRunning(true)
    try {
      const targetMonth = renewalTargetMonth
      const masters = activeRecurring.reduce((acc, m) => {
        acc[m.id] = m
        return acc
      }, {} as Record<string, RecurringProject>)

      // 1) "영구 변경" 행의 마스터 업데이트
      const permanentRows = toCreate.filter(
        (r) => r.applyScope === "permanent" && isRowChanged(r)
      )
      for (const r of permanentRows) {
        const { error } = await supabase
          .from("recurring_projects")
          .update({
            project_name: r.project_name,
            category: r.category,
            cost_type: r.cost_type,
            monthly_amount: r.amount,
            payment_day: r.payment_day,
            assigned_to: r.assigned_to,
            finance_assigned_to: r.finance_assigned_to,
          })
          .eq("id", r.recurring_id)
        if (error) {
          console.error("[renewal] 마스터 업데이트 실패:", error)
          toast.error(`마스터 업데이트 실패 (${r.project_name}): ${error.message}`)
        }
      }

      // 2) project_specs 행 일괄 생성
      const inserts = toCreate.map((r) => {
        const m = masters[r.recurring_id]
        return {
          client_id: m?.client_id || null,
          account_id: m?.account_id || null,
          linked_contract_id: null,
          linked_deal_id: m?.source_deal_id || null,
          recurring_project_id: r.recurring_id,
          spec_month: targetMonth,
          category: r.category,
          project_name: r.project_name,
          cost_type: r.cost_type,
          amount: r.amount,
          payment_due_date: buildMonthlyDueDate(targetMonth, r.payment_day),
          progress_status: "작성필요",
          invoice_status: "발행필요",
          invoice_issue_date: null,
          notes: `자동 생성: 정기 ${monthKeyToLabel(targetMonth)}`,
          assigned_to: r.assigned_to,
          finance_assigned_to: r.finance_assigned_to,
        }
      })

      const { error } = await supabase.from("project_specs").insert(inserts)
      if (error) {
        console.error("[renewal] 생성 실패:", error)
        toast.error(`갱신 실패: ${error.message}`)
        return
      }

      const permCount = permanentRows.length
      const msg = permCount > 0
        ? `${monthKeyToLabel(targetMonth)} 정기 프로젝트 ${inserts.length}건 생성 (${permCount}건 영구 변경 반영)`
        : `${monthKeyToLabel(targetMonth)} 정기 프로젝트 ${inserts.length}건 생성 완료`
      toast.success(msg)
      setRenewalOpen(false)
      await loadAll()
    } finally {
      setRenewalRunning(false)
    }
  }

  // [×] 제외 버튼 — 분기 다이얼로그 오픈
  const onRequestExclude = (rowIndex: number) => {
    setExcludeChoice({ open: true, rowIndex })
  }

  // 이번 달만 건너뛰기 — 그 행만 excluded=true (DB 변경 없음)
  const applyExcludeThisMonth = () => {
    const { rowIndex } = excludeChoice
    if (rowIndex === null) {
      setExcludeChoice({ open: false, rowIndex: null })
      return
    }
    setRenewalRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, excluded: true } : r))
    )
    toast.success("이번 달은 이 정기 프로젝트를 건너뛸게요")
    setExcludeChoice({ open: false, rowIndex: null })
  }

  // 영구 제외 — 마스터 is_active=false
  const applyExcludePermanent = async () => {
    const { rowIndex } = excludeChoice
    if (rowIndex === null) {
      setExcludeChoice({ open: false, rowIndex: null })
      return
    }
    const row = renewalRows[rowIndex]
    if (!row) {
      setExcludeChoice({ open: false, rowIndex: null })
      return
    }
    const { error } = await supabase
      .from("recurring_projects")
      .update({ is_active: false })
      .eq("id", row.recurring_id)
    if (error) {
      toast.error(`영구 제외 실패: ${error.message}`)
    } else {
      setActiveRecurring((prev) => prev.filter((m) => m.id !== row.recurring_id))
      setRenewalRows((prev) =>
        prev.map((r, i) =>
          i === rowIndex ? { ...r, excluded: true, permanentlyDisabled: true } : r
        )
      )
      toast.success("정기 프로젝트 목록에서 영구 제외되었어요")
    }
    setExcludeChoice({ open: false, rowIndex: null })
  }

  // 이번 달이 갱신되었는지 (배너 표시 판단용)
  const renewalDoneThisMonth = useMemo(() => {
    const cur = currentMonthKey()
    if (activeRecurring.length === 0) return true
    // 모든 활성 마스터가 이번 달 행을 가지고 있으면 done
    const activeIds = new Set(activeRecurring.map((m) => m.id))
    const generatedIds = new Set(
      specs
        .filter((s) => s.recurring_project_id && s.spec_month === cur)
        .map((s) => s.recurring_project_id as string)
    )
    for (const id of activeIds) {
      if (!generatedIds.has(id)) return false
    }
    return true
  }, [activeRecurring, specs])

  const handleAddRow = async () => {
    if (!newRowAccountId) {
      alert("거래처를 선택해주세요.")
      return
    }
    const acc = accountOptions.find((a) => a.id === newRowAccountId)
    if (!acc) return

    const { data, error } = await supabase
      .from("project_specs")
      .insert({
        client_id: acc.client_id,
        account_id: acc.id,
        category: newRowCategory,
        project_name: newRowProjectName || acc.company_name,
        cost_type: "일괄 완납금",
        amount: null,
        progress_status: "작성필요",
        invoice_status: "발행필요",
        notes: null,
        // 인포(client)의 영업 담당자를 기본 적용 — 사용자는 표에서 변경 가능
        assigned_to: acc.client_assigned_to || null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("[project-specs] 추가 실패:", error)
      alert(`추가 실패: ${error.message}`)
      return
    }

    setSpecs((prev) => [
      {
        ...(data as any),
        account_company_name: acc.company_name,
        client_id_resolved: acc.client_id,
      },
      ...prev,
    ])
    setShowAddDialog(false)
    setNewRowAccountId("")
    setNewRowProjectName("")
    setNewRowCategory("그 외")
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("project_specs").delete().eq("id", id)
    if (error) {
      alert(`삭제 실패: ${error.message}`)
      return
    }
    setSpecs((prev) => prev.filter((s) => s.id !== id))
    setPendingDeleteId(null)
  }

  // ──────────────────────────────────────────────────────────
  // 요약 카드
  // ──────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    return { total: specs.length }
  }, [specs])

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CrmHeader />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="text-center text-muted-foreground py-20">로딩 중...</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />

        <main className="flex-1 overflow-y-auto p-2 xl:p-6">
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="h-8 w-8" />
                프로젝트 명세서 요청서
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                S5 계약완료 시점에 자동 생성됩니다. 비용 종류별로 행이 분리되며, 모든 항목을 수동으로 수정할 수 있어요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => openRenewalModal(currentMonthKey())}
                className="gap-2"
                disabled={recurringTableMissing}
                title={recurringTableMissing ? "scripts/047_recurring_projects.sql 적용이 필요합니다" : ""}
              >
                <Repeat className="h-4 w-4" />
                정기 프로젝트 갱신
              </Button>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                행 추가
              </Button>
            </div>
          </div>

          {/* 갱신 미실행 배너 (Q4) */}
          {!renewalDoneThisMonth && !recurringTableMissing && activeRecurring.length > 0 && (
            <Card className="p-3 mb-4 border-amber-300 bg-amber-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-700 shrink-0" />
                <p className="text-sm text-amber-900 flex-1">
                  <span className="font-semibold">{monthKeyToLabel(currentMonthKey())}</span>{" "}
                  정기 프로젝트 갱신이 아직 진행되지 않았습니다.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-amber-400 text-amber-900 hover:bg-amber-100"
                  onClick={() => openRenewalModal(currentMonthKey())}
                >
                  <Repeat className="h-3.5 w-3.5 mr-1.5" />
                  지금 갱신
                </Button>
              </div>
            </Card>
          )}

          {/* DB 마이그레이션 미적용 안내 */}
          {tableMissing && (
            <Card className="p-4 mb-6 border-amber-300 bg-amber-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-amber-700" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">
                    DB 마이그레이션이 아직 적용되지 않았어요
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    Supabase SQL Editor에서{" "}
                    <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">
                      scripts/043_project_specs.sql
                    </code>,{" "}
                    <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">
                      scripts/044_account_business_fields.sql
                    </code>,{" "}
                    <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">
                      scripts/045_account_brand_name.sql
                    </code>,{" "}
                    <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">
                      scripts/046_project_specs_finance_assignee.sql
                    </code>,{" "}
                    <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">
                      scripts/047_recurring_projects.sql
                    </code>{" "}
                    을 순서대로 실행한 뒤 새로고침 해주세요.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadAll()}>
                  다시 시도
                </Button>
              </div>
            </Card>
          )}

          {/* 일반 로드 에러 */}
          {loadError && !tableMissing && (
            <Card className="p-4 mb-6 border-rose-300 bg-rose-50">
              <p className="text-sm font-semibold text-rose-900">데이터 로드 실패</p>
              <p className="text-xs text-rose-800 mt-1 font-mono">{loadError}</p>
            </Card>
          )}

          {/* 요약 + 필터 한 줄 통합 */}
          <Card className="p-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* 좌측: 요약 (전체만) */}
              <div className="flex items-center text-xs pr-3 border-r border-border/60">
                <span className="px-2 py-1 rounded-md bg-muted/60 text-foreground/80">
                  전체 <span className="font-semibold ml-0.5">{summary.total}</span>
                </span>
              </div>

              {/* 우측: 필터 + 검색 */}
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">카테고리 전체</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterProgress} onValueChange={setFilterProgress}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">진행상황 전체</SelectItem>
                  {PROGRESS_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROGRESS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterInvoice} onValueChange={setFilterInvoice}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">계산서 전체</SelectItem>
                  {INVOICE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {INVOICE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">담당자 전체</SelectItem>
                  {assignedToOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterFinanceAssigned} onValueChange={setFilterFinanceAssigned}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">재무 담당자 전체</SelectItem>
                  {financeAssignedToOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 입금 예정일 기준 시작일 */}
              <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs gap-1.5 min-w-[120px] justify-start",
                      filterStartDate && "border-primary/40"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 shrink-0" />
                    {filterStartDate ? dateKeyToLabel(filterStartDate) : "시작일"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterStartDate ? new Date(filterStartDate + "T00:00:00") : undefined}
                    onSelect={(d) => {
                      if (d) {
                        const newStart = toDateKey(d)
                        setFilterStartDate(newStart)
                        if (filterEndDate && newStart > filterEndDate) {
                          setFilterEndDate(null)
                        }
                      }
                      setStartPickerOpen(false)
                    }}
                    defaultMonth={
                      filterStartDate ? new Date(filterStartDate + "T00:00:00") : new Date()
                    }
                  />
                  <div className="border-t p-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setFilterStartDate(null)
                        setStartPickerOpen(false)
                      }}
                    >
                      시작일 지우기
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">~</span>

              {/* 입금 예정일 기준 종료일 */}
              <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs gap-1.5 min-w-[120px] justify-start",
                      filterEndDate && "border-primary/40",
                      !filterEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 shrink-0" />
                    {filterEndDate ? dateKeyToLabel(filterEndDate) : "종료일 (없음)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterEndDate ? new Date(filterEndDate + "T00:00:00") : undefined}
                    onSelect={(d) => {
                      if (d) {
                        const newEnd = toDateKey(d)
                        if (filterStartDate && newEnd < filterStartDate) {
                          setFilterStartDate(newEnd)
                        }
                        setFilterEndDate(newEnd)
                      }
                      setEndPickerOpen(false)
                    }}
                    defaultMonth={
                      filterEndDate
                        ? new Date(filterEndDate + "T00:00:00")
                        : filterStartDate
                          ? new Date(filterStartDate + "T00:00:00")
                          : new Date()
                    }
                  />
                  <div className="border-t p-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground pl-1">
                      비우면 상한 없음
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setFilterEndDate(null)
                        setEndPickerOpen(false)
                      }}
                    >
                      종료일 지우기
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {(filterStartDate || filterEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setFilterStartDate(firstDayOfCurrentMonth())
                    setFilterEndDate(lastDayOfCurrentMonth())
                  }}
                >
                  기본값
                </Button>
              )}

              <div className="relative flex-1 max-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색..."
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredSpecs.length} / {specs.length}
              </span>
            </div>
          </Card>

          {/* 테이블 */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              {/*
                Select 드롭다운 셀 일괄 스타일링:
                - 화살표 아이콘 숨김 + 그 자리 gap/padding 제거 → 공간 절약
                - hover 시 살짝 떠보이는 효과 (ring + 그림자) → 클릭 가능 인지
                - 열렸을 때(state=open) 더 두드러진 ring + 그림자 → 활성 상태 표시
                - focus-visible은 제거 (선택 후 트리거가 포커스를 받아 보라색 링이 남아있는 현상 방지)
                - SelectTrigger 내용물(SelectValue)은 가운데 정렬
              */}
              <Table
                className={cn(
                  "text-xs",
                  // 화살표/gap 제거
                  "[&_[data-slot=select-trigger]>svg]:hidden",
                  "[&_[data-slot=select-trigger]]:!gap-0",
                  "[&_[data-slot=select-trigger]]:!pr-2",
                  // SelectTrigger 자체를 셀 가운데로 (w-fit이라 mx-auto로 중앙 정렬)
                  "[&_[data-slot=select-trigger]]:!mx-auto",
                  // SelectTrigger 내부 내용도 가운데 정렬 (justify-between 덮어쓰기)
                  "[&_[data-slot=select-trigger]]:!justify-center",
                  "[&_[data-slot=select-trigger]]:text-center",
                  "[&_[data-slot=select-trigger]_[data-slot=select-value]]:!justify-center",
                  // 기본 포커스 링 제거 (선택 후 잔상 방지)
                  "[&_[data-slot=select-trigger]]:focus-visible:!ring-0",
                  "[&_[data-slot=select-trigger]]:focus-visible:!ring-offset-0",
                  "[&_[data-slot=select-trigger]]:focus-visible:!border-transparent",
                  // 인터랙션 피드백
                  "[&_[data-slot=select-trigger]]:transition-all",
                  "[&_[data-slot=select-trigger]]:cursor-pointer",
                  "[&_[data-slot=select-trigger]:hover]:brightness-95",
                  "[&_[data-slot=select-trigger]:hover]:ring-1",
                  "[&_[data-slot=select-trigger]:hover]:ring-foreground/20",
                  "[&_[data-slot=select-trigger]:hover]:shadow-sm",
                  // 열렸을 때 (드롭다운 펼쳐진 상태)
                  "[&_[data-slot=select-trigger][data-state=open]]:ring-2",
                  "[&_[data-slot=select-trigger][data-state=open]]:ring-primary/50",
                  "[&_[data-slot=select-trigger][data-state=open]]:shadow-md",
                  "[&_[data-slot=select-trigger][data-state=open]]:brightness-95",
                )}
              >
                <TableHeader>
                  <TableRow className="bg-muted/40 [&>th]:text-center">
                    <TableHead className="w-[40px]">순번</TableHead>
                    <TableHead className="w-[70px]">소속월</TableHead>
                    <TableHead className="w-[80px]">카테고리</TableHead>
                    <TableHead className="w-[220px] min-w-[220px]">프로젝트명</TableHead>
                    <TableHead className="w-[160px]">인포 (거래처)</TableHead>
                    <TableHead className="w-[70px]">담당자</TableHead>
                    <TableHead className="w-[100px]">비용 종류</TableHead>
                    <TableHead className="w-[140px]">금액 (VAT 별도)</TableHead>
                    <TableHead className="w-[130px]">입금 예정일</TableHead>
                    <TableHead className="w-[80px]">진행상황</TableHead>
                    <TableHead className="w-[130px]">계산서 발행일</TableHead>
                    <TableHead className="w-[80px]">계산서</TableHead>
                    <TableHead className="w-[70px]">재무 담당자</TableHead>
                    <TableHead className="w-[80px]">비고</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpecs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                        명세서 행이 없습니다. S5 계약완료 시 자동 생성되거나, [행 추가] 버튼으로 추가할 수 있어요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSpecs.map((spec, idx) => {
                      const amountValue =
                        amountDraft[spec.id] !== undefined
                          ? amountDraft[spec.id]
                          : formatNumber(spec.amount)
                      const nameValue =
                        nameDraft[spec.id] !== undefined ? nameDraft[spec.id] : spec.project_name || ""
                      return (
                        <TableRow key={spec.id} className="hover:bg-muted/20">
                          <TableCell className="text-center text-muted-foreground">
                            {idx + 1}
                          </TableCell>

                          {/* 소속월 */}
                          <TableCell className="text-center">
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {(() => {
                                const src = spec.spec_month
                                  || (spec.payment_due_date ? spec.payment_due_date.slice(0, 7) : null)
                                  || spec.created_at.slice(0, 7)
                                const [y, m] = src.split("-")
                                return `${y.slice(2)}년 ${Number(m)}월`
                              })()}
                            </span>
                          </TableCell>

                          {/* 카테고리 */}
                          <TableCell>
                            <Select
                              value={spec.category}
                              onValueChange={(v) => updateField(spec.id, { category: v as Category })}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-xs border-0 focus:ring-1",
                                  CATEGORY_COLORS[spec.category]
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs">
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* 프로젝트명 */}
                          <TableCell>
                            <Input
                              value={nameValue}
                              onChange={(e) =>
                                setNameDraft((prev) => ({ ...prev, [spec.id]: e.target.value }))
                              }
                              onBlur={() => handleNameBlur(spec.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                              }}
                              placeholder="프로젝트명"
                              className="h-7 text-xs"
                            />
                          </TableCell>

                          {/* 인포 (거래처) */}
                          <TableCell className="text-center">
                            {spec.account_company_name ? (
                              spec.client_id_resolved ? (
                                <Link
                                  href={`/clients/${spec.client_id_resolved}?tab=info`}
                                  className="text-gray-700 hover:text-gray-900 hover:underline inline-flex items-center gap-1"
                                >
                                  {spec.account_company_name}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span className="text-gray-700">{spec.account_company_name}</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* 담당자 (영업) */}
                          <TableCell>
                            <Select
                              value={spec.assigned_to || "__none__"}
                              onValueChange={(v) =>
                                updateField(spec.id, {
                                  assigned_to: v === "__none__" ? null : v,
                                })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-xs border-0 focus:ring-1 px-2",
                                  spec.assigned_to
                                    ? getAssigneeColor(spec.assigned_to)
                                    : "bg-muted/40 text-muted-foreground"
                                )}
                              >
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                                  미지정
                                </SelectItem>
                                {assignedToOptions.map((a) => (
                                  <SelectItem key={a} value={a} className="text-xs">
                                    {a}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* 비용 종류 */}
                          <TableCell>
                            <Select
                              value={spec.cost_type}
                              onValueChange={(v) => updateField(spec.id, { cost_type: v as CostType })}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-xs border-0",
                                  COST_TYPE_COLORS[spec.cost_type]
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COST_TYPES.map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs">
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* 금액 */}
                          <TableCell className="text-right">
                            <Input
                              value={amountValue}
                              onChange={(e) => {
                                const raw = e.target.value
                                const num = parseFormattedNumber(raw)
                                setAmountDraft((prev) => ({
                                  ...prev,
                                  [spec.id]: num != null ? num.toLocaleString("ko-KR") : raw,
                                }))
                              }}
                              onBlur={() => handleAmountBlur(spec.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                              }}
                              placeholder="0"
                              className="h-7 text-xs text-right font-mono"
                            />
                          </TableCell>

                          {/* 입금 예정일 */}
                          <TableCell>
                            <DateCell
                              value={spec.payment_due_date}
                              onChange={(v) => updateField(spec.id, { payment_due_date: v })}
                            />
                          </TableCell>

                          {/* 진행상황 */}
                          <TableCell>
                            <Select
                              value={spec.progress_status}
                              onValueChange={(v) =>
                                updateField(spec.id, { progress_status: v as ProgressStatus })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-xs border-0",
                                  PROGRESS_COLORS[spec.progress_status]
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROGRESS_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {PROGRESS_LABELS[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* 계산서 발행일 */}
                          <TableCell>
                            <DateCell
                              value={spec.invoice_issue_date}
                              onChange={(v) => updateField(spec.id, { invoice_issue_date: v })}
                            />
                          </TableCell>

                          {/* 계산서 */}
                          <TableCell>
                            <Select
                              value={spec.invoice_status}
                              onValueChange={(v) =>
                                updateField(spec.id, { invoice_status: v as InvoiceStatus })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-xs border-0",
                                  INVOICE_COLORS[spec.invoice_status]
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INVOICE_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {INVOICE_LABELS[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* 재무 담당자 */}
                          <TableCell>
                            <Select
                              value={spec.finance_assigned_to || "__none__"}
                              onValueChange={(v) =>
                                updateField(spec.id, {
                                  finance_assigned_to: v === "__none__" ? null : v,
                                })
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-xs border-0 focus:ring-1 px-2",
                                  spec.finance_assigned_to
                                    ? getAssigneeColor(spec.finance_assigned_to)
                                    : "bg-muted/40 text-muted-foreground"
                                )}
                              >
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                                  미지정
                                </SelectItem>
                                {financeAssignedToOptions.map((a) => (
                                  <SelectItem key={a} value={a} className="text-xs">
                                    {a}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* 비고 (메모장) */}
                          <TableCell className="text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-7 w-full justify-center px-2 text-xs font-semibold",
                                    spec.notes ? "text-red-500 hover:text-red-600" : "text-gray-300 hover:text-gray-400"
                                  )}
                                >
                                  <StickyNote className="h-3.5 w-3.5 mr-0.5" />
                                  {spec.notes ? "O" : "X"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3" align="end">
                                <p className="text-xs font-medium mb-2">비고</p>
                                <Textarea
                                  value={
                                    notesDraft[spec.id] !== undefined
                                      ? notesDraft[spec.id]
                                      : spec.notes || ""
                                  }
                                  onChange={(e) =>
                                    setNotesDraft((prev) => ({
                                      ...prev,
                                      [spec.id]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => handleNotesBlur(spec.id)}
                                  rows={4}
                                  placeholder="메모를 입력하세요..."
                                  className="text-xs"
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>

                          {/* 삭제 */}
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setPendingDeleteId(spec.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>

      {/* 행 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>프로젝트 명세서 행 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">거래처 *</label>
              <SearchableSelect
                value={newRowAccountId}
                onValueChange={setNewRowAccountId}
                options={accountOptions.map((a) => ({ value: a.id, label: a.company_name }))}
                placeholder="거래처를 검색하세요"
                searchPlaceholder="거래처 이름 검색"
                emptyText="결과 없음"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">프로젝트명</label>
              <Input
                value={newRowProjectName}
                onChange={(e) => setNewRowProjectName(e.target.value)}
                placeholder="비워두면 거래처명으로 자동 입력"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">카테고리</label>
              <Select value={newRowCategory} onValueChange={(v) => setNewRowCategory(v as Category)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddRow}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 명세서 행을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──────────────────────────────────────────────────── */}
      {/* 정기 프로젝트 갱신 모달                                */}
      {/* ──────────────────────────────────────────────────── */}
      <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
        <DialogContent className="!max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-amber-600" />
                정기 프로젝트 갱신
              </DialogTitle>
              {/* 대상 월 변경 */}
              <Popover open={renewalMonthPickerOpen} onOpenChange={setRenewalMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 mr-8">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold">{monthKeyToLabel(renewalTargetMonth)}</span>
                    <span className="text-xs text-muted-foreground">분 생성</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={new Date(`${renewalTargetMonth}-01`)}
                    onSelect={(d) => {
                      if (d) {
                        const next = toMonthKey(d)
                        setRenewalMonthPickerOpen(false)
                        openRenewalModal(next)
                      }
                    }}
                    defaultMonth={new Date(`${renewalTargetMonth}-01`)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              정기 마스터 기본값이 채워져 있습니다.
              값을 수정하면 우측에 <span className="text-blue-600 font-medium">이번만</span>/<span className="text-amber-600 font-medium">영구</span> 토글이 나타나요.
              클릭하여 전환할 수 있습니다.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {renewalLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
            ) : renewalRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                활성 정기 프로젝트가 없습니다. <br />
                S5 계약완료 모달에서 [정기 프로젝트] 옵션을 체크하면 여기에 등록돼요.
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="[&>th]:text-center [&>th]:text-xs">
                    <TableHead className="w-[40px]">포함</TableHead>
                    <TableHead className="w-[180px] text-left">거래처</TableHead>
                    <TableHead className="w-[200px] text-left">프로젝트명</TableHead>
                    <TableHead className="w-[90px]">카테고리</TableHead>
                    <TableHead className="w-[130px]">금액 (VAT 별도)</TableHead>
                    <TableHead className="w-[80px]">매월 입금일</TableHead>
                    <TableHead className="w-[90px]">담당자</TableHead>
                    <TableHead className="w-[100px]">재무 담당자</TableHead>
                    <TableHead className="w-[90px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewalRows.map((row, idx) => {
                    const disabled = row.alreadyExists || row.permanentlyDisabled || row.excluded
                    const draftAmountKey = `__renewal_${idx}`
                    const amountStr =
                      amountDraft[draftAmountKey] !== undefined
                        ? amountDraft[draftAmountKey]
                        : formatNumber(row.amount)
                    return (
                      <TableRow
                        key={row.recurring_id}
                        className={cn(
                          row.alreadyExists && "opacity-50",
                          row.permanentlyDisabled && "opacity-40 line-through",
                          row.excluded && !row.permanentlyDisabled && !row.alreadyExists && "bg-muted/40"
                        )}
                      >
                        <TableCell className="text-center">
                          {row.alreadyExists ? (
                            <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                              생성됨
                            </Badge>
                          ) : row.permanentlyDisabled ? (
                            <Badge variant="outline" className="text-[10px] h-5 bg-rose-50 text-rose-700 border-rose-200">
                              영구 제외
                            </Badge>
                          ) : (
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-primary"
                              checked={!row.excluded}
                              onChange={(e) =>
                                setRenewalRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, excluded: !e.target.checked } : r
                                  )
                                )
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.account_company_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={disabled}
                            className="h-7 text-xs"
                            value={row.project_name}
                            onChange={(e) =>
                              setRenewalRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, project_name: e.target.value } : r
                                )
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={disabled}
                            value={row.category}
                            onValueChange={(v) =>
                              setRenewalRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, category: v as Category } : r
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={disabled}
                            className="h-7 text-xs text-right"
                            value={amountStr}
                            onChange={(e) => {
                              setAmountDraft((prev) => ({ ...prev, [draftAmountKey]: e.target.value }))
                            }}
                            onBlur={() => {
                              const v = amountDraft[draftAmountKey]
                              if (v === undefined) return
                              const parsed = parseFormattedNumber(v)
                              setAmountDraft((prev) => {
                                const next = { ...prev }
                                delete next[draftAmountKey]
                                return next
                              })
                              setRenewalRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, amount: parsed } : r
                                )
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={disabled}
                            type="number"
                            min={1}
                            max={31}
                            className="h-7 text-xs text-center"
                            value={row.payment_day ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value
                              const n = raw ? Math.min(31, Math.max(1, parseInt(raw) || 0)) : null
                              setRenewalRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, payment_day: n } : r
                                )
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={disabled}
                            value={row.assigned_to || "__none__"}
                            onValueChange={(v) =>
                              setRenewalRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, assigned_to: v === "__none__" ? null : v } : r
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">미지정</SelectItem>
                              {assignedToOptions.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={disabled}
                            value={row.finance_assigned_to || "__none__"}
                            onValueChange={(v) =>
                              setRenewalRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, finance_assigned_to: v === "__none__" ? null : v } : r
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">미지정</SelectItem>
                              {financeAssignedToOptions.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* 변경 감지 → [이번 달만 / 영구] 토글 배지 + [×] 제외 */}
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            {isRowChanged(row) && !disabled && (
                              <button
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap transition-colors cursor-pointer",
                                  row.applyScope === "this_month"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                )}
                                onClick={() =>
                                  setRenewalRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            applyScope:
                                              r.applyScope === "this_month"
                                                ? "permanent"
                                                : "this_month",
                                          }
                                        : r
                                    )
                                  )
                                }
                                title="클릭하여 전환: 이번 달만 ↔ 영구 변경"
                              >
                                {row.applyScope === "this_month" ? "이번만" : "영구"}
                              </button>
                            )}
                            {!row.alreadyExists && !row.permanentlyDisabled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => onRequestExclude(idx)}
                                title="이 정기 프로젝트 제외"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                생성 예정:{" "}
                <span className="font-semibold text-foreground">
                  {renewalRows.filter((r) => !r.excluded && !r.alreadyExists).length}
                </span>
                건 / 전체 {renewalRows.length}건
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRenewalOpen(false)} disabled={renewalRunning}>
                  취소
                </Button>
                <Button
                  onClick={runRenewal}
                  disabled={
                    renewalRunning ||
                    renewalLoading ||
                    renewalRows.filter((r) => !r.excluded && !r.alreadyExists).length === 0
                  }
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", renewalRunning && "animate-spin")} />
                  {renewalRunning
                    ? "생성 중..."
                    : `${monthKeyToLabel(renewalTargetMonth)}분 일괄 생성`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 제외: 이번 달만 vs 영구 분기 다이얼로그 (Q5) */}
      <AlertDialog
        open={excludeChoice.open}
        onOpenChange={(open) => !open && setExcludeChoice({ open: false, rowIndex: null })}
      >
        <AlertDialogContent className="!max-w-[380px]">
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={() => setExcludeChoice({ open: false, rowIndex: null })}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">닫기</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>정기 프로젝트 제외</AlertDialogTitle>
            <AlertDialogDescription>
              {excludeChoice.rowIndex !== null && renewalRows[excludeChoice.rowIndex]
                ? `"${renewalRows[excludeChoice.rowIndex].account_company_name} — ${renewalRows[excludeChoice.rowIndex].project_name}"`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full h-auto py-3 flex flex-col items-start gap-1 border-2 hover:border-blue-300 hover:bg-blue-50"
              onClick={applyExcludeThisMonth}
            >
              <span className="text-sm font-semibold text-blue-700">이번 달만 건너뛰기</span>
              <span className="text-[11px] text-muted-foreground font-normal text-left">
                다음 달 갱신에는 다시 후보로 표시됨
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-auto py-3 flex flex-col items-start gap-1 border-2 hover:border-rose-400 hover:bg-rose-50"
              onClick={applyExcludePermanent}
            >
              <span className="text-sm font-semibold text-rose-700">정기 목록에서 영구 제외</span>
              <span className="text-[11px] text-muted-foreground font-normal text-left">
                다음 달부터 후보에서 빠짐 (계약 종료 등)
              </span>
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// DateCell — Popover Calendar 인라인 편집 셀
// ────────────────────────────────────────────────────────────
function DateCell({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-full justify-start text-xs px-2 font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3" />
          {value ? formatDateKo(value) : "날짜 선택"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(d) => {
            const iso = d ? format(d, "yyyy-MM-dd") : null
            onChange(iso)
            setOpen(false)
          }}
        />
        {value && (
          <div className="border-t p-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              날짜 지우기
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
