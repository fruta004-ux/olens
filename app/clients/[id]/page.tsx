"use client"

import { SelectItem } from "@/components/ui/select"
import { Select, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select"
import { PopoverTrigger } from "@/components/ui/popover"
import React from "react" // 'type React' removed to fix lint error
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { CrmSidebar } from "@/components/crm-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarIcon,
  MessageSquare,
  FileText,
  User,
  X,
  Plus,
  Calendar,
  Trash2,
  Home,
  Building2,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Edit,
  ImageIcon,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useState, useEffect, useCallback } from "react" // useMemo 추가
import { Popover, PopoverContent } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar" // CalendarComponent 이름 변경
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import SearchableSelect from "@/components/searchable-select"
import { Label } from "@/components/ui/label" // Label 추가
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CreateQuotationDialog } from "@/components/create-quotation-dialog"
import { QuotationViewDialog } from "@/components/quotation-view-dialog"
import { CloseReasonDialog } from "@/components/close-reason-dialog"
import { getCloseReasonText } from "@/lib/close-reasons"

const sanitizeFileName = (fileName: string): string => {
  // 파일명과 확장자 분리
  const lastDotIndex = fileName.lastIndexOf(".")
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ""

  // 한글, 특수문자, 공백을 제거하고 영문/숫자/언더스코어만 남김
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 50) // 최대 50자로 제한

  return sanitized + ext
}

const getStageDisplay = (stage: string) => {
  const stageMap: Record<string, string> = {
    S0_new_lead: "S0_신규 유입",
    S1_qualified: "S1_유효 리드",
    S2_contact: "S2_상담 완료",
    S2_consultation: "S2_상담 완료",
    S3_proposal: "S3_제안 발송",
    S4_negotiation: "S4_결정 대기",
    S4_decision: "S4_결정 대기",
    S4_closed_won: "S4_결정 대기",
    S5_contract: "S5_계약완료",
    S5_complete: "S5_계약완료",
    S6_closed: "S6_종료",
    S6_complete: "S6_종료",
  }
  return stageMap[stage] || stage
}

const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// 날짜 문자열을 로컬 시간 기준 Date 객체로 변환 (타임존 문제 방지)
const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date()
  // "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm:ss" 형식 처리
  const datePart = dateString.split("T")[0]
  const [year, month, day] = datePart.split("-").map(Number)
  return new Date(year, month - 1, day) // 로컬 시간 기준으로 생성
}

const EditableInput = ({
  defaultValue,
  onSave,
  multiline,
  autoFocus,
}: {
  defaultValue: string
  onSave: (value: string) => void
  multiline?: boolean
  autoFocus?: boolean
}) => {
  const [value, setValue] = React.useState(defaultValue)

  const handleBlur = () => {
    onSave(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline && !e.shiftKey) {
      e.preventDefault()
      onSave(value)
    }
  }

  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className="text-sm min-h-[80px]"
        rows={3}
        autoFocus={autoFocus}
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="text-sm h-10"
      autoFocus={autoFocus}
    />
  )
}

const formatNumberWithCommas = (value: string): string => {
  const numberOnly = value.replace(/[^0-9]/g, "")
  if (!numberOnly) return ""
  return Number(numberOnly).toLocaleString("ko-KR")
}

const parseFormattedNumber = (value: string): string => {
  return value.replace(/,/g, "")
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  // Next.js 15에서는 params가 Promise이지만, 클라이언트 컴포넌트에서는 use()로 처리
  const resolvedParams = React.use(params as unknown as Promise<{ id: string }>)
  return <ClientDetailPageClient clientId={resolvedParams.id} />
}

