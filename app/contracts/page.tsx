"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, Pencil, Plus, Search, FileText, ScrollText } from "lucide-react"
import { CreateContractDialog } from "@/components/create-contract-dialog"
import { ContractViewDialog } from "@/components/contract-view-dialog"
import { createBrowserClient } from "@/lib/supabase/client"

type Contract = {
  id: string
  contract_number: string
  category: string
  title: string
  client_info: any
  contract_data: any
  clauses: any[]
  bank_info: any
  company_info: any
  seal_url: string | null
  status: string
  contract_date: string | null
  deal_id: string | null
  created_at: string
  deal_name?: string
}

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("전체")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    loadContracts()
  }, [])

  async function loadContracts() {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("계약서 로드 실패:", error)
        return
      }

      const dealIds = data.filter((c: any) => c.deal_id).map((c: any) => c.deal_id)
      let dealsMap: Record<string, string> = {}

      if (dealIds.length > 0) {
        const { data: deals } = await supabase
          .from("deals")
          .select("id, deal_name")
          .in("id", dealIds)

        if (deals) {
          dealsMap = deals.reduce((acc: any, d: any) => {
            acc[d.id] = d.deal_name
            return acc
          }, {})
        }
      }

      const mapped = data.map((c: any) => ({
        ...c,
        deal_name: c.deal_id ? dealsMap[c.deal_id] || "-" : "-",
      }))

      setContracts(mapped)
    } catch (err) {
      console.error("계약서 로드 오류:", err)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["전체", "홈페이지", "마케팅", "디자인", "앱개발", "ERP개발", "영상"]

  const filteredContracts = contracts.filter(c => {
    const matchCategory = selectedCategory === "전체" || c.category === selectedCategory
    const matchSearch = !searchQuery ||
      c.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client_info?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const statusCounts = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === "초안").length,
    confirmed: contracts.filter(c => c.status === "확정").length,
    signed: contracts.filter(c => c.status === "서명완료").length,
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "초안": return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">초안</Badge>
      case "확정": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">확정</Badge>
      case "서명완료": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">서명완료</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  function getCategoryBadge(category: string) {
    const colors: Record<string, string> = {
      "홈페이지": "bg-cyan-50 text-cyan-700 border-cyan-200",
      "마케팅": "bg-purple-50 text-purple-700 border-purple-200",
      "디자인": "bg-pink-50 text-pink-700 border-pink-200",
      "앱개발": "bg-orange-50 text-orange-700 border-orange-200",
      "ERP개발": "bg-amber-50 text-amber-700 border-amber-200",
      "영상": "bg-red-50 text-red-700 border-red-200",
    }
    return <Badge variant="outline" className={colors[category] || ""}>{category}</Badge>
  }

  function formatDate(date: string | null) {
    if (!date) return "-"
    try {
      const d = new Date(date)
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
    } catch {
      return date
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CrmHeader />
          <main className="flex-1 overflow-y-auto p-2 xl:p-6">
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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <ScrollText className="h-8 w-8" />
                계약서 관리
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">계약서를 생성하고 관리합니다</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              계약서 작성
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">전체 계약서</p>
              <p className="text-2xl font-bold mt-1">{statusCounts.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">초안</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{statusCounts.draft}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">확정</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{statusCounts.confirmed}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">서명완료</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{statusCounts.signed}</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="flex-wrap">
                {categories.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="text-xs">
                    {cat}
                    {cat === "전체" ? ` (${contracts.length})` : ` (${contracts.filter(c => c.category === cat).length})`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="계약번호, 제목, 거래처 검색..."
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="p-4 xl:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">계약번호</TableHead>
                    <TableHead className="w-[10%]">카테고리</TableHead>
                    <TableHead className="w-[20%]">거래처</TableHead>
                    <TableHead className="w-[20%]">제목</TableHead>
                    <TableHead className="w-[10%]">상태</TableHead>
                    <TableHead className="w-[12%]">계약일</TableHead>
                    <TableHead className="w-[8%] text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map(contract => (
                    <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedContract(contract)
                        setShowViewDialog(true)
                      }}
                    >
                      <TableCell className="font-mono text-xs">{contract.contract_number}</TableCell>
                      <TableCell>{getCategoryBadge(contract.category)}</TableCell>
                      <TableCell className="font-medium">{contract.client_info?.company_name || contract.deal_name || "-"}</TableCell>
                      <TableCell className="text-sm">{contract.title}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell className="text-sm">{contract.contract_date || formatDate(contract.created_at)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedContract(contract)
                              setShowViewDialog(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingContract(contract)
                              setShowEditDialog(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredContracts.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 계약서가 없습니다."}
                </p>
                {!searchQuery && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    첫 계약서 작성하기
                  </Button>
                )}
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* View Dialog */}
      {selectedContract && (
        <ContractViewDialog
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          contract={selectedContract}
          onDelete={() => {
            setShowViewDialog(false)
            loadContracts()
          }}
        />
      )}

      {/* Create Dialog */}
      <CreateContractDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          loadContracts()
        }}
      />

      {/* Edit Dialog */}
      <CreateContractDialog
        open={showEditDialog}
        onOpenChange={open => {
          setShowEditDialog(open)
          if (!open) setEditingContract(null)
        }}
        editContract={editingContract}
        onSuccess={() => {
          setShowEditDialog(false)
          setEditingContract(null)
          loadContracts()
        }}
      />
    </div>
  )
}
