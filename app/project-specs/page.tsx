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
  StickyNote,
  Filter,
} from "lucide-react"

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
  // 입금 예정일 기준월 필터 (yyyy-MM). 기본: 현재 달. 이 월부터 미래 항목만 표시
  const [filterStartMonth, setFilterStartMonth] = useState<string>(currentMonthKey())
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)

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

      // 4. 행 추가용 거래처 옵션 로드 (client의 영업 담당자도 함께)
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

      // 월 필터: 입금 예정일이 있는 행만 비교 (없으면 항상 표시 — 새 행 등 작성 중 항목 보호)
      if (s.payment_due_date) {
        const itemMonth = toMonthKey(s.payment_due_date)
        if (itemMonth < filterStartMonth) return false
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
    filterStartMonth,
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
    const total = specs.length
    const draftNeeded = specs.filter((s) => s.progress_status === "작성필요").length
    const invoicePending = specs.filter((s) => s.invoice_status === "발행대기").length
    const unpaid = specs.filter(
      (s) => s.payment_due_date && new Date(s.payment_due_date) < new Date() && s.invoice_status !== "발행완료"
    ).length
    return { total, draftNeeded, invoicePending, unpaid }
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
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              행 추가
            </Button>
          </div>

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
              {/* 좌측: 요약 인라인 배지 */}
              <div className="flex items-center gap-1.5 text-xs pr-3 border-r border-border/60">
                <span className="px-2 py-1 rounded-md bg-muted/60 text-foreground/80">
                  전체 <span className="font-semibold ml-0.5">{summary.total}</span>
                </span>
                <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  작성필요 <span className="font-semibold ml-0.5">{summary.draftNeeded}</span>
                </span>
                <span className="px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200">
                  발행대기 <span className="font-semibold ml-0.5">{summary.invoicePending}</span>
                </span>
                <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                  미입금 <span className="font-semibold ml-0.5">{summary.unpaid}</span>
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
                      {s}
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
                      {s}
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

              {/* 입금 예정일 기준월 필터 */}
              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <CalendarIcon className="h-3 w-3" />
                    {monthKeyToLabel(filterStartMonth)} 이후
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(`${filterStartMonth}-01`)}
                    onSelect={(d) => {
                      if (d) {
                        setFilterStartMonth(toMonthKey(d))
                        setMonthPickerOpen(false)
                      }
                    }}
                    defaultMonth={new Date(`${filterStartMonth}-01`)}
                  />
                  <div className="border-t p-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground pl-1">
                      선택한 달부터 미래 항목만 표시
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setFilterStartMonth(currentMonthKey())
                        setMonthPickerOpen(false)
                      }}
                    >
                      이번 달로 초기화
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="프로젝트명 / 거래처명 검색..."
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
                    <TableHead className="w-[80px]">카테고리</TableHead>
                    {/* 프로젝트명: 좁힌 컬럼들에서 절약한 80px만큼 추가 확장 (210 → 290) */}
                    <TableHead className="w-[290px] min-w-[290px]">프로젝트명</TableHead>
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
                      <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
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
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {spec.account_company_name}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span>{spec.account_company_name}</span>
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
                                    ? "bg-blue-50 text-blue-700"
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
                                    {s}
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
                                    {s}
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
                                    ? "bg-violet-50 text-violet-700"
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
                                    "h-7 w-full justify-center px-2 text-xs",
                                    spec.notes ? "text-foreground" : "text-muted-foreground"
                                  )}
                                >
                                  <StickyNote className="h-3.5 w-3.5 mr-1" />
                                  {spec.notes ? "있음" : "메모"}
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
