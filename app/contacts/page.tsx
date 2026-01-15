"use client"

import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Filter, MoreVertical, Mail, Phone } from "lucide-react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export default function ContactsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    potential: 0,
    avgLeadScore: 0,
    pending: 0,
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("accounts")
        .select(`
          *,
          contacts(count),
          deals(id, created_at, assigned_to)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setAccounts(data || [])

      if (data) {
        const total = data.length
        const active = data.filter((a) => a.status === "active").length
        const potential = data.filter((a) => a.status !== "active" && a.status !== "pending").length
        const pending = data.filter((a) => a.status === "pending").length
        const totalScore = data.reduce((sum, a) => sum + (a.lead_score || 0), 0)
        const avgLeadScore = total > 0 ? Math.round(totalScore / total) : 0

        setStats({
          total,
          active,
          potential,
          avgLeadScore,
          pending,
        })
      }
    } catch (error) {
      console.error("[v0] 거래처 데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts.filter((account) => {
    if (statusFilter === "all") return true
    if (statusFilter === "pending") return account.status === "pending"
    if (statusFilter === "active") return account.status === "active"
    if (statusFilter === "potential") return account.status !== "active" && account.status !== "pending"
    return true
  })

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = today.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "오늘"
    if (diffDays === 1) return "1일 전"
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주일 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  }

  const contacts = filteredAccounts.map((account) => ({
    id: account.id,
    name: account.company_name,
    contactPerson: account.primary_contact_name || "",
    email: account.primary_contact_email || account.email,
    phone: account.primary_contact_phone || account.phone,
    company: account.company_name,
    position: account.primary_contact_position || "",
    status: account.status === "pending" ? "미확인" : account.status === "active" ? "활성" : "잠재고객",
    leadScore: account.lead_score || 0,
    assignedTo: account.deals?.[0]?.assigned_to || "-",
    lastModified: account.updated_at ? getRelativeTime(account.updated_at) : "수정 없음",
  }))

  const router = useRouter()

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-muted-foreground"
  }

  const getStatusVariant = (status: string) => {
    if (status === "미확인") return "destructive"
    return status === "활성" ? "default" : "secondary"
  }

  const handleDeleteAccount = async (accountId: string, companyName: string) => {
    if (!confirm(`"${companyName}" 거래처를 삭제하시겠습니까? 관련된 모든 거래와 활동도 함께 삭제됩니다.`)) {
      return
    }

    try {
      const supabase = createBrowserClient()

      const { data: deals } = await supabase.from("deals").select("id").eq("account_id", accountId)

      if (deals && deals.length > 0) {
        const dealIds = deals.map((d) => d.id)
        await supabase.from("activities").delete().in("deal_id", dealIds)
      }

      await supabase.from("activities").delete().eq("account_id", accountId)
      await supabase.from("deals").delete().eq("account_id", accountId)
      await supabase.from("contacts").delete().eq("account_id", accountId)
      const { error } = await supabase.from("accounts").delete().eq("id", accountId)

      if (error) throw error

      loadAccounts()
    } catch (error) {
      console.error("[v0] 거래처 삭제 실패:", error)
      alert("거래처 삭제에 실패했습니다.")
    }
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

  const searchedContacts = contacts.filter((contact) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()

    if (isChosungSearch(searchTerm)) {
      return (
        getChosung(contact.name || "").includes(searchTerm) ||
        getChosung(contact.email || "").includes(searchTerm) ||
        getChosung(contact.phone || "").includes(searchTerm) ||
        getChosung(contact.company || "").includes(searchTerm) ||
        getChosung(contact.contactPerson || "").includes(searchTerm)
      )
    }

    return (
      (contact.name || "").toLowerCase().includes(search) ||
      (contact.email || "").toLowerCase().includes(search) ||
      (contact.phone || "").toLowerCase().includes(search) ||
      (contact.company || "").toLowerCase().includes(search) ||
      (contact.contactPerson || "").toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">거래처 데이터 로딩중...</p>
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">연락처</h1>
            <p className="mt-1 text-sm text-muted-foreground">고객 및 잠재 고객 정보를 관리하세요</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card
              className={
                statusFilter === "all" ? "ring-2 ring-primary" : "cursor-pointer hover:ring-2 hover:ring-primary/50"
              }
              onClick={() => setStatusFilter("all")}
            >
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground">전체 연락처</div>
              </CardContent>
            </Card>
            <Card
              className={
                statusFilter === "pending"
                  ? "ring-2 ring-destructive"
                  : "cursor-pointer hover:ring-2 hover:ring-destructive/50"
              }
              onClick={() => setStatusFilter("pending")}
            >
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-destructive">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">미확인 업체</div>
              </CardContent>
            </Card>
            <Card
              className={
                statusFilter === "active" ? "ring-2 ring-primary" : "cursor-pointer hover:ring-2 hover:ring-primary/50"
              }
              onClick={() => setStatusFilter("active")}
            >
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{stats.active}</div>
                <div className="text-sm text-muted-foreground">활성 고객</div>
              </CardContent>
            </Card>
            <Card
              className={
                statusFilter === "potential"
                  ? "ring-2 ring-primary"
                  : "cursor-pointer hover:ring-2 hover:ring-primary/50"
              }
              onClick={() => setStatusFilter("potential")}
            >
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">{stats.potential}</div>
                <div className="text-sm text-muted-foreground">잠재고객</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="이름, 이메일, 회사로 검색..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="px-3 py-1">
                      {statusFilter === "pending" && "미확인"}
                      {statusFilter === "active" && "활성"}
                      {statusFilter === "potential" && "잠재고객"}
                    </Badge>
                  )}
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    필터
                  </Button>
                  <Button variant="outline">내보내기</Button>
                  <AddContactDialog onSuccess={loadAccounts} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead className="text-right">리드 점수</TableHead>
                    <TableHead>최종 수정 날짜</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchedContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        const account = accounts.find((a) => a.id === contact.id)
                        const firstDeal = account?.deals?.[0]
                        if (firstDeal) {
                          router.push(`/deals/${firstDeal.id}?tab=info`)
                        } else {
                          alert("이 거래처에 연결된 거래가 없습니다.")
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {contact.name.charAt(0)}
                            </div>
                            <span className="font-semibold">{contact.name}</span>
                          </div>
                          {contact.contactPerson && (
                            <span className="ml-10 text-sm text-muted-foreground">{contact.contactPerson}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{contact.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{contact.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contact.assignedTo}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${getScoreColor(contact.leadScore)}`}>{contact.leadScore}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contact.lastModified}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAccount(contact.id, contact.company)
                              }}
                            >
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