function ClientDetailPageClient({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("opportunities")
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get("tab")
      if (tab) setActiveTab(tab)
    }
  }, [])
  const [dealData, setDealData] = useState<any>({})
  const [localNotes, setLocalNotes] = useState<string>("")
  // activity_date 타입을 string으로 변경, assigned_to 초기값 보강
  const [newActivity, setNewActivity] = useState<{
    activity_type: string
    content: string
    activity_date: string
    assigned_to: string
    attachments: File[]
  }>({
    activity_type: "통화",
    content: "",
    activity_date: getTodayDate(),
    assigned_to: dealData?.assigned_to || "", // 초기값 dealData.assigned_to 사용
    // attachments 초기화
    attachments: [],
  })
  // editingActivity 상태를 객체로 변경하여 activity ID별 관리
  const [editingActivity, setEditingActivity] = useState<any>({})
  const [activityDateOpen, setActivityDateOpen] = useState(false)
  const [nextContactDateOpen, setNextContactDateOpen] = useState(false)
  const [firstContactDateOpen, setFirstContactDateOpen] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [needsOptions, setNeedsOptions] = useState<string[]>([])
  const [sourceOptions, setSourceOptions] = useState<string[]>([])
  const [channelOptions, setChannelOptions] = useState<string[]>([])
  const [gradeOptions, setGradeOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [showQuotationDialog, setShowQuotationDialog] = useState(false)
  const [pendingQuotation, setPendingQuotation] = useState<{
    quotationId: string
    totalAmount: number
  } | null>(null)

  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  const [showQuotationDetail, setShowQuotationDetail] = useState(false)
  const [quotationTargetActivityId, setQuotationTargetActivityId] = useState<string | null>(null)
  
  // 활동 정렬 순서 상태 (desc: 최신순, asc: 오래된순)
  const [activitySortOrder, setActivitySortOrder] = useState<'desc' | 'asc'>('desc')
  
  // 종료 사유 모달 상태
  const [showCloseReasonDialog, setShowCloseReasonDialog] = useState(false)
  const [pendingStageChange, setPendingStageChange] = useState<string | null>(null)

  // 계약 확정 정보 모달 상태
  const [showContractConfirmDialog, setShowContractConfirmDialog] = useState(false)
  const [contractConfirmData, setContractConfirmData] = useState({
    target: "",
    name: "",
    status: "",
    needs: "",
    inflow_source: "",
    conditions: "",
    cost: "",
    invoice_date: "",
    contract_date: "",
    work_start_date: "",
    notes: "-",
    reason_ids: [] as string[],
  })
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null)
  const [contractReasonOptions, setContractReasonOptions] = useState<{ id: string; value: string }[]>([])

  // 계약 이력 상태
  const [contracts, setContracts] = useState<any[]>([])
  const [showContractDialog, setShowContractDialog] = useState(false)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [contractForm, setContractForm] = useState({
    service_type: "",
    contract_name: "",
    contract_amount: "",
    contract_date: "",
    start_date: "",
    end_date: "",
    status: "진행중",
    notes: "",
  })
  const [serviceTypeOptions, setServiceTypeOptions] = useState<string[]>([])

  // 영업 기회 상태
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false)
  const [editingOpportunity, setEditingOpportunity] = useState<any>(null)
  const [opportunityForm, setOpportunityForm] = useState({
    opportunity_type: "업셀",
    title: "",
    description: "",
    expected_amount: "",
    probability: "중간",
    target_date: "",
    status: "발굴",
    related_contract_id: "",
    notes: "",
  })

  // 과거 프로젝트 (연결된 deals)
  const [linkedDeals, setLinkedDeals] = useState<any[]>([])

  const supabase = createBrowserClient()

  const resolvedId = clientId

  // isClosedStage 변수 정의
  const isClosedStage =
    dealData.stage === "S6_complete" ||
    dealData.stage === "S6_closed" ||
    dealData.stage === "S5_complete" ||
    dealData.stage === "S5_contract"

  const loadActivities = async () => {
    const [activitiesRes, quotationsRes] = await Promise.all([
      supabase
        .from("client_activities")
        .select("*")
        .eq("client_id", resolvedId)
        .order("activity_date", { ascending: false }),
      supabase
        .from("quotations")
        .select("*")
        .eq("client_id", resolvedId),
    ])

    if (activitiesRes.error) {
      console.error("[v0] activities 로드 오류:", activitiesRes.error)
      return
    }

    const quotationsByActivity = new Map<string, any[]>()
    ;(quotationsRes.data || []).forEach((q: any) => {
      const actId = q.client_activity_id || q.activity_id
      if (actId) {
        const arr = quotationsByActivity.get(actId) || []
        arr.push(q)
        quotationsByActivity.set(actId, arr)
      }
    })

    const parsedActivities = (activitiesRes.data || []).map((activity: any) => {
      let parsedAttachments: any[] = []

      if (activity.attachments) {
        try {
          if (typeof activity.attachments === "string" && activity.attachments.trim()) {
            parsedAttachments = JSON.parse(activity.attachments)
          } else if (Array.isArray(activity.attachments)) {
            parsedAttachments = activity.attachments
          }
        } catch (e) {
          console.error("[v0] attachments 파싱 오류:", e)
          parsedAttachments = []
        }
      }

      const actQuotations = quotationsByActivity.get(activity.id) || []
      return {
        ...activity,
        attachments: parsedAttachments,
        quotation: actQuotations.length > 0 ? actQuotations[0] : null,
        quotations: actQuotations,
      }
    })

    setActivities(parsedActivities)
  }

  const loadDealData = async () => {
    let deal = null
    let dealError = null

    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        account:accounts!account_id (
          id,
          company_name,
          email,
          phone,
          address,
          website,
          representative,
          business_number,
          industry,
          employee_count,
          notes
        ),
        contact:contacts!contact_id (
          id,
          name,
          position,
          email,
          phone
        )
      `)
      .eq("id", resolvedId)

    // 배열의 첫 번째 요소 가져오기
    deal = data && data.length > 0 ? data[0] : null
    dealError = error

    if (dealError || !deal) {
      return
    }

    // activities 로딩을 별도 함수로 분리
    loadActivities()

    setDealData({
      ...deal,
      account_id: deal.account_id, // 명시적으로 account_id 설정
      editingField: undefined,
      editValues: {},
      showAddActivity: false, // 초기값 설정
    })
    setLocalNotes(deal.account?.notes || "")
    setNewActivity((prev) => ({
      ...prev,
      assigned_to: deal.assigned_to || "오일환",
    }))
  }

  // === 계약 이력 로드 (useEffect 전에 정의) ===
  const loadContracts = useCallback(async () => {
    const { data, error } = await supabase
      .from("client_contracts")
      .select("*")
      .eq("client_id", resolvedId)
      .order("contract_date", { ascending: false })

    if (error) {
      console.error("계약 이력 로드 오류:", error)
      return
    }
    setContracts(data || [])
  }, [resolvedId, supabase])

  // === 영업 기회 로드 (useEffect 전에 정의) ===
  const loadOpportunities = useCallback(async () => {
    const { data, error } = await supabase
      .from("client_opportunities")
      .select("*, related_contract:client_contracts!related_contract_id(id, contract_name)")
      .eq("client_id", resolvedId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("영업 기회 로드 오류:", error)
      return
    }
    setOpportunities(data || [])
  }, [resolvedId, supabase])

  // === 과거 프로젝트(연결된 deals) 로드 ===
  const loadLinkedDeals = useCallback(async () => {
    if (!dealData.account_id) return
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("id, deal_name, stage, needs_summary, amount_range, first_contact_date, assigned_to, grade, priority, created_at, updated_at")
        .eq("account_id", dealData.account_id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("연결된 거래 로드 오류:", error)
        return
      }
      setLinkedDeals(data || [])
    } catch (err) {
      console.error("연결된 거래 로드 예외:", err)
    }
  }, [dealData.account_id, supabase])

  useEffect(() => {
    if (!resolvedId) return

    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("*")

      if (data) {
        setNeedsOptions(data.filter((s) => s.category === "needs").map((s) => ({ value: s.value, label: s.value })))
        setSourceOptions(data.filter((s) => s.category === "source").map((s) => s.value))
        setChannelOptions(data.filter((s) => s.category === "channel").map((s) => s.value))
        setGradeOptions(data.filter((s) => s.category === "grade").map((s) => s.value))
        setCategoryOptions(data.filter((s) => s.category === "deal_category").map((s) => s.value))
        setServiceTypeOptions(data.filter((s) => s.category === "service_type").map((s) => s.value))
        setContractReasonOptions(data.filter((s: any) => s.category === "contract_reason").map((s: any) => ({ id: s.id, value: s.value })))
      }
    }

    fetchSettings()
    loadDealData()
    loadContracts()
    loadOpportunities()
  }, [resolvedId, supabase, clientId, loadContracts, loadOpportunities])

  useEffect(() => {
    if (dealData.account_id) {
      loadLinkedDeals()
    }
  }, [dealData.account_id, loadLinkedDeals])

  // Activities 아이콘 매핑 함수
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "통화":
        return <Phone className="h-5 w-5 text-primary" />
      case "미팅":
        return <User className="h-5 w-5 text-primary" />
      case "이메일":
        return <Mail className="h-5 w-5 text-primary" />
      case "문자":
        return <MessageSquare className="h-5 w-5 text-primary" />
      case "방문":
        return <Home className="h-5 w-5 text-primary" />
      case "메모":
        return <FileText className="h-5 w-5 text-primary" />
      default:
        return <FileText className="h-5 w-5 text-primary" />
    }
  }

  const handleUpdateDeal = async (updates: any) => {
    const isClosingDeal = updates.stage === "S6_complete" || updates.stage === "S6_closed"
    const isCompleteDeal = updates.stage === "S5_complete" || updates.stage === "S5_contract"

    // 종료 또는 계약완료 단계로 변경 시 다음 연락일 제거
    if (isClosingDeal || isCompleteDeal) {
      console.log("[v0] 종료/계약완료 단계로 변경됨 - 다음 연락일을 null로 설정합니다")
      updates.next_contact_date = null
    }

    console.log("[v0] handleUpdateDeal 호출:", updates)

    const { error } = await supabase.from("clients").update(updates).eq("id", resolvedId)

    if (error) {
      console.error("[v0] 거래 업데이트 오류:", error)
      return
    }

    console.log("[v0] 거래 업데이트 성공 - state 업데이트 중")
    setDealData((prev) => ({ ...prev, ...updates }))

    if (isClosingDeal || isCompleteDeal) {
      console.log("[v0] 종료/계약완료로 변경 완료 - 데이터 리로드")
      loadDealData()
    }
  }

  // 단계 변경 핸들러 - 종료 단계일 경우 모달 표시
  const handleStageChange = (newStage: string) => {
    if (newStage === "S6_complete" || newStage === "S6_closed") {
      setPendingStageChange(newStage)
      setShowCloseReasonDialog(true)
    } else if (newStage === "S5_complete") {
      setPendingStageChange(newStage)
      const today = new Date().toISOString().split("T")[0].replace(/-/g, ".")
      setContractConfirmData({
        target: dealData.company || "플루타",
        name: dealData.account?.company_name || dealData.deal_name || "",
        status: `거래확정 ( ${today.slice(5).replace(".", ".")} 확정 )`,
        needs: dealData.needs_summary?.replace(/,/g, ", ") || "",
        inflow_source: dealData.inflow_source || "",
        conditions: "",
        cost: dealData.amount_range ? `${dealData.amount_range} ( vat별도 )` : "",
        invoice_date: "",
        contract_date: today,
        work_start_date: "",
        notes: "-",
        reason_ids: [],
      })
      setShowContractConfirmDialog(true)
    } else {
      handleUpdateDeal({ stage: newStage })
    }
  }

  // 종료 사유 확정 핸들러
  const handleCloseReasonConfirm = async (reasonCode: string) => {
    if (pendingStageChange) {
      await handleUpdateDeal({ 
        stage: pendingStageChange, 
        close_reason: reasonCode 
      })
      setPendingStageChange(null)
    }
  }

  // 계약 확정 저장 핸들러
  const handleContractConfirm = async () => {
    if (pendingStageChange) {
      await handleUpdateDeal({
        stage: pendingStageChange,
        contract_info: contractConfirmData,
      })
      setPendingStageChange(null)
    } else {
      await handleUpdateDeal({ contract_info: contractConfirmData })
    }
    setShowContractConfirmDialog(false)
  }

  const getReasonNames = (ids: string[] = []) => {
    return ids.map(id => contractReasonOptions.find(r => r.id === id)?.value || "").filter(Boolean).join(", ")
  }

  const getContractPlainText = (info: any = contractConfirmData) => {
    const reasonText = getReasonNames(info.reason_ids || [])
    return `[ 계약 확정 ]\n대        상 : ${info.target}\n명        칭 : ${info.name}\n현        황 : ${info.status}\n니        즈 : ${info.needs}\n유입경로 : ${info.inflow_source}\n조        건 : ${info.conditions}\n비        용 : ${info.cost}\n계  산  서 : ${info.invoice_date}\n계  약  일 : ${info.contract_date}\n업무시작 : ${info.work_start_date}\n결정사유 : ${reasonText || "-"}\n비        고 : ${info.notes}`
  }

  const getContractHtml = (info: any = contractConfirmData) => {
    const reasonText = getReasonNames(info.reason_ids || [])
    const lines = [
      { label: "[ 계약 확정 ]", value: "" },
      { label: "대        상", value: info.target },
      { label: "명        칭", value: info.name },
      { label: "현        황", value: info.status },
      { label: "니        즈", value: info.needs },
      { label: "유입경로", value: info.inflow_source },
      { label: "조        건", value: info.conditions },
      { label: "비        용", value: info.cost },
      { label: "계  산  서", value: info.invoice_date },
      { label: "계  약  일", value: info.contract_date },
      { label: "업무시작", value: info.work_start_date },
      { label: "결정사유", value: reasonText || "-" },
      { label: "비        고", value: info.notes },
    ]
    return lines.map(l =>
      l.value === "" ? `<b>${l.label}</b>` : `<b>${l.label}</b> : ${l.value}`
    ).join("<br>")
  }

  const copyContractText = async (info?: any, contractId?: string) => {
    const plain = getContractPlainText(info)
    const html = getContractHtml(info)
    const markCopied = () => {
      setCopiedContractId(contractId || "default")
      setTimeout(() => setCopiedContractId(null), 2000)
    }

    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        })
        await navigator.clipboard.write([item])
        markCopied()
        return
      }
    } catch { /* fallback */ }

    const el = document.createElement("div")
    el.innerHTML = html
    el.style.position = "fixed"
    el.style.left = "-9999px"
    el.style.whiteSpace = "pre"
    document.body.appendChild(el)
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    try {
      document.execCommand("copy")
      markCopied()
    } catch {
      window.prompt("Ctrl+C로 복사하세요:", plain)
    }
    sel?.removeAllRanges()
    document.body.removeChild(el)
  }

  const handleUpdateAccount = async (updates: any) => {
    if (!dealData.account_id) {
      console.error("[v0] account_id가 없어서 업데이트 중단")
      return
    }

    const { error } = await supabase.from("accounts").update(updates).eq("id", dealData.account_id)

    if (error) {
      console.error("[v0] 거래처 업데이트 오류:", error)
      return
    }

    setDealData((prev) => ({
      ...prev,
      account: { ...prev.account, ...updates },
    }))
  }

  const handleUpdateAssignedTo = async (newAssignedTo: string) => {
    // 1. 거래 테이블 업데이트
    await handleUpdateDeal({ assigned_to: newAssignedTo })

    // 2. 연결된 작업들 업데이트
    const { error: tasksError } = await supabase
      .from("client_tasks")
      .update({ assigned_to: newAssignedTo })
      .eq("client_id", resolvedId)

    if (tasksError) {
      console.error("[v0] 작업 담당자 업데이트 오류:", tasksError)
    }

    // 3. 연결된 활동들 업데이트
    const { error: activitiesError } = await supabase
      .from("client_activities")
      .update({ assigned_to: newAssignedTo })
      .eq("client_id", resolvedId)

    if (activitiesError) {
      console.error("[v0] 활동 담당자 업데이트 오류:", activitiesError)
    }
  }

  const EditableField = ({
    label,
    field,
    value,
    multiline = false,
    isAccountField = false, // accounts 테이블 필드인지 구분
  }: {
    label: string
    field: string
    value: string | undefined | null
    multiline?: boolean
    isAccountField?: boolean // accounts 테이블 필드인지 구분
  }) => {
    const isEditing = dealData.editingField === field
    const currentValue = value || ""

    const handleSave = useCallback(
      (newValue: string) => {
        if (isAccountField) {
          handleUpdateAccount({ [field]: newValue })
        } else {
          handleUpdateDeal({ [field]: newValue })
        }
        setDealData((prev) => ({ ...prev, editingField: undefined }))
      },
      [field, isAccountField],
    )

    return (
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {isEditing ? (
          <div className="mt-1">
            <EditableInput defaultValue={currentValue} onSave={handleSave} multiline={multiline} autoFocus={true} />
          </div>
        ) : (
          <p
            className="text-sm font-medium text-foreground mt-1 cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2"
            onClick={() => setDealData((prev) => ({ ...prev, editingField: field }))}
          >
            {currentValue || "클릭하여 입력"}
          </p>
        )}
      </div>
    )
  }

  const uploadAttachments = async (files: File[]) => {
    const uploadedAttachments = []

    for (const file of files) {
      try {
        // 파일 이름 sanitization 로직을 더 명확하게 분리
        const sanitize = (name: string) =>
          name
            .replace(/[^\w\s.-]/g, "_") // 특수 문자 제거
            .replace(/\s+/g, "_") // 공백을 언더스코어로 변경
            .replace(/_+/g, "_") // 연속된 언더스코어 제거
            .substring(0, 50) // 최대 50자

        const sanitizedName = sanitize(file.name)
        const fileName = `${resolvedId}/${Date.now()}-${sanitizedName}` // deal ID와 타임스탬프 포함

        const { data, error } = await supabase.storage.from("activity-attachments").upload(fileName, file)

        if (error) {
          console.error("[v0] 첨부파일 업로드 오류:", error)
          // 실패 시에도 계속 진행하여 성공한 파일만 반환
          continue
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("activity-attachments").getPublicUrl(fileName)

        uploadedAttachments.push({
          url: publicUrl,
          name: file.name, // 원본 파일명 저장
        })
      } catch (err) {
        console.error("[v0] 첨부파일 업로드 처리 중 오류:", err)
      }
    }
    return uploadedAttachments
  }

  const handleAddActivity = async () => {
    if (!newActivity.content.trim()) {
      alert("활동 내용을 입력해주세요.")
      return
    }

    try {
      let attachments = []
      if (newActivity.attachments.length > 0) {
        attachments = await uploadAttachments(newActivity.attachments)
      }

      const titleMap: { [key: string]: string } = {
        통화: "고객 통화",
        미팅: "미팅 진행",
        이메일: "이메일 발송",
        문자: "문자 발송",
        방문: "고객 방문",
        메모: "메모 작성",
      }
      const activityTitle = titleMap[newActivity.activity_type] || "활동"

      const { data: activity, error } = await supabase
        .from("client_activities")
        .insert({
          client_id: resolvedId,
          activity_type: newActivity.activity_type,
          title: activityTitle,
          content: newActivity.content,
          activity_date: newActivity.activity_date,
          assigned_to: newActivity.assigned_to,
          attachments: JSON.stringify(attachments),
        })
        .select()
        .single()

      if (error) throw error

      if (pendingQuotation) {
        const { error: quotationError } = await supabase
          .from("quotations")
          .update({ client_activity_id: activity.id })
          .eq("id", pendingQuotation.quotationId)

        if (quotationError) {
          console.error("견적서 연결 실패:", quotationError)
        }
      }

      setNewActivity({
        activity_type: "통화",
        content: "",
        activity_date: getTodayDate(),
        assigned_to: dealData?.assigned_to || "오일환",
        attachments: [],
      })

      setPendingQuotation(null)
      loadActivities()

      alert("활동이 추가되었습니다.")
    } catch (error: unknown) {
      console.error("활동 추가 오류:", error)
      alert("활동 추가에 실패했습니다.")
    }
  }

  const handleUpdateActivity = async (activityId: string) => {
    const activity = editingActivity[activityId]
    if (!activity || !activity.content.trim()) {
      alert("활동 내용을 입력해주세요.")
      return
    }

    try {
      const editData = editingActivity[activityId]

      let attachments = editData.attachments || [] // 기존 첨부파일
      if (editData.newAttachments && editData.newAttachments.length > 0) {
        const newUploaded = await uploadAttachments(editData.newAttachments)
        attachments = [...attachments, ...newUploaded] // 기존 첨부파일과 새 파일 결합
      }

      const titleMap: { [key: string]: string } = {
        통화: "고객 통화",
        미팅: "미팅 진행",
        이메일: "이메일 발송",
        문자: "문자 발송",
        방문: "고객 방문",
        메모: "메모 작성",
      }
      const activityTitle = titleMap[editData.activity_type] || "활동"

      const { error } = await supabase
        .from("client_activities")
        .update({
          activity_type: editData.activity_type,
          title: activityTitle,
          content: editData.content,
          activity_date: editData.activity_date,
          assigned_to: editData.assigned_to,
          attachments: JSON.stringify(attachments),
        })
        .eq("id", activityId)

      if (error) throw error

      // 편집 모드 종료
      setEditingActivity({}) // 모든 편집 모드 종료

      // 활동 목록 새로고침
      loadActivities()

      alert("활동이 수정되었습니다.")
    } catch (error: unknown) {
      console.error("[v0] 활동 수정 오류:", error)
      alert("활동 수정에 실패했습니다.")
    }
  }

  const handleDeleteAttachment = async (activityId: string, attachmentUrl: string) => {
    if (!attachmentUrl || !confirm("첨부파일을 삭제하시겠습니까?")) return

    try {
      const activity = activities.find((a) => a.id === activityId)
      if (!activity) return

      // Supabase Storage에서 파일 경로 추출 (URL에서)
      const urlParts = attachmentUrl.split("/")
      // activity-attachments/ 다음 부분을 경로로 사용 (dealId/timestamp-filename)
      const filePath = urlParts.slice(urlParts.indexOf("activity-attachments") + 1).join("/")

      // DB에서 attachment 정보 제거
      const currentAttachments = activity.attachments || []
      const updatedAttachments = currentAttachments.filter((att: any) => att.url && att.url !== attachmentUrl)

      const { error: dbError } = await supabase
        .from("client_activities")
        .update({
          attachments: JSON.stringify(updatedAttachments),
        })
        .eq("id", activityId)

      if (dbError) {
        console.error("[v0] DB 첨부파일 정보 업데이트 오류:", dbError)
        throw dbError
      }

      // Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage.from("activity-attachments").remove([filePath])

      if (storageError) {
        console.error("[v0] Storage 파일 삭제 오류:", storageError)
        // DB 업데이트는 성공했지만 Storage 삭제 실패 시 알림 (선택적)
      }

      // 활동 목록 새로고침
      loadActivities()

      alert("첨부파일이 삭제되었습니다.")
    } catch (error) {
      console.error("[v0] 첨부파일 삭제 처리 중 오류:", error)
      alert("첨부파일 삭제에 실패했습니다.")
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("이 활동을 삭제하시겠습니까?")) return

    try {
      const activity = activities.find((a) => a.id === activityId)

      // 첨부파일이 있으면 먼저 삭제
      if (activity?.attachments && activity.attachments.length > 0) {
        const filePaths = activity.attachments
          .map((att: any) => {
            if (!att.url) return null
            const urlParts = att.url.split("/")
            return urlParts.slice(urlParts.indexOf("activity-attachments") + 1).join("/")
          })
          .filter((path: string | null) => path !== null)

        if (filePaths.length > 0) {
          await supabase.storage.from("activity-attachments").remove(filePaths)
        }
      }

      // DB에서 활동 삭제
      const { error } = await supabase.from("client_activities").delete().eq("id", activityId)

      if (error) {
        console.error("[v0] 활동 삭제 오류:", error)
        throw error
      }

      // 활동 목록 새로고침
      loadActivities()
      alert("활동이 삭제되었습니다.")
    } catch (error) {
      console.error("[v0] 활동 삭제 처리 중 오류:", error)
      alert("활동 삭제에 실패했습니다.")
    }
  }

  const startEditActivity = (activity: any) => {
    let parsedAttachments = []

    if (activity.attachments) {
      try {
        if (typeof activity.attachments === "string" && activity.attachments.trim()) {
          parsedAttachments = JSON.parse(activity.attachments)
        } else if (Array.isArray(activity.attachments)) {
          parsedAttachments = activity.attachments
        }
      } catch (e) {
        console.error("[v0] 편집 모드 attachments 파싱 오류:", e)
        parsedAttachments = []
      }
    }

    setEditingActivity({
      [activity.id]: {
        activity_type: activity.activity_type,
        content: activity.content,
        activity_date: activity.activity_date.split("T")[0],
        assigned_to: activity.assigned_to,
        attachments: parsedAttachments, // DB에서 가져온 첨부파일 정보
        newAttachments: [], // 새롭게 추가될 첨부파일
        calendarOpen: false, // 달력 열림 상태
      },
    })
  }

  const handleCancelEdit = () => {
    setEditingActivity({})
  }

  // === 계약 이력 CRUD ===
  const resetContractForm = () => {
    setContractForm({
      service_type: "",
      contract_name: "",
      contract_amount: "",
      contract_date: "",
      start_date: "",
      end_date: "",
      status: "진행중",
      notes: "",
    })
    setEditingContract(null)
  }

  const handleSaveContract = async () => {
    if (!contractForm.contract_name.trim()) {
      alert("계약명을 입력해주세요.")
      return
    }

    const payload = {
      client_id: resolvedId,
      service_type: contractForm.service_type || null,
      contract_name: contractForm.contract_name,
      contract_amount: contractForm.contract_amount || null,
      contract_date: contractForm.contract_date || null,
      start_date: contractForm.start_date || null,
      end_date: contractForm.end_date || null,
      status: contractForm.status,
      notes: contractForm.notes || null,
    }

    if (editingContract) {
      const { error } = await supabase
        .from("client_contracts")
        .update(payload)
        .eq("id", editingContract.id)

      if (error) {
        console.error("계약 수정 오류:", error)
        alert("계약 수정에 실패했습니다.")
        return
      }
      alert("계약이 수정되었습니다.")
    } else {
      const { error } = await supabase
        .from("client_contracts")
        .insert(payload)

      if (error) {
        console.error("계약 추가 오류:", error)
        alert("계약 추가에 실패했습니다.")
        return
      }
      alert("계약이 추가되었습니다.")
    }

    setShowContractDialog(false)
    resetContractForm()
    loadContracts()
  }

  const handleEditContract = (contract: any) => {
    setEditingContract(contract)
    setContractForm({
      service_type: contract.service_type || "",
      contract_name: contract.contract_name || "",
      contract_amount: contract.contract_amount || "",
      contract_date: contract.contract_date || "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      status: contract.status || "진행중",
      notes: contract.notes || "",
    })
    setShowContractDialog(true)
  }

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm("이 계약을 삭제하시겠습니까?")) return

    const { error } = await supabase
      .from("client_contracts")
      .delete()
      .eq("id", contractId)

    if (error) {
      console.error("계약 삭제 오류:", error)
      alert("계약 삭제에 실패했습니다.")
      return
    }
    alert("계약이 삭제되었습니다.")
    loadContracts()
  }

  // === 영업 기회 CRUD ===
  const resetOpportunityForm = () => {
    setOpportunityForm({
      opportunity_type: "업셀",
      title: "",
      description: "",
      expected_amount: "",
      probability: "중간",
      target_date: "",
      status: "발굴",
      related_contract_id: "",
      notes: "",
    })
    setEditingOpportunity(null)
  }

  const handleSaveOpportunity = async () => {
    if (!opportunityForm.title.trim()) {
      alert("기회 제목을 입력해주세요.")
      return
    }

    const payload = {
      client_id: resolvedId,
      opportunity_type: opportunityForm.opportunity_type,
      title: opportunityForm.title,
      description: opportunityForm.description || null,
      expected_amount: opportunityForm.expected_amount || null,
      probability: opportunityForm.probability,
      target_date: opportunityForm.target_date || null,
      status: opportunityForm.status,
      related_contract_id: opportunityForm.related_contract_id || null,
      notes: opportunityForm.notes || null,
    }

    if (editingOpportunity) {
      const { error } = await supabase
        .from("client_opportunities")
        .update(payload)
        .eq("id", editingOpportunity.id)

      if (error) {
        console.error("영업 기회 수정 오류:", error)
        alert("영업 기회 수정에 실패했습니다.")
        return
      }
      alert("영업 기회가 수정되었습니다.")
    } else {
      const { error } = await supabase
        .from("client_opportunities")
        .insert(payload)

      if (error) {
        console.error("영업 기회 추가 오류:", error)
        alert("영업 기회 추가에 실패했습니다.")
        return
      }
      alert("영업 기회가 추가되었습니다.")
    }

    setShowOpportunityDialog(false)
    resetOpportunityForm()
    loadOpportunities()
  }

  const handleEditOpportunity = (opp: any) => {
    setEditingOpportunity(opp)
    setOpportunityForm({
      opportunity_type: opp.opportunity_type || "업셀",
      title: opp.title || "",
      description: opp.description || "",
      expected_amount: opp.expected_amount || "",
      probability: opp.probability || "중간",
      target_date: opp.target_date || "",
      status: opp.status || "발굴",
      related_contract_id: opp.related_contract_id || "",
      notes: opp.notes || "",
    })
    setShowOpportunityDialog(true)
  }

  const handleDeleteOpportunity = async (oppId: string) => {
    if (!confirm("이 영업 기회를 삭제하시겠습니까?")) return

    const { error } = await supabase
      .from("client_opportunities")
      .delete()
      .eq("id", oppId)

    if (error) {
      console.error("영업 기회 삭제 오류:", error)
      alert("영업 기회 삭제에 실패했습니다.")
      return
    }
    alert("영업 기회가 삭제되었습니다.")
    loadOpportunities()
  }

  const handleConvertOpportunityToDeal = async (opp: any) => {
    if (!confirm(`"${opp.title}" 기회를 신규 거래로 전환하시겠습니까?`)) return

    const { data: newDeal, error } = await supabase
      .from("deals")
      .insert({
        account_id: dealData.account_id,
        deal_name: opp.title,
        stage: "S0_new_lead",
        amount_range: opp.expected_amount || null,
        needs_summary: opp.description || null,
        company: dealData.company || "",
        assigned_to: dealData.assigned_to || "",
        linked_client_id: resolvedId,
        notes: opp.notes || null,
      })
      .select("id")
      .single()

    if (error) {
      console.error("거래 전환 오류:", error)
      alert("거래 전환에 실패했습니다.")
      return
    }

    if (newDeal) {
      await supabase
        .from("client_opportunities")
        .update({ converted_deal_id: newDeal.id, status: "성사" })
        .eq("id", opp.id)

      loadOpportunities()
      loadLinkedDeals()
      alert("신규 거래로 전환되었습니다.")
      router.push(`/deals/${newDeal.id}`)
    }
  }

  // 만료 임박 판단 (30일 이내)
  const isExpiringContract = (endDate: string) => {
    if (!endDate) return false
    const end = parseLocalDate(endDate)
    const now = new Date()
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 30
  }

  const isExpiredContract = (endDate: string) => {
    if (!endDate) return false
    const end = parseLocalDate(endDate)
    const now = new Date()
    return end.getTime() < now.getTime()
  }

  const getOpportunityTypeBadge = (type: string) => {
    switch (type) {
      case "업셀":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">업셀</Badge>
      case "크로스셀":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">크로스셀</Badge>
      case "재계약":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">재계약</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  const getOpportunityStatusBadge = (status: string) => {
    switch (status) {
      case "발굴":
        return <Badge variant="outline" className="border-gray-300 text-gray-600">발굴</Badge>
      case "제안중":
        return <Badge variant="outline" className="border-blue-300 text-blue-600">제안중</Badge>
      case "협상중":
        return <Badge variant="outline" className="border-yellow-300 text-yellow-600">협상중</Badge>
      case "성사":
        return <Badge variant="outline" className="border-green-300 text-green-600">성사</Badge>
      case "무산":
        return <Badge variant="outline" className="border-red-300 text-red-600">무산</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getContractStatusBadge = (contract: any) => {
    if (contract.end_date && isExpiredContract(contract.end_date) && contract.status !== "완료") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">만료</Badge>
    }
    if (contract.end_date && isExpiringContract(contract.end_date) && contract.status === "진행중") {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">만료 임박</Badge>
    }
    switch (contract.status) {
      case "진행중":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">진행중</Badge>
      case "완료":
        return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">완료</Badge>
      case "만료":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">만료</Badge>
      default:
        return <Badge variant="outline">{contract.status}</Badge>
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const newUrl = `/clients/${clientId}${tab === "opportunities" ? "" : `?tab=${tab}`}`
    router.replace(newUrl, { scroll: false })
  }

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-border bg-card overflow-y-auto">
          <div className="p-6">
            <Link href={activeTab === "info" ? "/contacts" : "/clients"}>
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {activeTab === "info" ? "연락처 목록" : "파이프라인 목록"}
              </Button>
            </Link>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {dealData.account?.company_name || "거래 정보 없음"}
              </h1>
              <Badge className="bg-primary text-primary-foreground mb-2">{getStageDisplay(dealData.stage)}</Badge>
              <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">담당자</p>
                  <p className="text-sm font-semibold text-foreground">
                    {dealData.owner || dealData.assigned_to || "담당자 없음"}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 gap-2 mb-6">
              <Button className="justify-start bg-transparent" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                이메일
              </Button>
              <Button className="justify-start bg-transparent" variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                통화
              </Button>
              <Button className="justify-start bg-transparent" variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                미팅
              </Button>
              <Button className="justify-start bg-transparent" variant="outline" disabled>
                <FileText className="mr-2 h-4 w-4" />
                견적서
              </Button>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">거래처 현황</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">진행 중 기회</p>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {opportunities.filter(o => !["성사", "무산"].includes(o.status)).length}건
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">계약 이력</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {contracts.length}건
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">과거 프로젝트</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {linkedDeals.length}건
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">마지막 활동</p>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {activities.length > 0 ? (() => {
                      const lastDate = activities[0]?.activity_date || activities[0]?.created_at
                      if (!lastDate) return "-"
                      const d = new Date(lastDate)
                      return `${d.getMonth() + 1}.${d.getDate()}`
                    })() : "-"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">회사</label>
                <select
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                  value={dealData.company || ""}
                  onChange={(e) => {
                    const newCompany = e.target.value
                    handleUpdateDeal({ company: newCompany })
                  }}
                >
                  <option value="">선택하세요</option>
                  <option value="플루타">🟣 플루타</option>
                  <option value="오코랩스">🟢 오코랩스</option>
                </select>
                {dealData.company && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md">
                    {dealData.company === "플루타" && (
                      <img src="/images/fruta-logo.png" alt="플루타" className="h-5 w-auto" />
                    )}
                    {dealData.company === "오코랩스" && (
                      <img src="/images/ocolabs-logo.png" alt="오코랩스" className="h-5 w-auto" />
                    )}
                    <span className="text-sm font-medium">{dealData.company}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
              <div className="border-b px-6">
                <TabsList className="h-12">
                  <TabsTrigger value="opportunities" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    영업기회 활동
                    {opportunities.filter(o => !["성사", "무산"].includes(o.status)).length > 0 && (
                      <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {opportunities.filter(o => !["성사", "무산"].includes(o.status)).length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    과거 프로젝트
                    {linkedDeals.length > 0 && (
                      <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {linkedDeals.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="gap-2">
                    <FileText className="h-4 w-4" />
                    계약 이력
                    {contracts.filter(c => c.end_date && isExpiringContract(c.end_date) && c.status === "진행중").length > 0 && (
                      <span className="ml-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-2">
                    <Users className="h-4 w-4" />
                    정보
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <TabsContent value="info" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>연락처 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <EditableField
                            label="상호명 / 브랜드명"
                            field="company_name"
                            value={dealData.account?.company_name || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div className="col-span-2">
                          <EditableField
                            label="사업자번호"
                            field="business_number"
                            value={dealData.account?.business_number || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div className="col-span-2">
                          <EditableField
                            label="종목"
                            field="industry"
                            value={dealData.account?.industry || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div>
                          <EditableField
                            label="이메일"
                            field="email"
                            value={dealData.account?.email || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div>
                          <EditableField
                            label="전화번호"
                            field="phone"
                            value={dealData.account?.phone || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div>
                          <EditableField
                            label="주소"
                            field="address"
                            value={dealData.account?.address || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div>
                          <EditableField
                            label="웹사이트"
                            field="website"
                            value={dealData.account?.website || ""}
                            isAccountField={true}
                          />
                        </div>
                        <div className="col-span-2">
                          <EditableField
                            label="메모"
                            field="notes"
                            value={dealData.account?.notes || ""}
                            multiline
                            isAccountField={true}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 과거 프로젝트 탭 */}
                <TabsContent value="projects" className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">과거 프로젝트</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">이 거래처와 진행했거나 진행 중인 모든 프로젝트(거래) 목록입니다.</p>
                    </CardHeader>
                    <CardContent>
                      {linkedDeals.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">연결된 프로젝트가 없습니다.</p>
                      ) : (
                        <div className="space-y-3">
                          {linkedDeals.map((deal: any) => {
                            const stageMap: Record<string, string> = {
                              S0_new_lead: "S0 신규유입", S1_qualified: "S1 유효리드",
                              S2_consultation: "S2 상담완료", S2_contact: "S2 상담완료",
                              S3_proposal: "S3 제안발송",
                              S4_decision: "S4 결정대기", S4_negotiation: "S4 결정대기",
                              S5_complete: "S5 계약완료", S5_contract: "S5 계약완료",
                              S6_complete: "S6 종료", S6_closed: "S6 종료",
                              S7_recontact: "S7 재접촉",
                            }
                            const stageLabel = stageMap[deal.stage] || deal.stage
                            const isComplete = deal.stage?.startsWith("S5")
                            const isClosed = deal.stage?.startsWith("S6")
                            const isActive = !isComplete && !isClosed

                            return (
                              <div
                                key={deal.id}
                                className={cn(
                                  "border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50",
                                  isComplete && "border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10",
                                  isClosed && "border-muted bg-muted/20 opacity-70",
                                  isActive && "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/10"
                                )}
                                onClick={() => router.push(`/deals/${deal.id}`)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <h4 className="font-semibold text-sm">{deal.deal_name || "이름 없음"}</h4>
                                      <Badge variant="outline" className={cn(
                                        "text-[10px] h-5",
                                        isComplete && "border-green-300 text-green-700",
                                        isClosed && "border-muted text-muted-foreground",
                                        isActive && "border-blue-300 text-blue-700"
                                      )}>
                                        {stageLabel}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                      {deal.needs_summary && (
                                        <div>니즈: <span className="text-foreground">{deal.needs_summary}</span></div>
                                      )}
                                      {deal.amount_range && (
                                        <div>금액: <span className="text-foreground font-medium">{deal.amount_range}</span></div>
                                      )}
                                      {deal.first_contact_date && (
                                        <div>첫 문의: {deal.first_contact_date}</div>
                                      )}
                                      {deal.assigned_to && (
                                        <div>담당자: {deal.assigned_to}</div>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 계약 이력 탭 */}
                <TabsContent value="contracts" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>계약 이력</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetContractForm()
                          setShowContractDialog(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        계약 추가
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contracts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">등록된 계약이 없습니다.</p>
                      ) : (
                        <div className="space-y-3">
                          {contracts.map((contract) => (
                            <div
                              key={contract.id}
                              className={cn(
                                "border rounded-lg p-4 transition-colors hover:bg-muted/50",
                                contract.end_date && isExpiringContract(contract.end_date) && contract.status === "진행중"
                                  ? "border-amber-300 bg-amber-50/50"
                                  : contract.end_date && isExpiredContract(contract.end_date) && contract.status !== "완료"
                                  ? "border-red-200 bg-red-50/30"
                                  : ""
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-foreground">{contract.contract_name}</h4>
                                    {getContractStatusBadge(contract)}
                                    {contract.service_type && (
                                      <Badge variant="outline" className="text-xs">{contract.service_type}</Badge>
                                    )}
                                  </div>

                                  {contract.contract_info ? (
                                    <div className="mt-2">
                                      <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md text-xs space-y-1">
                                        {[
                                          { key: "target", label: "대        상" },
                                          { key: "name", label: "명        칭" },
                                          { key: "status", label: "현        황" },
                                          { key: "needs", label: "니        즈" },
                                          { key: "inflow_source", label: "유입경로" },
                                          { key: "conditions", label: "조        건" },
                                          { key: "cost", label: "비        용" },
                                          { key: "invoice_date", label: "계  산  서" },
                                          { key: "contract_date", label: "계  약  일" },
                                          { key: "work_start_date", label: "업무시작" },
                                          { key: "reason_ids", label: "결정사유" },
                                          { key: "notes", label: "비        고" },
                                        ].map(({ key, label }) => (
                                          <div key={key} className="flex gap-2">
                                            <span className="font-semibold whitespace-pre text-green-800 dark:text-green-200 shrink-0">{label}</span>
                                            <span className="text-green-700 dark:text-green-300">: {
                                              key === "reason_ids"
                                                ? (contract.contract_info.reason_names || getReasonNames(contract.contract_info.reason_ids || []) || "-")
                                                : contract.contract_info[key] || "-"
                                            }</span>
                                          </div>
                                        ))}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 h-7 gap-1 text-xs"
                                        onClick={() => copyContractText(contract.contract_info, contract.id)}
                                      >
                                        {copiedContractId === contract.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {copiedContractId === contract.id ? "복사됨" : "복사"}
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                        {contract.contract_amount && (
                                          <div>금액: <span className="text-foreground font-medium">{contract.contract_amount}</span></div>
                                        )}
                                        {contract.contract_date && (
                                          <div>계약일: {contract.contract_date}</div>
                                        )}
                                        {contract.start_date && (
                                          <div>시작일: {contract.start_date}</div>
                                        )}
                                        {contract.end_date && (
                                          <div className="flex items-center gap-1">
                                            종료일: {contract.end_date}
                                            {isExpiringContract(contract.end_date) && contract.status === "진행중" && (
                                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {contract.notes && (
                                        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{contract.notes}</p>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-2">
                                  {contract.linked_deal_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => router.push(`/deals/${contract.linked_deal_id}`)}
                                      title="연결된 거래 보기"
                                    >
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditContract(contract)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:text-destructive"
                                    onClick={() => handleDeleteContract(contract.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 영업기회 활동 탭 */}
                <TabsContent value="opportunities" className="space-y-6">
                  {/* 영업 기회 카드 */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-base">영업 기회</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetOpportunityForm()
                          setShowOpportunityDialog(true)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        기회 추가
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {opportunities.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-sm">등록된 영업 기회가 없습니다. 업셀/크로스셀/재계약 기회를 추가하세요.</p>
                      ) : (
                        <div className="space-y-3">
                          {opportunities.map((opp) => (
                            <div
                              key={opp.id}
                              className={cn(
                                "border rounded-lg p-4 transition-colors hover:bg-muted/50",
                                opp.status === "성사" && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
                                opp.status === "무산" && "border-muted bg-muted/30 opacity-60"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-foreground">{opp.title}</h4>
                                    {getOpportunityTypeBadge(opp.opportunity_type)}
                                    {getOpportunityStatusBadge(opp.status)}
                                  </div>
                                  {opp.description && (
                                    <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{opp.description}</p>
                                  )}
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                    {opp.expected_amount && (
                                      <div>예상 금액: <span className="text-foreground font-medium">{opp.expected_amount}</span></div>
                                    )}
                                    <div>가능성: <span className={cn(
                                      "font-medium",
                                      opp.probability === "높음" ? "text-green-600" : opp.probability === "중간" ? "text-yellow-600" : "text-red-600"
                                    )}>{opp.probability}</span></div>
                                    {opp.target_date && (
                                      <div>목표 시기: {opp.target_date}</div>
                                    )}
                                    {opp.related_contract?.contract_name && (
                                      <div className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        연관 계약: {opp.related_contract.contract_name}
                                      </div>
                                    )}
                                  </div>
                                  {opp.notes && (
                                    <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{opp.notes}</p>
                                  )}
                                  {opp.status === "성사" && !opp.converted_deal_id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-3 text-xs gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                                      onClick={() => handleConvertOpportunityToDeal(opp)}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      신규 거래로 전환
                                    </Button>
                                  )}
                                  {opp.converted_deal_id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="mt-3 text-xs gap-1.5 text-blue-600"
                                      onClick={() => router.push(`/deals/${opp.converted_deal_id}`)}
                                    >
                                      <Briefcase className="h-3.5 w-3.5" />
                                      연결된 거래 보기
                                    </Button>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditOpportunity(opp)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:text-destructive"
                                    onClick={() => handleDeleteOpportunity(opp.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 활동 타임라인 */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">활동 타임라인</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActivitySortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                          className="gap-1 h-8"
                        >
                          {activitySortOrder === 'desc' ? (
                            <>
                              <ArrowDown className="h-3.5 w-3.5" />
                              최신순
                            </>
                          ) : (
                            <>
                              <ArrowUp className="h-3.5 w-3.5" />
                              오래된순
                            </>
                          )}
                        </Button>
                      </div>
                      <Button onClick={() => setDealData((prev) => ({ ...prev, showAddActivity: true }))} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        활동 추가
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {dealData.showAddActivity && (
                          <Card className="mb-4">
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="flex flex-col">
                                    <label className="text-xs text-muted-foreground mb-1">날짜</label>
                                    <Popover open={activityDateOpen} onOpenChange={setActivityDateOpen}>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="w-full justify-start text-left font-normal h-10 bg-transparent"
                                        >
                                          <Calendar className="mr-2 h-4 w-4" />
                                          {format(parseLocalDate(newActivity.activity_date), "yyyy-MM-dd")}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                        onInteractOutside={() => setActivityDateOpen(false)}
                                      >
                                        <CalendarComponent
                                          mode="single"
                                          selected={parseLocalDate(newActivity.activity_date)} // 로컬 시간 기준 파싱
                                          onSelect={(date) => {
                                            if (date) {
                                              const year = date.getFullYear()
                                              const month = String(date.getMonth() + 1).padStart(2, "0")
                                              const day = String(date.getDate()).padStart(2, "0")
                                              setNewActivity({
                                                ...newActivity,
                                                activity_date: `${year}-${month}-${day}`,
                                              })
                                              setActivityDateOpen(false)
                                            }
                                          }}
                                          locale={ko}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>

                                  <div className="flex flex-col">
                                    <label className="text-xs text-muted-foreground mb-1">활동</label>
                                    <Select
                                      value={newActivity.activity_type}
                                      onValueChange={(value) =>
                                        setNewActivity({ ...newActivity, activity_type: value })
                                      }
                                    >
                                      <SelectTrigger className="w-full h-10">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="통화">📞 통화</SelectItem>
                                        <SelectItem value="미팅">🤝 미팅</SelectItem>
                                        <SelectItem value="이메일">📧 이메일</SelectItem>
                                        <SelectItem value="문자">💬 문자</SelectItem>
                                        <SelectItem value="방문">🏢 방문</SelectItem>
                                        <SelectItem value="메모">📝 메모</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex flex-col">
                                    <label className="text-xs text-muted-foreground mb-1">담당자</label>
                                    <Select
                                      value={newActivity.assigned_to?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, '').trim() || "미정"}
                                      onValueChange={(value) => setNewActivity({ ...newActivity, assigned_to: value })}
                                    >
                                      <SelectTrigger className="w-full h-10">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="미정">미정</SelectItem>
                                        <SelectItem value="오일환">오일환</SelectItem>
                                        <SelectItem value="박상혁">박상혁</SelectItem>
                                        <SelectItem value="윤경호">윤경호</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <Textarea
                                  placeholder="활동 내용 입력... (이미지를 Ctrl+V로 붙여넣을 수 있습니다)"
                                  value={newActivity.content}
                                  onChange={(e) => setNewActivity({ ...newActivity, content: e.target.value })}
                                  onPaste={(e) => {
                                    const items = e.clipboardData.items
                                    const imageFiles: File[] = []
                                    for (const item of Array.from(items)) {
                                      if (item.type.startsWith("image/")) {
                                        const file = item.getAsFile()
                                        if (file) {
                                          const ext = file.type.split("/")[1] || "png"
                                          const named = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type })
                                          imageFiles.push(named)
                                        }
                                      }
                                    }
                                    if (imageFiles.length > 0) {
                                      e.preventDefault()
                                      setNewActivity((prev: any) => ({ ...prev, attachments: [...prev.attachments, ...imageFiles] }))
                                    }
                                  }}
                                  className="min-h-[100px]"
                                />

                                {newActivity.attachments.some((f: File) => f.type?.startsWith("image/")) && (
                                  <div className="flex flex-wrap gap-2">
                                    {newActivity.attachments.filter((f: File) => f.type?.startsWith("image/")).map((file: File, idx: number) => (
                                      <div key={idx} className="relative group">
                                        <img
                                          src={URL.createObjectURL(file)}
                                          alt={file.name}
                                          className="h-20 w-20 object-cover rounded border"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => {
                                            const allIdx = newActivity.attachments.indexOf(file)
                                            const newFiles = newActivity.attachments.filter((_: any, i: number) => i !== allIdx)
                                            setNewActivity({ ...newActivity, attachments: newFiles })
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div>
                                  <Label className="mb-2">첨부파일</Label>
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || [])
                                      setNewActivity((prev: any) => ({ ...prev, attachments: [...prev.attachments, ...files] }))
                                    }}
                                    className="cursor-pointer"
                                  />
                                  {newActivity.attachments.filter((f: File) => !f.type?.startsWith("image/")).length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {newActivity.attachments.filter((f: File) => !f.type?.startsWith("image/")).map((file: File, idx: number) => (
                                        <div
                                          key={idx}
                                          className="text-xs text-muted-foreground flex items-center gap-2"
                                        >
                                          <FileText className="h-3 w-3" />
                                          {file.name}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => {
                                              const allIdx = newActivity.attachments.indexOf(file)
                                              const newFiles = newActivity.attachments.filter((_: any, i: number) => i !== allIdx)
                                              setNewActivity({ ...newActivity, attachments: newFiles })
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {pendingQuotation && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-green-900">견적서 첨부됨</p>
                                        <p className="text-xs text-green-700">
                                          총액: ₩{pendingQuotation.totalAmount.toLocaleString("ko-KR")}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPendingQuotation(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2 justify-between">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowQuotationDialog(true)}
                                    className="gap-2"
                                  >
                                    <FileText className="h-4 w-4" />
                                    견적서 생성
                                  </Button>

                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setDealData((prev) => ({ ...prev, showAddActivity: false }))
                                        setNewActivity({
                                          activity_type: "통화",
                                          content: "",
                                          activity_date: getTodayDate(), // 로컬 시간 기준 (toISOString 사용 X)
                                          assigned_to: dealData.assigned_to || "오일환",
                                          attachments: [],
                                        })
                                        setPendingQuotation(null)
                                      }}
                                    >
                                      취소
                                    </Button>
                                    <Button size="sm" onClick={handleAddActivity}>
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {activities.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">아직 활동이 없습니다.</p>
                        ) : (
                          <div className="space-y-4">
                            {[...activities].sort((a, b) => {
                              const dateA = parseLocalDate(a.activity_date).getTime()
                              const dateB = parseLocalDate(b.activity_date).getTime()
                              return activitySortOrder === 'desc' ? dateB - dateA : dateA - dateB
                            }).map((activity) => {
                              const isEditing = !!editingActivity[activity.id]

                              return (
                                <Card
                                  key={activity.id}
                                  className={`relative transition-colors ${!isEditing ? "hover:bg-muted/50 cursor-pointer" : ""}`}
                                  onClick={!isEditing ? () => startEditActivity(activity) : undefined}
                                >
                                  <CardContent className="p-4">
                                    {isEditing ? (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="flex flex-col">
                                            <Label className="mb-2">날짜</Label>
                                            <Popover
                                              open={editingActivity[activity.id]?.calendarOpen}
                                              onOpenChange={(open) =>
                                                setEditingActivity((prev) => ({
                                                  ...prev,
                                                  [activity.id]: {
                                                    ...prev[activity.id],
                                                    calendarOpen: open,
                                                  },
                                                }))
                                              }
                                            >
                                              <PopoverTrigger asChild>
                                                <Button
                                                  variant="outline"
                                                  className="w-full justify-start text-left bg-transparent"
                                                >
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {format(
                                                    parseLocalDate(editingActivity[activity.id]?.activity_date),
                                                    "yyyy-MM-dd",
                                                  )}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent
                                                className="w-auto p-0"
                                                onInteractOutside={() =>
                                                  setEditingActivity((prev) => ({
                                                    ...prev,
                                                    [activity.id]: {
                                                      ...prev[activity.id],
                                                      calendarOpen: false,
                                                    },
                                                  }))
                                                }
                                              >
                                                <CalendarComponent
                                                  mode="single"
                                                  selected={
                                                    editingActivity[activity.id]?.activity_date
                                                      ? parseLocalDate(editingActivity[activity.id].activity_date)
                                                      : parseLocalDate(activity.activity_date)
                                                  }
                                                  onSelect={(date) => {
                                                    if (date) {
                                                      const year = date.getFullYear()
                                                      const month = String(date.getMonth() + 1).padStart(2, "0")
                                                      const day = String(date.getDate()).padStart(2, "0")
                                                      setEditingActivity({
                                                        ...editingActivity,
                                                        [activity.id]: {
                                                          ...editingActivity[activity.id],
                                                          activity_date: `${year}-${month}-${day}`,
                                                          calendarOpen: false,
                                                        },
                                                      })
                                                    }
                                                  }}
                                                  locale={ko} // ko locale 적용
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                          </div>

                                          <div className="flex flex-col">
                                            <Label className="mb-2">활동</Label>
                                            <Select
                                              value={editingActivity[activity.id]?.activity_type || "통화"}
                                              onValueChange={(value) =>
                                                setEditingActivity((prev) => ({
                                                  ...prev,
                                                  [activity.id]: {
                                                    ...prev[activity.id],
                                                    activity_type: value,
                                                  },
                                                }))
                                              }
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="통화">
                                                  <Phone className="inline h-4 w-4 mr-2 text-green-500" />
                                                  통화
                                                </SelectItem>
                                                <SelectItem value="미팅">
                                                  <Users className="inline h-4 w-4 mr-2 text-primary" />
                                                  미팅
                                                </SelectItem>
                                                <SelectItem value="이메일">
                                                  <Mail className="inline h-4 w-4 mr-2 text-purple-500" />
                                                  이메일
                                                </SelectItem>
                                                <SelectItem value="문자">
                                                  <MessageSquare className="inline h-4 w-4 mr-2 text-yellow-500" />
                                                  문자
                                                </SelectItem>
                                                <SelectItem value="방문">
                                                  <Building2 className="inline h-4 w-4 mr-2 text-orange-500" />
                                                  방문
                                                </SelectItem>
                                                <SelectItem value="메모">
                                                  <FileText className="inline h-4 w-4 mr-2 text-gray-500" />
                                                  메모
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          <div className="flex flex-col">
                                            <Label className="mb-2">담당자</Label>
                                            <Select
                                              value={editingActivity[activity.id]?.assigned_to?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, '').trim() || "미정"}
                                              onValueChange={(value) =>
                                                setEditingActivity((prev) => ({
                                                  ...prev,
                                                  [activity.id]: {
                                                    ...prev[activity.id],
                                                    assigned_to: value,
                                                  },
                                                }))
                                              }
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="미정">미정</SelectItem>
                                                <SelectItem value="오일환">오일환</SelectItem>
                                                <SelectItem value="박상혁">박상혁</SelectItem>
                                                <SelectItem value="윤경호">윤경호</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>

                                        <div>
                                          <Label className="mb-2">내용</Label>
                                          <Textarea
                                            value={editingActivity[activity.id]?.content || ""}
                                            onChange={(e) =>
                                              setEditingActivity((prev) => ({
                                                ...prev,
                                                [activity.id]: {
                                                  ...prev[activity.id],
                                                  content: e.target.value,
                                                },
                                              }))
                                            }
                                            placeholder="활동 내용을 입력하세요"
                                            rows={3}
                                          />
                                        </div>

                                        <div>
                                          <Label className="mb-2">첨부파일</Label>
                                          <Input
                                            type="file"
                                            multiple
                                            onChange={(e) => {
                                              if (e.target.files) {
                                                const newFiles = Array.from(e.target.files)
                                                setEditingActivity((prev) => ({
                                                  ...prev,
                                                  [activity.id]: {
                                                    ...prev[activity.id],
                                                    newAttachments: [
                                                      ...(prev[activity.id]?.newAttachments || []),
                                                      ...newFiles,
                                                    ],
                                                  },
                                                }))
                                              }
                                            }}
                                            className="cursor-pointer"
                                          />
                                          {/* 기존 첨부파일 표시 */}
                                          {editingActivity[activity.id]?.attachments &&
                                            editingActivity[activity.id].attachments.length > 0 && (
                                              <div className="mt-2 space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                                  기존 파일
                                                </div>
                                                {editingActivity[activity.id].attachments.map(
                                                  (att: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="text-xs text-muted-foreground flex items-center gap-2"
                                                    >
                                                      <FileText className="h-3 w-3" />
                                                      <span className="flex-1">{att.name}</span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0"
                                                        onClick={() => handleDeleteAttachment(activity.id, att.url)}
                                                      >
                                                        <X className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                          {/* 새로 추가할 파일 표시 */}
                                          {editingActivity[activity.id]?.newAttachments &&
                                            editingActivity[activity.id].newAttachments.length > 0 && (
                                              <div className="mt-2 space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                                  새 파일
                                                </div>
                                                {editingActivity[activity.id].newAttachments.map(
                                                  (file: File, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="text-xs text-muted-foreground flex items-center gap-2"
                                                    >
                                                      <FileText className="h-3 w-3" />
                                                      <span className="flex-1">{file.name}</span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0"
                                                        onClick={() => {
                                                          setEditingActivity((prev) => ({
                                                            ...prev,
                                                            [activity.id]: {
                                                              ...prev[activity.id],
                                                              newAttachments: prev[activity.id].newAttachments.filter(
                                                                (_: File, i: number) => i !== idx,
                                                              ),
                                                            },
                                                          }))
                                                        }}
                                                      >
                                                        <X className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                          <Button onClick={() => handleUpdateActivity(activity.id)} className="flex-1">
                                            저장
                                          </Button>
                                          <Button
                                            onClick={() => {
                                              const newEditingActivity = { ...editingActivity }
                                              delete newEditingActivity[activity.id]
                                              setEditingActivity(newEditingActivity)
                                            }}
                                            variant="outline"
                                            className="flex-1"
                                          >
                                            취소
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">{getActivityIcon(activity.activity_type)}</div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-foreground">
                                              {format(parseLocalDate(activity.activity_date), "MM.dd")} {activity.title}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-muted-foreground">
                                                {format(parseLocalDate(activity.activity_date), "yyyy-MM-dd")}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:text-destructive"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleDeleteActivity(activity.id)
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                                            {activity.content}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            {activity.assigned_to}
                                          </div>

                                          {/* 활동 타임라인에서 견적서 표시 (다중) */}
                                          {activity.quotations && activity.quotations.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                              {activity.quotations.map((q: any) => (
                                                <div key={q.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <p className="text-sm font-semibold text-purple-900">
                                                        💰 견적서: {q.quotation_number}
                                                      </p>
                                                      <p className="text-xs text-purple-700">
                                                        ₩{q.total_amount?.toLocaleString("ko-KR")} ({q.company})
                                                      </p>
                                                    </div>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedQuotation(q)
                                                        setShowQuotationDetail(true)
                                                      }}
                                                    >
                                                      견적서 보기
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 text-xs text-muted-foreground hover:text-purple-700 gap-1"
                                              onClick={() => {
                                                setQuotationTargetActivityId(activity.id)
                                                setShowQuotationDialog(true)
                                              }}
                                            >
                                              <Plus className="h-3 w-3" />
                                              견적서 추가
                                            </Button>
                                          </div>

                                          {activity.attachments && activity.attachments.length > 0 && (
                                            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                              {activity.attachments.filter((att: any) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(att.name)).length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                  {activity.attachments.filter((att: any) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(att.name)).map((att: any, idx: number) => (
                                                    <div key={idx} className="relative group">
                                                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                        <img src={att.url} alt={att.name} className="h-24 max-w-[200px] object-cover rounded border hover:opacity-80 transition-opacity" />
                                                      </a>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute top-0.5 right-0.5 h-5 w-5 p-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          handleDeleteAttachment(activity.id, att.url)
                                                        }}
                                                      >
                                                        <X className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {activity.attachments.filter((att: any) => !/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(att.name)).map((att: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="flex items-center gap-2 text-xs"
                                                >
                                                  <FileText className="h-3 w-3" />
                                                  <a
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                    download
                                                  >
                                                    {att.name}
                                                  </a>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 hover:text-destructive"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleDeleteAttachment(activity.id, att.url)
                                                    }}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </main>

        <div className="w-80 border-l border-border bg-card overflow-y-auto">
          <div className="p-6">
            <h3 className="font-semibold text-foreground mb-4">거래 기본 정보</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 오른쪽 사이드바의 첫 문의 날짜/시간 - 로컬 시간대 유지 */}
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-muted-foreground">첫 문의 날짜/시간</label>
                  <Input
                    type="datetime-local"
                    className="w-full mt-1"
                    value={
                      dealData.first_contact_date
                        ? dealData.first_contact_date.slice(0, 16) // ISO 문자열에서 직접 추출
                        : ""
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        const datetime = e.target.value.includes("T")
                          ? e.target.value + ":00"
                          : e.target.value + "T00:00:00"
                        handleUpdateDeal({ first_contact_date: datetime })
                      }
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">단계</label>
                  <select
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md"
                    value={dealData.stage || "S0_new_lead"}
                    onChange={(e) => {
                      const newStage = e.target.value
                      handleStageChange(newStage)
                    }}
                  >
                    <option value="S0_new_lead">S0_신규 유입</option>
                    <option value="S1_qualified">S1_유효 리드</option>
                    <option value="S2_consultation">S2_상담 완료</option>
                    <option value="S3_proposal">S3_제안 발송</option>
                    <option value="S4_decision">S4_결정 대기</option>
                    <option value="S5_complete">S5_계약완료</option>
                    <option value="S6_complete">S6_종료</option>
                  </select>
                </div>
                
                {/* 종료 사유 표시 (종료 단계일 때만) */}
                {(dealData.stage === "S6_complete" || dealData.stage === "S6_closed") && dealData.close_reason && (
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">종료 사유</label>
                    <div className="mt-1 px-3 py-2 text-sm border rounded-md bg-muted">
                      {getCloseReasonText(dealData.close_reason)}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">담당자</label>
                  <select
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md"
                    value={dealData.assigned_to?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, '').trim() || "미정"}
                    onChange={(e) => {
                      const newAssignedTo = e.target.value
                      handleUpdateAssignedTo(newAssignedTo)
                    }}
                  >
                    <option value="미정">미정</option>
                    <option value="오일환">오일환</option>
                    <option value="박상혁">박상혁</option>
                    <option value="윤경호">윤경호</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">등급</label>
                  <select
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md"
                    value={dealData.grade || ""}
                    onChange={(e) => {
                      const newGrade = e.target.value
                      handleUpdateDeal({ grade: newGrade })
                    }}
                  >
                    <option value="">선택하세요</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">우선권</label>
                  <select
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                    value={dealData.priority || ""}
                    onChange={(e) => {
                      const newPriority = e.target.value || null // 빈 값이면 null로 저장
                      handleUpdateDeal({ priority: newPriority })
                    }}
                  >
                    <option value="">선택 안함</option>
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">거래 예상 금액</label>
                  <div className="mt-1">
                    <div className="flex border rounded-md overflow-hidden mb-2">
                      <button
                        type="button"
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                          (dealData.deal_type || "one_time") === "one_time"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          setDealData((prev: any) => ({ ...prev, deal_type: "one_time" }))
                          handleUpdateDeal({ deal_type: "one_time" })
                        }}
                      >
                        건별
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                          dealData.deal_type === "recurring"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          setDealData((prev: any) => ({ ...prev, deal_type: "recurring" }))
                          handleUpdateDeal({ deal_type: "recurring" })
                        }}
                      >
                        월정액
                      </button>
                    </div>
                    {(dealData.deal_type || "one_time") === "one_time" ? (
                      <Input
                        type="text"
                        placeholder="금액 입력 (예: 1,500,000)"
                        className="w-full text-sm bg-background"
                        value={dealData.amount_range || ""}
                        onChange={(e) => {
                          const formatted = formatNumberWithCommas(e.target.value)
                          setDealData((prev: any) => ({ ...prev, amount_range: formatted }))
                        }}
                        onBlur={(e) => {
                          if (e.target.value) {
                            handleUpdateDeal({ amount_range: e.target.value })
                          }
                        }}
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="월 금액"
                            className="flex-1 text-sm bg-background"
                            value={dealData.monthly_amount || ""}
                            onChange={(e) => {
                              const formatted = formatNumberWithCommas(e.target.value)
                              const numericMonthly = Number(e.target.value.replace(/[^0-9]/g, "")) || 0
                              const months = dealData.duration_months || 0
                              const total = numericMonthly * months
                              const totalFormatted = total > 0 ? total.toLocaleString("ko-KR") : ""
                              setDealData((prev: any) => ({ ...prev, monthly_amount: formatted, amount_range: totalFormatted }))
                            }}
                            onBlur={() => {
                              handleUpdateDeal({ monthly_amount: dealData.monthly_amount, amount_range: dealData.amount_range })
                            }}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">×</span>
                          <Input
                            type="number"
                            placeholder="개월"
                            className="w-20 text-sm bg-background"
                            min={1}
                            value={dealData.duration_months || ""}
                            onChange={(e) => {
                              const months = parseInt(e.target.value) || 0
                              const numericMonthly = Number((dealData.monthly_amount || "").replace(/[^0-9]/g, "")) || 0
                              const total = numericMonthly * months
                              const totalFormatted = total > 0 ? total.toLocaleString("ko-KR") : ""
                              setDealData((prev: any) => ({ ...prev, duration_months: months || "", amount_range: totalFormatted }))
                            }}
                            onBlur={() => {
                              handleUpdateDeal({ duration_months: dealData.duration_months || null, amount_range: dealData.amount_range })
                            }}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">개월</span>
                        </div>
                        {dealData.monthly_amount && dealData.duration_months ? (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                            총 예상 금액: <span className="font-semibold text-foreground">{dealData.amount_range || "0"}</span>원
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                {/* S6_종료 단계일 때는 다음 연락일 비활성화 */}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-foreground">다음 연락일</label>
                  {/* S6_종료 단계일 때는 다음 연락일 비활성화 */}
                  <Popover open={nextContactDateOpen} onOpenChange={setNextContactDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isClosedStage}
                        className={cn(
                          "w-full mt-1 h-10 justify-start text-left font-normal text-sm",
                          !dealData.next_contact_date && "text-muted-foreground",
                          isClosedStage && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {/* S6_종료 단계일 때는 다음 연락일 비활성화 */}
                        {isClosedStage
                          ? "종료된 거래"
                          : dealData.next_contact_date
                            ? format(parseLocalDate(dealData.next_contact_date), "PPP", { locale: ko })
                            : "날짜를 선택하세요"}
                      </Button>
                    </PopoverTrigger>
                    {/* S6_종료 단계일 때는 다음 연락일 비활성화 */}
                    {!isClosedStage && (
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dealData.next_contact_date ? parseLocalDate(dealData.next_contact_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, "0")
                              const day = String(date.getDate()).padStart(2, "0")
                              const formattedDate = `${year}-${month}-${day}`
                              handleUpdateDeal({ next_contact_date: formattedDate })
                              setNextContactDateOpen(false)
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    )}
                  </Popover>
                </div>

                {/* 메모 */}
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">메모</label>
                  <Textarea
                    className="w-full mt-1 min-h-[80px] text-sm"
                    placeholder="메모를 입력하세요..."
                    value={localNotes}
                    onChange={(e) => {
                      setLocalNotes(e.target.value)
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== (dealData.account?.notes || "")) {
                        handleUpdateAccount({ notes: e.target.value })
                      }
                    }}
                  />
                </div>

                {/* 계약 확정 정보 */}
                {dealData.contract_info && (
                  <div className="col-span-2 mt-2 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      계약 확정
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 px-2 gap-1 text-xs"
                        onClick={() => copyContractText(dealData.contract_info, "sidebar")}
                      >
                        {copiedContractId === "sidebar" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedContractId === "sidebar" ? "복사됨" : "복사"}
                      </Button>
                    </h4>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md text-xs space-y-1">
                      {[
                        { key: "target", label: "대        상" },
                        { key: "name", label: "명        칭" },
                        { key: "status", label: "현        황" },
                        { key: "needs", label: "니        즈" },
                        { key: "inflow_source", label: "유입경로" },
                        { key: "conditions", label: "조        건" },
                        { key: "cost", label: "비        용" },
                        { key: "invoice_date", label: "계  산  서" },
                        { key: "contract_date", label: "계  약  일" },
                        { key: "work_start_date", label: "업무시작" },
                        { key: "reason_ids", label: "결정사유" },
                        { key: "notes", label: "비        고" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-semibold whitespace-pre text-green-800 dark:text-green-200 shrink-0">{label}</span>
                          <span className="text-green-700 dark:text-green-300">: {
                            key === "reason_ids"
                              ? getReasonNames(dealData.contract_info.reason_ids || []) || "-"
                              : dealData.contract_info[key] || "-"
                          }</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={() => {
                        setContractConfirmData({ ...dealData.contract_info, reason_ids: dealData.contract_info.reason_ids || [] })
                        setShowContractConfirmDialog(true)
                      }}
                    >
                      수정
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <CreateQuotationDialog
        open={showQuotationDialog}
        onOpenChange={(open) => {
          setShowQuotationDialog(open)
          if (!open) setQuotationTargetActivityId(null)
        }}
        clientId={resolvedId}
        activityId={quotationTargetActivityId || undefined}
        onSuccess={(quotationId, totalAmount) => {
          if (quotationTargetActivityId) {
            loadActivities()
            setQuotationTargetActivityId(null)
          } else {
            setPendingQuotation({ quotationId, totalAmount })
          }
        }}
      />
      {/* 견적서 상세 다이얼로그 */}
      {selectedQuotation && (
        <QuotationViewDialog
          open={showQuotationDetail}
          onOpenChange={setShowQuotationDetail}
          quotation={selectedQuotation}
          clientName={dealData.account?.company_name || ""}
          onDelete={() => { loadActivities(); setSelectedQuotation(null) }}
        />
      )}
      
      {/* 종료 사유 선택 다이얼로그 */}
      <CloseReasonDialog
        open={showCloseReasonDialog}
        onOpenChange={(open) => {
          setShowCloseReasonDialog(open)
          if (!open) {
            setPendingStageChange(null)
          }
        }}
        onConfirm={handleCloseReasonConfirm}
        dealName={dealData.deal_name}
      />

      {/* 계약 확정 정보 다이얼로그 */}
      <Dialog open={showContractConfirmDialog} onOpenChange={(open) => {
        setShowContractConfirmDialog(open)
        if (!open) setPendingStageChange(null)
      }}>
        <DialogContent className="!max-w-[420px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>계약 확정 정보 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            {[
              { key: "target", label: "대상" },
              { key: "name", label: "명칭" },
              { key: "status", label: "현황" },
              { key: "needs", label: "니즈" },
              { key: "inflow_source", label: "유입경로" },
              { key: "conditions", label: "조건" },
              { key: "cost", label: "비용" },
              { key: "invoice_date", label: "계산서" },
              { key: "contract_date", label: "계약일" },
              { key: "work_start_date", label: "업무시작" },
              { key: "notes", label: "비고" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-xs font-semibold w-14 shrink-0 text-right">{label}</label>
                <Input
                  className="flex-1 text-sm h-8"
                  value={(contractConfirmData as any)[key] || ""}
                  onChange={(e) => setContractConfirmData(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={key === "conditions" ? "예: 선금 50% / 완납금 50%" : key === "invoice_date" || key === "work_start_date" ? "예: 2026.02.19" : ""}
                />
              </div>
            ))}

            <div className="pt-1">
              <label className="text-xs font-semibold">결정 사유</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {contractReasonOptions.map((reason) => {
                  const selected = contractConfirmData.reason_ids.includes(reason.id)
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                      onClick={() => {
                        setContractConfirmData(prev => ({
                          ...prev,
                          reason_ids: selected
                            ? prev.reason_ids.filter(id => id !== reason.id)
                            : [...prev.reason_ids, reason.id]
                        }))
                      }}
                    >
                      {reason.value}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-2.5 bg-muted/50 rounded-lg text-xs whitespace-pre-line font-mono leading-relaxed">
              {getContractPlainText()}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => copyContractText()}
              >
                {copiedContractId === "default" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedContractId === "default" ? "복사됨!" : "복사"}
              </Button>
              <Button
                className="flex-1"
                onClick={handleContractConfirm}
              >
                저장 및 계약 완료
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 계약 추가/수정 다이얼로그 */}
      <Dialog open={showContractDialog} onOpenChange={(open) => {
        setShowContractDialog(open)
        if (!open) resetContractForm()
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContract ? "계약 수정" : "계약 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>계약명 *</Label>
              <Input
                value={contractForm.contract_name}
                onChange={(e) => setContractForm(prev => ({ ...prev, contract_name: e.target.value }))}
                placeholder="계약명을 입력하세요"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>서비스 종류</Label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  value={contractForm.service_type}
                  onChange={(e) => setContractForm(prev => ({ ...prev, service_type: e.target.value }))}
                >
                  <option value="">선택하세요</option>
                  {serviceTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>계약 금액</Label>
                <Input
                  value={contractForm.contract_amount}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value)
                    setContractForm(prev => ({ ...prev, contract_amount: formatted }))
                  }}
                  placeholder="예: 10,000,000"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>계약일</Label>
                <Input
                  type="date"
                  value={contractForm.contract_date}
                  onChange={(e) => setContractForm(prev => ({ ...prev, contract_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={contractForm.start_date}
                  onChange={(e) => setContractForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={contractForm.end_date}
                  onChange={(e) => setContractForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <select
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                value={contractForm.status}
                onChange={(e) => setContractForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="진행중">진행중</option>
                <option value="완료">완료</option>
                <option value="만료">만료</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={contractForm.notes}
                onChange={(e) => setContractForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowContractDialog(false)
              resetContractForm()
            }}>
              취소
            </Button>
            <Button onClick={handleSaveContract}>
              {editingContract ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 영업 기회 추가/수정 다이얼로그 */}
      <Dialog open={showOpportunityDialog} onOpenChange={(open) => {
        setShowOpportunityDialog(open)
        if (!open) resetOpportunityForm()
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOpportunity ? "영업 기회 수정" : "영업 기회 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>기회 유형 *</Label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  value={opportunityForm.opportunity_type}
                  onChange={(e) => setOpportunityForm(prev => ({ ...prev, opportunity_type: e.target.value }))}
                >
                  <option value="업셀">업셀</option>
                  <option value="크로스셀">크로스셀</option>
                  <option value="재계약">재계약</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  value={opportunityForm.status}
                  onChange={(e) => setOpportunityForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="발굴">발굴</option>
                  <option value="제안중">제안중</option>
                  <option value="협상중">협상중</option>
                  <option value="성사">성사</option>
                  <option value="무산">무산</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>기회 제목 *</Label>
              <Input
                value={opportunityForm.title}
                onChange={(e) => setOpportunityForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="예: 모바일 앱 추가 개발"
              />
            </div>
            <div className="space-y-2">
              <Label>상세 내용</Label>
              <Textarea
                value={opportunityForm.description}
                onChange={(e) => setOpportunityForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="기회에 대한 상세 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>예상 금액</Label>
                <Input
                  value={opportunityForm.expected_amount}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value)
                    setOpportunityForm(prev => ({ ...prev, expected_amount: formatted }))
                  }}
                  placeholder="예: 5,000,000"
                />
              </div>
              <div className="space-y-2">
                <Label>가능성</Label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  value={opportunityForm.probability}
                  onChange={(e) => setOpportunityForm(prev => ({ ...prev, probability: e.target.value }))}
                >
                  <option value="높음">높음</option>
                  <option value="중간">중간</option>
                  <option value="낮음">낮음</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>목표 시기</Label>
                <Input
                  type="date"
                  value={opportunityForm.target_date}
                  onChange={(e) => setOpportunityForm(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
            </div>
            {contracts.length > 0 && (
              <div className="space-y-2">
                <Label>연관 계약</Label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  value={opportunityForm.related_contract_id}
                  onChange={(e) => setOpportunityForm(prev => ({ ...prev, related_contract_id: e.target.value }))}
                >
                  <option value="">선택하세요 (선택사항)</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contract_name} {contract.service_type ? `(${contract.service_type})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={opportunityForm.notes}
                onChange={(e) => setOpportunityForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOpportunityDialog(false)
              resetOpportunityForm()
            }}>
              취소
            </Button>
            <Button onClick={handleSaveOpportunity}>
              {editingOpportunity ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
