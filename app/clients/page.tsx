"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Filter, Plus, MoreVertical, Building2, User, AlertCircle, Clock, ArrowUpDown, X, ArrowUp, ArrowDown, Briefcase, TrendingUp, FileText, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import CrmSidebar from "@/components/crm-sidebar"
import CrmHeader from "@/components/crm-header"
import AddClientDialog from "@/components/add-client-dialog"
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

const getKSTToday = () => {
  const now = new Date()
  const kstOffset = 9 * 60
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const kstTime = new Date(utcTime + kstOffset * 60000)
  kstTime.setHours(0, 0, 0, 0)
  return kstTime
}

const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date()
  const datePart = dateString.split("T")[0]
  const [year, month, day] = datePart.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const formatDateToYYYYMMDD = (dateString: string) => {
  const date = parseLocalDate(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatRelativeDate = (dateString: string) => {
  const date = parseLocalDate(dateString)
  const today = getKSTToday()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "오늘"
  if (diffDays === 1) return "1일 전"
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주일 전`
  return `${Math.floor(diffDays / 30)}개월 전`
}

const getChosung = (str: string) => {
  const CHOSUNG_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
  let result = ""
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xac00
    if (code > -1 && code < 11172) {
      result += CHOSUNG_LIST[Math.floor(code / 588)]
    } else if (str[i] !== " ") {
      result += str[i]
    }
  }
  return result
}

const isChosungSearch = (text: string) => {
  const CHOSUNG_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
  return text.split("").every((char) => CHOSUNG_LIST.includes(char))
}

type ClientStatus = "활성" | "관리" | "비활성"

const getClientStatus = (contracts: any[], opportunities: any[]): ClientStatus => {
  const hasActiveContract = contracts.some((c: any) => c.status === "진행중")
  const hasActiveOpp = opportunities.some((o: any) => !["성사", "무산"].includes(o.status))
  if (hasActiveContract || hasActiveOpp) return "활성"
  if (contracts.length > 0) return "관리"
  return "비활성"
}

const getStatusStyle = (status: ClientStatus) => {
  switch (status) {
    case "활성": return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "관리": return "bg-blue-50 text-blue-700 border-blue-200"
    case "비활성": return "bg-gray-100 text-gray-500 border-gray-200"
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-status-filter")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [selectedContacts, setSelectedContacts] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-assignee-filter")
      if (saved) {
        const parsed = JSON.parse(saved)
        const normalized = parsed.map((name: string) =>
          name.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, "").trim()
        )
        localStorage.setItem("clients-assignee-filter", JSON.stringify(normalized))
        return normalized
      }
      return []
    }
    return []
  })
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-service-filter")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const [isContactFilterOpen, setIsContactFilterOpen] = useState(false)
  const [isServiceFilterOpen, setIsServiceFilterOpen] = useState(false)
  const [isAddDealOpen, setIsAddDealOpen] = useState(false)

  const [columnSort, setColumnSort] = useState<{ column: string; direction: "asc" | "desc" } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-column-sort")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  const columnOrder = [
    { id: "rowNumber", label: "No.", width: "w-12" },
    { id: "name", label: "상호명" },
    { id: "serviceType", label: "서비스 유형" },
    { id: "status", label: "상태" },
    { id: "contractCount", label: "계약" },
    { id: "opportunityCount", label: "영업 기회" },
    { id: "totalAmount", label: "총 계약 금액" },
    { id: "contact", label: "담당자" },
    { id: "latestContractDate", label: "최근 계약일" },
    { id: "nextContact", label: "다음 연락일" },
    { id: "lastActivity", label: "마지막 활동" },
  ]

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dealToDelete, setDealToDelete] = useState<{ id: string; name: string; accountId: string | null } | null>(null)
  const [deleteAccount, setDeleteAccount] = useState(false)

  const contactOptions = [
    { id: "오일환", label: "오일환" },
    { id: "박상혁", label: "박상혁" },
    { id: "윤경호", label: "윤경호" },
    { id: "미정", label: "미정" },
  ]

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return
    try {
      const supabase = createBrowserClient()
      await supabase.from("client_activities").delete().eq("client_id", dealToDelete.id)
      const { error: dealError } = await supabase.from("clients").delete().eq("id", dealToDelete.id)
      if (dealError) throw dealError
      if (deleteAccount && dealToDelete.accountId) {
        await supabase.from("accounts").delete().eq("id", dealToDelete.accountId)
      }
      loadClients()
      setDeleteDialogOpen(false)
      setDealToDelete(null)
      setDeleteAccount(false)
    } catch (error) {
      console.error("거래 삭제 실패:", error)
      alert("거래 삭제에 실패했습니다.")
    }
  }

  const openDeleteDialog = (id: string, name: string, accountId: string | null) => {
    setDealToDelete({ id, name, accountId })
    setDeleteAccount(false)
    setDeleteDialogOpen(true)
  }

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const supabase = createBrowserClient()
      const [clientsResult, contractsResult, opportunitiesResult] = await Promise.all([
        supabase
          .from("clients")
          .select("*, account:accounts(company_name, industry), contact:contacts(name, email)")
          .order("updated_at", { ascending: false }),
        supabase
          .from("client_contracts")
          .select("id, client_id, contract_name, contract_amount, contract_date, end_date, status, service_type"),
        supabase
          .from("client_opportunities")
          .select("id, client_id, title, opportunity_type, status"),
      ])

      if (clientsResult.error) throw clientsResult.error

      const contractsByClient: Record<string, any[]> = {}
      ;(contractsResult.data || []).forEach((c: any) => {
        if (!contractsByClient[c.client_id]) contractsByClient[c.client_id] = []
        contractsByClient[c.client_id].push(c)
      })

      const oppsByClient: Record<string, any[]> = {}
      ;(opportunitiesResult.data || []).forEach((o: any) => {
        if (!oppsByClient[o.client_id]) oppsByClient[o.client_id] = []
        oppsByClient[o.client_id].push(o)
      })

      const now = new Date()

      const clientsData = clientsResult.data.map((client: any) => {
        const myContracts = contractsByClient[client.id] || []
        const myOpps = oppsByClient[client.id] || []
        const activeContracts = myContracts.filter((c: any) => c.status === "진행중")
        const activeOpps = myOpps.filter((o: any) => !["성사", "무산"].includes(o.status))
        const status = getClientStatus(myContracts, myOpps)

        const latestContract = myContracts
          .filter((c: any) => c.contract_date)
          .sort((a: any, b: any) => new Date(b.contract_date).getTime() - new Date(a.contract_date).getTime())[0]

        const serviceTypes = [...new Set(myContracts.map((c: any) => c.service_type).filter(Boolean))]

        const expiringContracts = activeContracts.filter((c: any) => {
          if (!c.end_date) return false
          const endDate = parseLocalDate(c.end_date)
          const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays <= 30
        })

        const totalAmount = myContracts.reduce((sum: number, c: any) => {
          if (!c.contract_amount) return sum
          const num = parseInt(c.contract_amount.replace(/[^0-9]/g, ""), 10)
          return sum + (isNaN(num) ? 0 : num)
        }, 0)

        return {
          id: client.id,
          name: client.deal_name || client.account?.company_name || "-",
          account_id: client.account_id,
          contact: client.assigned_to || "미정",
          status,
          serviceTypes,
          contractCount: myContracts.length,
          activeContractCount: activeContracts.length,
          opportunityCount: myOpps.length,
          activeOpportunityCount: activeOpps.length,
          totalAmount,
          latestContractDate: latestContract?.contract_date || null,
          nextContact: client.next_contact_date || null,
          lastActivity: client.updated_at ? client.updated_at.split("T")[0] : null,
          lastActivityRelative: client.updated_at ? formatRelativeDate(client.updated_at.split("T")[0]) : "-",
          hasExpiringContract: expiringContracts.length > 0,
          expiringContractCount: expiringContracts.length,
          industry: client.account?.industry || null,
        }
      })

      setClients(clientsData)
    } catch (error) {
      console.error("기존 거래처 데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const serviceTypeOptions = useMemo(() => {
    const typeSet = new Set<string>()
    clients.forEach((c: any) => c.serviceTypes?.forEach((t: string) => typeSet.add(t)))
    return Array.from(typeSet).sort((a, b) => a.localeCompare(b, "ko")).map(t => ({ id: t, label: t }))
  }, [clients])

  const summaryStats = useMemo(() => {
    const total = clients.length
    const active = clients.filter(c => c.status === "활성").length
    const expiring = clients.filter(c => c.hasExpiringContract).length
    const withOpps = clients.filter(c => c.activeOpportunityCount > 0).length
    return { total, active, expiring, withOpps }
  }, [clients])

  const toggleStatus = (id: string) => {
    setSelectedStatuses(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      localStorage.setItem("clients-status-filter", JSON.stringify(next))
      return next
    })
  }
  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      localStorage.setItem("clients-assignee-filter", JSON.stringify(next))
      return next
    })
  }
  const toggleServiceType = (id: string) => {
    setSelectedServiceTypes(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      localStorage.setItem("clients-service-filter", JSON.stringify(next))
      return next
    })
  }

  const hasActiveFilters = selectedStatuses.length > 0 || selectedContacts.length > 0 || selectedServiceTypes.length > 0 || searchTerm.length > 0
  const clearAllFilters = () => {
    setSelectedStatuses([])
    setSelectedContacts([])
    setSelectedServiceTypes([])
    setSearchTerm("")
    setColumnSort(null)
    localStorage.removeItem("clients-status-filter")
    localStorage.removeItem("clients-assignee-filter")
    localStorage.removeItem("clients-service-filter")
    localStorage.removeItem("clients-column-sort")
  }

  const filteredClients = useMemo(() => {
    let result = [...clients]

    if (selectedStatuses.length > 0) {
      result = result.filter(c => selectedStatuses.includes(c.status))
    }
    if (selectedContacts.length > 0) {
      result = result.filter(c => {
        const contactName = c.contact?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, "").trim() || ""
        return selectedContacts.includes(c.contact) || selectedContacts.includes(contactName)
      })
    }
    if (selectedServiceTypes.length > 0) {
      result = result.filter(c => c.serviceTypes?.some((t: string) => selectedServiceTypes.includes(t)))
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (isChosungSearch(searchTerm)) {
        result = result.filter(c =>
          getChosung(c.name).includes(searchTerm) || getChosung(c.contact).includes(searchTerm)
        )
      } else {
        result = result.filter(c =>
          c.name.toLowerCase().includes(search) ||
          c.contact.toLowerCase().includes(search) ||
          c.serviceTypes?.some((t: string) => t.toLowerCase().includes(search))
        )
      }
    }

    if (columnSort) {
      const { column, direction } = columnSort
      const m = direction === "asc" ? 1 : -1
      result.sort((a, b) => {
        const av = a[column]
        const bv = b[column]
        if (column === "latestContractDate" || column === "nextContact" || column === "lastActivity") {
          if (!av && !bv) return 0
          if (!av) return 1 * m
          if (!bv) return -1 * m
          return (parseLocalDate(av).getTime() - parseLocalDate(bv).getTime()) * m
        }
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * m
        if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "ko") * m
        return 0
      })
    } else {
      result.sort((a, b) => {
        const statusOrder: Record<string, number> = { "활성": 0, "관리": 1, "비활성": 2 }
        const diff = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2)
        if (diff !== 0) return diff
        if (a.hasExpiringContract && !b.hasExpiringContract) return -1
        if (!a.hasExpiringContract && b.hasExpiringContract) return 1
        if (a.nextContact && !b.nextContact) return -1
        if (!a.nextContact && b.nextContact) return 1
        if (a.nextContact && b.nextContact) {
          return parseLocalDate(a.nextContact).getTime() - parseLocalDate(b.nextContact).getTime()
        }
        return 0
      })
    }

    return result
  }, [clients, selectedStatuses, selectedContacts, selectedServiceTypes, searchTerm, columnSort])

  const handleColumnSort = (columnId: string) => {
    const newSort = columnSort?.column === columnId
      ? { column: columnId, direction: columnSort.direction === "asc" ? "desc" as const : "asc" as const }
      : { column: columnId, direction: "asc" as const }
    setColumnSort(newSort)
    localStorage.setItem("clients-column-sort", JSON.stringify(newSort))
  }

  const getNextContactStatus = (dateString: string | null) => {
    if (!dateString) return { text: "-", className: "text-muted-foreground", icon: null, badge: null, badgeClassName: "" }
    const date = parseLocalDate(dateString)
    date.setHours(0, 0, 0, 0)
    const today = getKSTToday()
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return {
      text: dateString, className: "bg-red-100 text-red-700 border border-red-300 rounded-md px-2 py-1 font-semibold animate-pulse",
      icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />, badge: "지남", badgeClassName: "bg-red-600 text-white ml-2",
    }
    if (diffDays === 0) return {
      text: dateString, className: "bg-yellow-100 text-yellow-800 border border-yellow-400 rounded-md px-2 py-1 font-bold",
      icon: <Clock className="h-3.5 w-3.5 mr-1" />, badge: "오늘!", badgeClassName: "bg-yellow-600 text-white ml-2",
    }
    if (diffDays <= 2) return {
      text: dateString, className: "bg-orange-100 text-orange-700 border border-orange-300 rounded-md px-2 py-1 font-semibold",
      icon: <Clock className="h-3.5 w-3.5 mr-1" />, badge: `${diffDays}일 후`, badgeClassName: "bg-orange-600 text-white ml-2",
    }
    return { text: dateString, className: "text-muted-foreground", icon: null, badge: null, badgeClassName: "" }
  }

  const formatAmount = (amount: number) => {
    if (amount === 0) return "-"
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
    if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString()}만`
    return amount.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">기존 거래처 데이터 로딩중...</p>
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

        <main className="flex-1 overflow-y-auto p-2 xl:p-6">
          {/* Header */}
          <div className="bg-background p-6 pb-4">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">기존 거래처</h1>
                <p className="text-muted-foreground mt-1">계약 현황과 영업 기회를 한눈에 관리하세요</p>
              </div>
              <Button onClick={() => setIsAddDealOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                거래처 추가
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <Card className={cn("cursor-pointer transition-all hover:shadow-md", selectedStatuses.length === 0 && !hasActiveFilters && "ring-2 ring-primary/20")} onClick={clearAllFilters}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">전체 거래처</p>
                      <p className="text-2xl font-bold mt-1">{summaryStats.total}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn("cursor-pointer transition-all hover:shadow-md", selectedStatuses.includes("활성") && selectedStatuses.length === 1 && "ring-2 ring-emerald-400")} onClick={() => { setSelectedStatuses(["활성"]); localStorage.setItem("clients-status-filter", JSON.stringify(["활성"])) }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">활성 거래처</p>
                      <p className="text-2xl font-bold mt-1 text-emerald-600">{summaryStats.active}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => { setSelectedStatuses([]); setColumnSort({ column: "nextContact", direction: "asc" }); localStorage.removeItem("clients-status-filter"); localStorage.setItem("clients-column-sort", JSON.stringify({ column: "nextContact", direction: "asc" })) }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">만료 임박</p>
                      <p className={cn("text-2xl font-bold mt-1", summaryStats.expiring > 0 ? "text-amber-600" : "")}>{summaryStats.expiring}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => { setColumnSort({ column: "opportunityCount", direction: "desc" }); localStorage.setItem("clients-column-sort", JSON.stringify({ column: "opportunityCount", direction: "desc" })) }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">진행 중 영업 기회</p>
                      <p className={cn("text-2xl font-bold mt-1", summaryStats.withOpps > 0 ? "text-blue-600" : "")}>{summaryStats.withOpps}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="거래처 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Popover open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Filter className="h-3.5 w-3.5" />
                    상태
                    {selectedStatuses.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2 text-xs">{selectedStatuses.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">상태 선택</div>
                    {(["활성", "관리", "비활성"] as const).map(s => (
                      <div key={s} className="flex items-center space-x-2">
                        <Checkbox id={`status-${s}`} checked={selectedStatuses.includes(s)} onCheckedChange={() => toggleStatus(s)} />
                        <label htmlFor={`status-${s}`} className="text-sm cursor-pointer flex-1 flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5", getStatusStyle(s))}>{s}</Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isContactFilterOpen} onOpenChange={setIsContactFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <User className="h-3.5 w-3.5" />
                    담당자
                    {selectedContacts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-2 text-xs">{selectedContacts.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">담당자 선택</div>
                    {contactOptions.map(c => (
                      <div key={c.id} className="flex items-center space-x-2">
                        <Checkbox id={`contact-${c.id}`} checked={selectedContacts.includes(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                        <label htmlFor={`contact-${c.id}`} className="text-sm cursor-pointer flex-1">{c.label}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {serviceTypeOptions.length > 0 && (
                <Popover open={isServiceFilterOpen} onOpenChange={setIsServiceFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <FileText className="h-3.5 w-3.5" />
                      서비스 유형
                      {selectedServiceTypes.length > 0 && (
                        <Badge variant="secondary" className="ml-1 rounded-full px-2 text-xs">{selectedServiceTypes.length}</Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="start">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">서비스 유형 선택</div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {serviceTypeOptions.map(o => (
                          <div key={o.id} className="flex items-center space-x-2">
                            <Checkbox id={`svc-${o.id}`} checked={selectedServiceTypes.includes(o.id)} onCheckedChange={() => toggleServiceType(o.id)} />
                            <label htmlFor={`svc-${o.id}`} className="text-sm cursor-pointer flex-1">{o.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4 mr-1" />
                  초기화
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                {hasActiveFilters ? (
                  <>전체 <span className="font-semibold text-foreground">{clients.length}</span>개 중 <span className="font-semibold text-primary">{filteredClients.length}</span>개 표시</>
                ) : (
                  <>전체 <span className="font-semibold text-foreground">{clients.length}</span>개</>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border bg-card p-4 overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  {columnOrder.map(col => (
                    <TableHead
                      key={col.id}
                      className={cn(
                        "text-center select-none",
                        col.id === "rowNumber" ? "w-12 text-xs" : "hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => col.id !== "rowNumber" && handleColumnSort(col.id)}
                    >
                      {col.id === "rowNumber" ? (
                        <span className="text-muted-foreground">{col.label}</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {col.label}
                          {columnSort?.column === col.id ? (
                            columnSort.direction === "asc" ? <ArrowUp className="h-4 w-4 text-primary" /> : <ArrowDown className="h-4 w-4 text-primary" />
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
                {filteredClients.map((client, index) => {
                  const ncs = getNextContactStatus(client.nextContact)
                  return (
                    <TableRow
                      key={client.id}
                      className={cn("cursor-pointer hover:bg-secondary", client.hasExpiringContract && "bg-amber-50/30")}
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell className="text-center w-12 text-xs text-muted-foreground">{index + 1}</TableCell>

                      {/* 상호명 */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{client.name}</span>
                          {client.hasExpiringContract && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5 py-0 h-5 gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" />
                              만료임박{client.expiringContractCount > 1 ? ` (${client.expiringContractCount})` : ""}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* 서비스 유형 */}
                      <TableCell className="text-center">
                        {client.serviceTypes.length > 0 ? (
                          <div className="flex justify-center gap-1 flex-wrap">
                            {client.serviceTypes.slice(0, 2).map((t: string) => (
                              <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                            ))}
                            {client.serviceTypes.length > 2 && (
                              <Badge variant="outline" className="text-[10px] font-normal">+{client.serviceTypes.length - 2}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* 상태 */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("border font-medium text-xs", getStatusStyle(client.status))}>
                          {client.status}
                        </Badge>
                      </TableCell>

                      {/* 계약 */}
                      <TableCell className="text-center">
                        {client.contractCount > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium text-sm">{client.activeContractCount}</span>
                            <span className="text-muted-foreground text-xs">/ {client.contractCount}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* 영업 기회 */}
                      <TableCell className="text-center">
                        {client.opportunityCount > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            {client.activeOpportunityCount > 0 && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5 h-5">
                                {client.activeOpportunityCount}건 진행
                              </Badge>
                            )}
                            {client.activeOpportunityCount === 0 && (
                              <span className="text-xs text-muted-foreground">{client.opportunityCount}건</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* 총 계약 금액 */}
                      <TableCell className="text-center">
                        <span className={cn("font-medium text-sm", client.totalAmount > 0 ? "" : "text-muted-foreground")}>
                          {formatAmount(client.totalAmount)}
                        </span>
                      </TableCell>

                      {/* 담당자 */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{client.contact?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, "").trim()}</span>
                        </div>
                      </TableCell>

                      {/* 최근 계약일 */}
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {client.latestContractDate || "-"}
                        </span>
                      </TableCell>

                      {/* 다음 연락일 */}
                      <TableCell className="text-center">
                        <div className={cn("inline-flex items-center text-sm", ncs.className)}>
                          {ncs.icon}
                          {ncs.text}
                          {ncs.badge && (
                            <Badge className={cn("text-xs py-0 h-5", ncs.badgeClassName)}>{ncs.badge}</Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* 마지막 활동 */}
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{client.lastActivityRelative}</span>
                      </TableCell>

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
                                openDeleteDialog(client.id, client.name, client.account_id || null)
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

      <AddClientDialog
        open={isAddDealOpen}
        onOpenChange={(open) => setIsAddDealOpen(open)}
        stage={undefined}
        onSuccess={loadClients}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래처 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{dealToDelete?.name}&quot; 거래처를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dealToDelete?.accountId && (
            <div className="flex items-center space-x-2 py-4">
              <Checkbox id="delete-account" checked={deleteAccount} onCheckedChange={(checked) => setDeleteAccount(checked as boolean)} />
              <label htmlFor="delete-account" className="text-sm font-medium cursor-pointer">연락처(거래처)도 함께 삭제</label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setDealToDelete(null); setDeleteAccount(false) }}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
