"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Filter, Plus, MoreVertical, Building2, User, AlertCircle, Clock, ArrowUpDown, X, ArrowUp, ArrowDown, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import CrmSidebar from "@/components/crm-sidebar"
import CrmHeader from "@/components/crm-header"
import AddDealDialog from "@/components/add-deal-dialog"
import { createBrowserClient } from "@/lib/supabase/client"
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

const getStageStyle = (stage: string) => {
  const stageGroup = stage
  switch (stageGroup) {
    case "todo":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "inProgress":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "done":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    default:
      return ""
  }
}

const getKSTToday = () => {
  const now = new Date()
  // UTC 시간에 9시간(540분)을 더해 한국 시간으로 변환
  const kstOffset = 9 * 60 // 540분
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const kstTime = new Date(utcTime + kstOffset * 60000)
  // 시간을 00:00:00으로 설정하여 날짜만 비교
  kstTime.setHours(0, 0, 0, 0)
  return kstTime
}

// 날짜 문자열을 로컬 시간 기준 Date 객체로 변환 (타임존 문제 방지)
const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date()
  // "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm:ss" 형식 처리
  const datePart = dateString.split("T")[0]
  const [year, month, day] = datePart.split("-").map(Number)
  return new Date(year, month - 1, day) // 로컬 시간 기준으로 생성
}

const formatDateToYYYYMMDD = (dateString: string) => {
  const date = parseLocalDate(dateString) // 로컬 시간 기준 파싱
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDate = (dateString: string) => {
  const date = parseLocalDate(dateString) // 로컬 시간 기준 파싱
  const today = getKSTToday() // 한국 시간 기준으로 변경
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "오늘"
  if (diffDays === 1) return "1일 전"
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주일 전`
  return `${Math.floor(diffDays / 30)}개월 전`
}

const getChosung = (str: string) => {
  const CHOSUNG_LIST = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ]
  let result = ""

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xac00
    if (code > -1 && code < 11172) {
      result += CHOSUNG_LIST[Math.floor(code / 588)]
    } else {
      // 공백이나 특수문자는 제거
      if (str[i] !== " ") {
        result += str[i]
      }
    }
  }
  return result
}

const isChosungSearch = (text: string) => {
  const CHOSUNG_LIST = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ]
  return text.split("").every((char) => CHOSUNG_LIST.includes(char))
}

export default function DealsPage() {
  const router = useRouter()
  const mainRef = useRef<HTMLElement>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStages, setSelectedStages] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deals-stage-filter")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [selectedAmounts, setSelectedAmounts] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deals-amount-filter")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [selectedContacts, setSelectedContacts] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deals-assignee-filter")
      if (saved) {
        // 기존 저장된 값에서 직함 제거하여 정규화
        const parsed = JSON.parse(saved)
        const normalized = parsed.map((name: string) => 
          name.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, '').trim()
        )
        // 정규화된 값으로 localStorage 업데이트
        localStorage.setItem("deals-assignee-filter", JSON.stringify(normalized))
        return normalized
      }
      return []
    }
    return []
  })
  const [isStageFilterOpen, setIsStageFilterOpen] = useState(false)
  const [isAmountFilterOpen, setIsAmountFilterOpen] = useState(false)
  const [isContactFilterOpen, setIsContactFilterOpen] = useState(false)
  const [isNeedsFilterOpen, setIsNeedsFilterOpen] = useState(false)
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deals-needs-filter")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deals-company-filter")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [settingsNeedsOptions, setSettingsNeedsOptions] = useState<string[]>([])
  const [isAddDealOpen, setIsAddDealOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // 컬럼별 정렬 상태 (localStorage에서 복원)
  const [columnSort, setColumnSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("oort-crm-column-sort")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  // 컬럼 순서 (고정)
  const columnOrder = [
    { id: "rowNumber", label: "No.", align: "center", width: "w-12" },
    { id: "firstContact", label: "첫 문의 날짜", align: "center" },
    { id: "name", label: "상호명", align: "center" },
    { id: "needsSummary", label: "니즈 축약", align: "center" },
    { id: "stage", label: "단계", align: "center" },
    { id: "priority", label: "우선권", align: "center" },
    { id: "grade", label: "등급", align: "center" },
    { id: "value", label: "거래 예상 금액", align: "center" },
    { id: "contact", label: "담당자", align: "center" },
    { id: "nextContact", label: "다음 연락일", align: "center" },
    { id: "lastActivity", label: "마지막 활동일", align: "center" },
  ]

  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dealToDelete, setDealToDelete] = useState<{ id: string; name: string; accountId: string | null } | null>(null)
  const [deleteAccount, setDeleteAccount] = useState(false)

  const getStageDisplay = (stage: string) => {
    const stageMap: Record<string, string> = {
      S0_new_lead: "S0_신규 유입",
      S1_qualified: "S1_유효 리드",
      S2_contact: "S2_상담 완료",
      S2_consultation: "S2_상담 완료",
      S3_proposal: "S3_제안 발송",
      S4_negotiation: "S4_결정 대기",
      S4_decision: "S4_결정 대기",
      S4_closed_won: "S4_결정 대기", // 옛날 값
      S5_contract: "S5_계약완료",
      S5_complete: "S5_계약완료",
      S6_closed: "S6_종료", // 옛날 값
      S6_complete: "S6_종료",
      S7_recontact: "S7_재접촉",
    }
    return stageMap[stage] || stage
  }

  const getStageGroup = (stage: string) => {
    if (stage === "S0_new_lead") return "todo"
    if (
      [
        "S1_qualified",
        "S2_contact",
        "S2_consultation",
        "S3_proposal",
        "S4_negotiation",
        "S4_decision",
        "S4_closed_won",
      ].includes(stage)
    )
      return "inProgress"
    if (["S5_contract", "S5_complete", "S6_closed", "S6_complete", "S7_recontact"].includes(stage)) return "done"
    return "todo"
  }

  const getNextContactStatus = (dateString: string | null) => {
    // null 체크 추가
    if (!dateString) {
      return {
        text: "-",
        className: "text-muted-foreground",
        icon: null,
        badge: null,
        badgeClassName: "",
      }
    }

    const date = parseLocalDate(dateString) // 로컬 시간 기준 파싱
    date.setHours(0, 0, 0, 0) // 시간을 00:00:00으로 설정
    const today = getKSTToday() // 한국 시간 기준으로 변경
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        text: dateString,
        className: "bg-red-100 text-red-700 border border-red-300 rounded-md px-2 py-1 font-semibold animate-pulse",
        icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
        badge: "지남",
        badgeClassName: "bg-red-600 text-white ml-2",
      }
    }

    if (diffDays === 0) {
      return {
        text: dateString,
        className: "bg-yellow-100 text-yellow-800 border border-yellow-400 rounded-md px-2 py-1 font-bold",
        icon: <Clock className="h-3.5 w-3.5 mr-1" />,
        badge: "오늘!",
        badgeClassName: "bg-yellow-600 text-white ml-2",
      }
    }

    if (diffDays <= 2) {
      return {
        text: dateString,
        className: "bg-orange-100 text-orange-700 border border-orange-300 rounded-md px-2 py-1 font-semibold",
        icon: <Clock className="h-3.5 w-3.5 mr-1" />,
        badge: `${diffDays}일 후`,
        badgeClassName: "bg-orange-600 text-white ml-2",
      }
    }

    return {
      text: dateString,
      className: "text-muted-foreground",
      icon: null,
      badge: null,
      badgeClassName: "",
    }
  }

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return

    try {
      const supabase = createBrowserClient()

      await supabase.from("activities").delete().eq("deal_id", dealToDelete.id)

      const { error: dealError } = await supabase.from("deals").delete().eq("id", dealToDelete.id)
      if (dealError) throw dealError

      if (deleteAccount && dealToDelete.accountId) {
        const { error: accountError } = await supabase.from("accounts").delete().eq("id", dealToDelete.accountId)
        if (accountError) {
          console.error("[v0] 연락처 삭제 실패:", accountError)
        }
      }

      loadDeals()

      setDeleteDialogOpen(false)
      setDealToDelete(null)
      setDeleteAccount(false)
    } catch (error) {
      console.error("[v0] 거래 삭제 실패:", error)
      alert("거래 삭제에 실패했습니다.")
    }
  }

  const openDeleteDialog = (dealId: string, dealName: string, accountId: string | null) => {
    setDealToDelete({ id: dealId, name: dealName, accountId })
    setDeleteAccount(false)
    setDeleteDialogOpen(true)
  }

  useEffect(() => {
    loadDeals()
    loadSettingsNeeds()
  }, [])

  // settings 테이블에서 니즈 축약 목록 로드
  const loadSettingsNeeds = async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("category", "needs")
        .order("display_order")
      
      if (!error && data) {
        setSettingsNeedsOptions(data.map((n) => n.value))
      }
    } catch (error) {
      console.error("[v0] 니즈 설정 로드 실패:", error)
    }
  }

  // 스크롤 위치 복원 (deals 로드 완료 후 한 번만 실행)
  const [scrollRestored, setScrollRestored] = useState(false)
  useEffect(() => {
    if (deals.length > 0 && !scrollRestored) {
      const savedScrollPosition = sessionStorage.getItem("deals-scroll-position")
      if (savedScrollPosition && mainRef.current) {
        // 렌더링 완료 후 스크롤 복원
        requestAnimationFrame(() => {
          if (mainRef.current) {
            mainRef.current.scrollTop = parseInt(savedScrollPosition, 10)
          }
        })
      }
      setScrollRestored(true)
    }
  }, [deals.length, scrollRestored])

  // 거래처 클릭 시 스크롤 위치 저장
  const saveScrollPosition = () => {
    if (mainRef.current) {
      sessionStorage.setItem("deals-scroll-position", mainRef.current.scrollTop.toString())
    }
  }

  const loadDeals = async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          account:accounts(company_name, industry),
          contact:contacts(name, email)
        `)
        .order("next_contact_date", { ascending: true })

      if (error) throw error

      const dealsData = data.map((deal: any) => {
        return {
          id: deal.id,
          firstContact: deal.first_contact_date ? formatDateToYYYYMMDD(deal.first_contact_date) : "-",
          name: deal.account?.company_name || deal.deal_name || "-",
          needsSummary: deal.needs_summary || "-",
          stage: deal.stage || "S0_new_lead",
          stageDisplay: getStageDisplay(deal.stage),
          grade: deal.grade || "-",
          priority: deal.priority || "-",
          value: deal.amount_range || "-",
          contact: deal.assigned_to || "미정",
          lastActivity: deal.updated_at ? formatDate(deal.updated_at.split("T")[0]) : "-",
          nextContact: deal.next_contact_date || null,
          account_id: deal.account_id,
          company: deal.company || "",
        }
      })

      setDeals(dealsData || [])
    } catch (error) {
      console.error("[v0] 거래 데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const dealsWithDisplayData = deals.map((deal: any) => ({
    id: deal.id,
    name: deal.name,
    firstContact: deal.firstContact,
    needsSummary: deal.needsSummary,
    account: deal.account?.company_name || "거래처 없음",
    stageDisplay: deal.stageDisplay,
    stage: deal.stage,
    contact: deal.contact,
    value: deal.value,
    lastActivity: deal.lastActivity,
    account_id: deal.account_id,
    grade: deal.grade,
    priority: deal.priority,
    nextContact: deal.nextContact,
    company: deal.company,
  }))

  const amountRangeOptions = [
    { id: "under500", label: "500만원 이하" },
    { id: "500to1000", label: "500 ~ 1000만원" },
    { id: "1000to2000", label: "1000 ~ 2000만원" },
    { id: "2000to3000", label: "2000 ~ 3000만원" },
    { id: "over3000", label: "3000만원 이상" },
    { id: "over1uk", label: "1억 이상" },
    { id: "notEntered", label: "미입력 / 내부 검토" },
    { id: "undecided", label: "미확정" },
  ]

  const contactOptions = [
    { id: "오일환", label: "오일환" },
    { id: "박상혁", label: "박상혁" },
    { id: "윤경호", label: "윤경호" },
    { id: "미정", label: "미정" },
  ]

  // settings에서 가져온 니즈 목록 + 미분류 옵션
  const needsOptions = useMemo(() => {
    const options = settingsNeedsOptions.map(needs => ({ id: needs, label: needs }))
    // 미분류 옵션 추가 (settings에 없는 니즈를 가진 거래처)
    options.push({ id: "__unclassified__", label: "미분류" })
    return options
  }, [settingsNeedsOptions])

  // 회사 필터 옵션
  const companyOptions = [
    { id: "__all__", label: "전체" },
    { id: "플루타", label: "플루타" },
    { id: "오코랩스", label: "오코랩스" },
    { id: "__none__", label: "미지정" },
  ]

  // 담당자명에서 직함 제거 함수
  const getNameOnly = (fullName: string) => {
    if (!fullName) return fullName
    return fullName.replace(/(대표|과장|사원|팀장|부장|차장|이사|사장)$/, '').trim()
  }

  const toggleStage = (stageId: string) => {
    setSelectedStages((prev) => {
      const newValue = prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
      if (typeof window !== "undefined") {
        localStorage.setItem("deals-stage-filter", JSON.stringify(newValue))
      }
      return newValue
    })
  }

  const toggleAmountRange = (rangeId: string) => {
    setSelectedAmounts((prev) => {
      const newValue = prev.includes(rangeId) ? prev.filter((id) => id !== rangeId) : [...prev, rangeId]
      if (typeof window !== "undefined") {
        localStorage.setItem("deals-amount-filter", JSON.stringify(newValue))
      }
      return newValue
    })
  }

  const toggleContact = (contactId: string) => {
    setSelectedContacts((prev) => {
      const newValue = prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
      if (typeof window !== "undefined") {
        localStorage.setItem("deals-assignee-filter", JSON.stringify(newValue))
      }
      return newValue
    })
  }

  const toggleNeeds = (needsId: string) => {
    setSelectedNeeds((prev) => {
      const newValue = prev.includes(needsId) ? prev.filter((id) => id !== needsId) : [...prev, needsId]
      if (typeof window !== "undefined") {
        localStorage.setItem("deals-needs-filter", JSON.stringify(newValue))
      }
      return newValue
    })
  }

  const toggleCompany = (companyId: string) => {
    // "전체" 선택 시 다른 모든 필터 해제
    if (companyId === "__all__") {
      setSelectedCompanies([])
      if (typeof window !== "undefined") {
        localStorage.removeItem("deals-company-filter")
      }
      return
    }

    setSelectedCompanies((prev) => {
      const newValue = prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
      if (typeof window !== "undefined") {
        localStorage.setItem("deals-company-filter", JSON.stringify(newValue))
      }
      return newValue
    })
  }

  // 모든 필터 초기화
  const clearAllFilters = () => {
    setSelectedStages([])
    setSelectedAmounts([])
    setSelectedContacts([])
    setSelectedNeeds([])
    setSelectedCompanies([])
    setSearchTerm("")
    setColumnSort(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem("deals-stage-filter")
      localStorage.removeItem("deals-amount-filter")
      localStorage.removeItem("deals-assignee-filter")
      localStorage.removeItem("deals-needs-filter")
      localStorage.removeItem("deals-company-filter")
    }
  }

  // 필터가 적용되어 있는지 확인
  const hasActiveFilters = selectedStages.length > 0 || selectedAmounts.length > 0 || selectedContacts.length > 0 || selectedNeeds.length > 0 || selectedCompanies.length > 0 || searchTerm.length > 0

  const filterByAmount = (deals: typeof dealsWithDisplayData) => {
    if (selectedAmounts.length === 0) return deals

    return deals.filter((deal) => {
      return selectedAmounts.some((rangeId) => {
        const option = amountRangeOptions.find((opt) => opt.id === rangeId)
        return option && deal.value === option.label
      })
    })
  }

  const filterByStage = (deals: typeof dealsWithDisplayData) => {
    if (selectedStages.length === 0) return deals

    return deals.filter((deal) => {
      if (selectedStages.includes("empty") && (!deal.stage || deal.stage.trim() === "")) {
        return true
      }

      const stageMap: Record<string, string[]> = {
        "S0_신규 유입": ["S0_신규 유입", "S0_new_lead"],
        "S1_유효 리드": ["S1_유효 리드", "S1_qualified", "S1_유효리드"],
        "S2_상담 완료": ["S2_상담 완료", "S2_consultation", "S2_contact"],
        "S3_제안 발송": ["S3_제안 발송", "S3_proposal"],
        "S4_결정 대기": ["S4_결정 대기", "S4_협상", "S4_negotiation", "S4_decision", "S4_closed_won"],
        "S5_계약완료": ["S5_계약완료", "S5_계약 완료", "S5_complete", "S5_contract"],
        "S6_종료": ["S6_종료", "S6_complete", "S6_closed"],
        "S7_재접촉": ["S7_재접촉", "S7_recontact"],
      }

      // 선택된 단계에 해당하는 모든 가능한 DB 값 확인
      return selectedStages.some((selectedStage) => {
        const possibleValues = stageMap[selectedStage] || [selectedStage]
        return possibleValues.includes(deal.stage)
      })
    })
  }

  const filterByContact = (deals: typeof dealsWithDisplayData) => {
    if (selectedContacts.length === 0) return deals

    return deals.filter((deal) => {
      // 기존 데이터 호환성: "오일환 대표" → "오일환" 포함 체크
      const contactName = deal.contact?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, '').trim() || ''
      return selectedContacts.includes(deal.contact) || selectedContacts.includes(contactName)
    })
  }

  const filterByNeeds = (deals: typeof dealsWithDisplayData) => {
    if (selectedNeeds.length === 0) return deals

    return deals.filter((deal) => {
      // 미분류 선택 시: settings에 없는 니즈를 가진 거래처 필터링
      if (selectedNeeds.includes("__unclassified__")) {
        const isUnclassified = deal.needsSummary === "-" || 
          !settingsNeedsOptions.includes(deal.needsSummary)
        if (isUnclassified) return true
      }
      // 일반 니즈 필터링
      return selectedNeeds.includes(deal.needsSummary)
    })
  }

  const filterByCompany = (deals: typeof dealsWithDisplayData) => {
    if (selectedCompanies.length === 0) return deals

    return deals.filter((deal) => {
      // 미지정 선택 시: company가 비어있는 거래처
      if (selectedCompanies.includes("__none__")) {
        if (!deal.company || deal.company.trim() === "") return true
      }
      // 일반 회사 필터링
      return selectedCompanies.includes(deal.company)
    })
  }

  const filterBySearch = (deals: typeof dealsWithDisplayData) => {
    if (!searchTerm) return deals
    const search = searchTerm.toLowerCase()

    if (isChosungSearch(searchTerm)) {
      return deals.filter(
        (deal) =>
          getChosung(deal.name).includes(searchTerm) ||
          getChosung(deal.contact).includes(searchTerm) ||
          getChosung(deal.stage).includes(searchTerm),
      )
    }

    return deals.filter(
      (deal) =>
        deal.name.toLowerCase().includes(search) ||
        deal.contact.toLowerCase().includes(search) ||
        deal.stage.toLowerCase().includes(search),
    )
  }

  // 정렬 기준 상태: 'nextContact' (다음 연락일) 또는 'firstContact' (첫 문의 날짜)
  const [sortBy, setSortBy] = useState<'nextContact' | 'firstContact'>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deals-sort-by")
      return (saved as 'nextContact' | 'firstContact') || 'nextContact'
    }
    return 'nextContact'
  })

  // 종료 단계 확인 함수
  const isClosedStage = (stage: string) => {
    return ['S5_complete', 'S5_contract', 'S6_complete', 'S6_closed'].includes(stage)
  }

  // 컬럼 정렬 함수
  const sortByColumn = (deals: typeof dealsWithDisplayData) => {
    if (!columnSort) {
      // 기본 정렬: 종료 단계는 아래로, 그 다음 sortBy 기준
      return deals.sort((a, b) => {
        const isClosedA = isClosedStage(a.stage)
        const isClosedB = isClosedStage(b.stage)
        
        if (isClosedA && !isClosedB) return 1
        if (!isClosedA && isClosedB) return -1

        if (sortBy === 'firstContact') {
          if (a.firstContact === '-' && b.firstContact === '-') return 0
          if (a.firstContact === '-') return 1
          if (b.firstContact === '-') return -1
          return parseLocalDate(b.firstContact).getTime() - parseLocalDate(a.firstContact).getTime()
        } else {
      if (!a.nextContact && !b.nextContact) return 0
          if (!a.nextContact) return 1
          if (!b.nextContact) return -1
          return parseLocalDate(a.nextContact).getTime() - parseLocalDate(b.nextContact).getTime()
        }
      })
    }

    const { column, direction } = columnSort
    const multiplier = direction === 'asc' ? 1 : -1

    return [...deals].sort((a, b) => {
      let aVal: any = a[column as keyof typeof a]
      let bVal: any = b[column as keyof typeof b]

      // 날짜 컬럼 처리
      if (column === 'firstContact' || column === 'nextContact') {
        if (aVal === '-' || !aVal) aVal = null
        if (bVal === '-' || !bVal) bVal = null
        if (!aVal && !bVal) return 0
        if (!aVal) return 1 * multiplier
        if (!bVal) return -1 * multiplier
        return (parseLocalDate(aVal).getTime() - parseLocalDate(bVal).getTime()) * multiplier
      }

      // 문자열 컬럼 처리
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        if (aVal === '-') aVal = ''
        if (bVal === '-') bVal = ''
        return aVal.localeCompare(bVal, 'ko') * multiplier
      }

      return 0
    })
  }

  const filteredDeals = sortByColumn(filterByCompany(filterByNeeds(filterBySearch(filterByContact(filterByAmount(filterByStage(dealsWithDisplayData)))))))

  const handleSortChange = (newSortBy: 'nextContact' | 'firstContact') => {
    setSortBy(newSortBy)
    if (typeof window !== "undefined") {
      localStorage.setItem("deals-sort-by", newSortBy)
    }
  }

  // 정렬 상태 변경 시 localStorage에 저장
  const handleColumnSort = (columnId: string) => {
    const newSort = columnSort?.column === columnId
      ? { column: columnId, direction: columnSort.direction === 'asc' ? 'desc' as const : 'asc' as const }
      : { column: columnId, direction: 'asc' as const }
    
    setColumnSort(newSort)
    if (typeof window !== "undefined") {
      localStorage.setItem("oort-crm-column-sort", JSON.stringify(newSort))
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">거래 데이터 로딩중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <CrmHeader />

        <main ref={mainRef} className="flex-1 overflow-y-auto p-2 xl:p-6">
          <div className="border-b bg-background p-4 xl:p-6">
            <div className="mb-4 xl:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl xl:text-3xl font-bold">영업 현황</h1>
                <p className="text-sm text-muted-foreground">진행 중인 영업 현황을 관리하세요</p>
              </div>
              <Button onClick={() => setIsAddDealOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                거래 추가
              </Button>
            </div>

            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 xl:gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="거래 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2 xl:gap-4">

              {/* 회사 필터 */}
              <Popover open={isCompanyFilterOpen} onOpenChange={setIsCompanyFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Building2 className="h-4 w-4" />
                    회사
                    {selectedCompanies.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2">
                        {selectedCompanies.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">회사 선택</div>
                    <div className="space-y-2">
                      {companyOptions.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          {option.id === "__all__" ? (
                            <div
                              className={cn(
                                "flex items-center gap-2 w-full px-2 py-1.5 rounded cursor-pointer text-sm",
                                selectedCompanies.length === 0 ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                              )}
                              onClick={() => toggleCompany(option.id)}
                            >
                              {option.label}
                            </div>
                          ) : (
                            <>
                              <Checkbox
                                id={`company-${option.id}`}
                                checked={selectedCompanies.includes(option.id)}
                                onCheckedChange={() => toggleCompany(option.id)}
                              />
                              <label
                                htmlFor={`company-${option.id}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {option.label}
                              </label>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isContactFilterOpen} onOpenChange={setIsContactFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <User className="h-4 w-4" />
                    담당자
                    {selectedContacts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2">
                        {selectedContacts.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">담당자 선택</div>
                    <div className="space-y-2">
                      {contactOptions.map((contact) => (
                        <div key={contact.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={() => toggleContact(contact.id)}
                          />
                          <label
                            htmlFor={`contact-${contact.id}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {contact.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isNeedsFilterOpen} onOpenChange={setIsNeedsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <FileText className="h-4 w-4" />
                    니즈 축약
                    {selectedNeeds.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2">
                        {selectedNeeds.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">니즈 축약 선택</div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {needsOptions.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`needs-${option.id}`}
                            checked={selectedNeeds.includes(option.id)}
                            onCheckedChange={() => toggleNeeds(option.id)}
                          />
                          <label
                            htmlFor={`needs-${option.id}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isAmountFilterOpen} onOpenChange={setIsAmountFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="h-4 w-4" />
                    거래 예상 금액
                    {selectedAmounts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2">
                        {selectedAmounts.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">금액 범위 선택</div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {amountRangeOptions.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.id}
                            checked={selectedAmounts.includes(option.id)}
                            onCheckedChange={() => toggleAmountRange(option.id)}
                          />
                          <label
                            htmlFor={option.id}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* 정렬 버튼 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <ArrowUpDown className="h-4 w-4" />
                    정렬: {sortBy === 'nextContact' ? '다음 연락일' : '첫 문의 날짜'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm mb-2">정렬 기준</div>
                    <div 
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm",
                        sortBy === 'nextContact' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => handleSortChange('nextContact')}
                    >
                      다음 연락일 순
                    </div>
                    <div 
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm",
                        sortBy === 'firstContact' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => handleSortChange('firstContact')}
                    >
                      첫 문의 날짜 순
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isStageFilterOpen} onOpenChange={setIsStageFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="h-4 w-4" />
                    단계
                    {selectedStages.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2">
                        {selectedStages.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-3">
                    <div className="font-medium text-sm">단계 선택</div>

                    <div className="space-y-3">
                      {/* 기타 */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500">기타</div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-empty"
                            checked={selectedStages.includes("empty")}
                            onCheckedChange={() => toggleStage("empty")}
                          />
                          <label htmlFor="stage-empty" className="text-sm leading-none flex-1 cursor-pointer">
                            비어 있음
                          </label>
                        </div>
                      </div>

                      {/* 할일 */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-rose-700">할일</div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S0"
                            checked={selectedStages.includes("S0_신규 유입")}
                            onCheckedChange={() => toggleStage("S0_신규 유입")}
                          />
                          <label htmlFor="stage-S0" className="text-sm leading-none flex-1 cursor-pointer">
                            S0_신규 유입
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S1"
                            checked={selectedStages.includes("S1_유효 리드")}
                            onCheckedChange={() => toggleStage("S1_유효 리드")}
                          />
                          <label htmlFor="stage-S1" className="text-sm leading-none flex-1 cursor-pointer">
                            S1_유효 리드
                          </label>
                        </div>
                      </div>

                      {/* 진행 중 */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-primary">진행 중</div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S2"
                            checked={selectedStages.includes("S2_상담 완료")}
                            onCheckedChange={() => toggleStage("S2_상담 완료")}
                          />
                          <label htmlFor="stage-S2" className="text-sm leading-none flex-1 cursor-pointer">
                            S2_상담 완료
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S3"
                            checked={selectedStages.includes("S3_제안 발송")}
                            onCheckedChange={() => toggleStage("S3_제안 발송")}
                          />
                          <label htmlFor="stage-S3" className="text-sm leading-none flex-1 cursor-pointer">
                            S3_제안 발송
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S4"
                            checked={selectedStages.includes("S4_결정 대기")}
                            onCheckedChange={() => toggleStage("S4_결정 대기")}
                          />
                          <label htmlFor="stage-S4" className="text-sm leading-none flex-1 cursor-pointer">
                            S4_결정 대기
                          </label>
                        </div>
                      </div>

                      {/* 성사 / 종료 */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-green-700">성사 / 종료</div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S5"
                            checked={selectedStages.includes("S5_계약완료")}
                            onCheckedChange={() => toggleStage("S5_계약완료")}
                          />
                          <label htmlFor="stage-S5" className="text-sm leading-none flex-1 cursor-pointer">
                            S5_계약완료
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S6"
                            checked={selectedStages.includes("S6_종료")}
                            onCheckedChange={() => toggleStage("S6_종료")}
                          />
                          <label htmlFor="stage-S6" className="text-sm leading-none flex-1 cursor-pointer">
                            S6_종료
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="stage-S7"
                            checked={selectedStages.includes("S7_재접촉")}
                            onCheckedChange={() => toggleStage("S7_재접촉")}
                          />
                          <label htmlFor="stage-S7" className="text-sm leading-none flex-1 cursor-pointer">
                            S7_재접촉
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* 필터 초기화 버튼 */}
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  필터 초기화
                </Button>
              )}
              </div>
            </div>

            {/* 목록 개수 표시 */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {hasActiveFilters ? (
                  <>
                    전체 <span className="font-semibold text-foreground">{deals.length}</span>개 중{" "}
                    <span className="font-semibold text-primary">{filteredDeals.length}</span>개 표시
                  </>
                ) : (
                  <>
                    전체 <span className="font-semibold text-foreground">{deals.length}</span>개
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2 xl:p-4 overflow-x-auto">
                <Table className="min-w-[950px]">
                  <TableHeader>
                    <TableRow>
                      {columnOrder.map((column) => (
                        <TableHead
                          key={column.id}
                          className={cn(
                            "text-center select-none",
                            column.id === "rowNumber" 
                              ? "w-12 text-xs" 
                              : "hover:bg-muted/50 cursor-pointer"
                          )}
                          onClick={() => column.id !== "rowNumber" && handleColumnSort(column.id)}
                        >
                          {column.id === "rowNumber" ? (
                            <span className="text-muted-foreground">{column.label}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {column.label}
                              {columnSort?.column === column.id ? (
                                columnSort.direction === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-primary" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
                              )}
                            </div>
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeals.map((deal, index) => {
                      const nextContactStatus = getNextContactStatus(deal.nextContact)
                      return (
                        <TableRow
                          key={deal.id}
                          className="cursor-pointer hover:bg-secondary"
                          onClick={() => {
                            saveScrollPosition()
                            router.push(`/deals/${deal.id}?tab=activity`)
                          }}
                        >
                          {columnOrder.map((column) => (
                            <TableCell 
                              key={column.id} 
                              className={cn(
                                "text-center",
                                column.id === "rowNumber" && "w-12 text-xs text-muted-foreground"
                              )}
                            >
                              {column.id === "rowNumber" 
                                ? index + 1 
                                : renderCell(column.id, deal, nextContactStatus)}
                            </TableCell>
                          ))}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDeleteDialog(deal.id, deal.name, deal.account_id || null)
                                  }}
                                >
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
          </div>
        </main>
      </div>

      <AddDealDialog
        open={isAddDealOpen}
        onOpenChange={(open) => setIsAddDealOpen(open)}
        stage={undefined}
        onSuccess={loadDeals}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              "{dealToDelete?.name}" 거래를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dealToDelete?.accountId && (
            <div className="flex items-center space-x-2 py-4">
              <Checkbox
                id="delete-account"
                checked={deleteAccount}
                onCheckedChange={(checked) => setDeleteAccount(checked as boolean)}
              />
              <label
                htmlFor="delete-account"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                연락처(거래처)도 함께 삭제
              </label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false)
                setDealToDelete(null)
                setDeleteAccount(false)
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const renderCell = (columnId: string, deal: any, nextContactStatus: any) => {
  switch (columnId) {
    case "firstContact":
      return <span className="text-sm text-muted-foreground">{deal.firstContact}</span>
    case "name":
      return (
        <div className="flex items-center justify-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{deal.name}</span>
        </div>
      )
    case "needsSummary":
      return (
        <div className="flex justify-center">
          {deal.needsSummary && deal.needsSummary !== "-" ? (
            <Badge variant="outline" className="font-normal text-xs">
              {deal.needsSummary}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      )
    case "stage":
      return (
        <div className="flex justify-center">
          <Badge variant="outline" className={cn("border font-medium", getStageStyle(deal.stage))}>
            {deal.stageDisplay}
          </Badge>
        </div>
      )
    case "priority":
      const priorityColors: Record<string, string> = {
        P0: "bg-red-100 text-red-800 border-red-300",
        P1: "bg-orange-100 text-orange-800 border-orange-300",
        P2: "bg-yellow-100 text-yellow-800 border-yellow-300",
        P3: "bg-gray-100 text-gray-800 border-gray-300",
      }
      return (
        <div className="flex justify-center">
          {deal.priority !== "-" ? (
            <Badge variant="outline" className={cn("font-medium", priorityColors[deal.priority] || "")}>
              {deal.priority}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      )
    case "grade":
      // 등급별 색상 스타일
      const getGradeStyle = (grade: string) => {
        const g = grade.toUpperCase().replace('-', '')
        if (g === 'S') return "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-md"
        if (g === 'A' || g === 'A-') return "bg-gradient-to-r from-orange-400 to-amber-500 text-white border-0"
        if (g === 'B') return "bg-blue-100 text-blue-700 border-blue-200"
        if (g === 'C') return "bg-slate-100 text-slate-600 border-slate-200"
        if (g === 'F') return "bg-gray-200 text-gray-500 border-gray-300"
        return "bg-gray-100 text-gray-500 border-gray-200" // 추정불가 등
      }
      return (
        <div className="flex justify-center">
          {deal.grade !== "-" ? (
            <Badge className={cn("font-bold", getGradeStyle(deal.grade))}>
              {deal.grade}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      )
    case "value":
      return <span className="font-medium">{deal.value}</span>
    case "contact":
      // 담당자명에서 직함 제거
      const nameOnly = deal.contact ? deal.contact.replace(/(대표|과장|사원|팀장|부장|차장|이사|사장)$/, '').trim() : deal.contact
      return (
        <div className="flex items-center justify-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {nameOnly}
        </div>
      )
    case "lastActivity":
      return <span className="text-sm text-muted-foreground">{deal.lastActivity}</span>
    case "nextContact":
      const isRecontact = deal.stage === "S7_recontact"
      return (
        <div className={cn("inline-flex items-center text-sm gap-1", nextContactStatus.className)}>
          {nextContactStatus.icon}
          {nextContactStatus.text}
          {nextContactStatus.badge && (
            <Badge className={cn("text-xs py-0 h-5", nextContactStatus.badgeClassName)}>
              {nextContactStatus.badge}
            </Badge>
          )}
          {isRecontact && (
            <Badge className="text-xs py-0 h-5 bg-blue-500 text-white ml-1">
              재접촉
            </Badge>
          )}
        </div>
      )
    default:
      return null
  }
}
