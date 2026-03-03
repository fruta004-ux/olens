"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Shield, Plus, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight, Copy, Check, GripVertical, Upload, FileText, Save, X } from "lucide-react"
import { toBlob } from "html-to-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createBrowserClient } from "@/lib/supabase/client"
import CrmSidebar from "@/components/crm-sidebar"
import CrmHeader from "@/components/crm-header"
import { PatchNotesManager } from "@/components/patch-notes-manager"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export default function AdminPage() {
  const router = useRouter()
  const [needsSettings, setNeedsSettings] = useState<any[]>([])
  const [sourceSettings, setSourceSettings] = useState<any[]>([])
  const [channelSettings, setChannelSettings] = useState<any[]>([])
  const [gradeSettings, setGradeSettings] = useState<any[]>([])
  const [contractReasonSettings, setContractReasonSettings] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [newValue, setNewValue] = useState("")
  const [newServiceType, setNewServiceType] = useState<string>("")
  const [currentCategory, setCurrentCategory] = useState<string>("needs")

  const [activities, setActivities] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState<string>("전체")
  const [copiedAssignee, setCopiedAssignee] = useState<string | null>(null)
  const assigneeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // 계약서 템플릿 상태
  const [contractTemplates, setContractTemplates] = useState<any[]>([])
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("홈페이지")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [editingClause, setEditingClause] = useState<any>(null)
  const [isClauseDialogOpen, setIsClauseDialogOpen] = useState(false)
  const [clauseTitle, setClauseTitle] = useState("")
  const [clauseBody, setClauseBody] = useState("")
  const [templateBankInfo, setTemplateBankInfo] = useState({ bank: "", account: "", holder: "" })
  const [templateCompanyInfo, setTemplateCompanyInfo] = useState({ address: "", business_number: "", company_name: "", representative: "" })
  const [templateTitle, setTemplateTitle] = useState("")
  const [sealFile, setSealFile] = useState<File | null>(null)
  const [companySeals, setCompanySeals] = useState<any[]>([])
  const [sealUploadCompany, setSealUploadCompany] = useState<string>("플루타")
  const [clauseDragItem, setClauseDragItem] = useState<number | null>(null)
  const [clauseDragOverItem, setClauseDragOverItem] = useState<number | null>(null)

  const supabase = createBrowserClient()

  const handleReorder = async (settings: any[], category: string) => {
    if (!dragItem || !dragOverItem || dragItem === dragOverItem) return

    const items = [...settings]
    const fromIdx = items.findIndex(i => i.id === dragItem)
    const toIdx = items.findIndex(i => i.id === dragOverItem)
    if (fromIdx === -1 || toIdx === -1) return

    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)

    const updates = items.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }))

    for (const u of updates) {
      await supabase.from("settings").update({ display_order: u.display_order }).eq("id", u.id)
    }

    setDragItem(null)
    setDragOverItem(null)
    loadSettings()
  }

  const loadContractTemplates = async () => {
    const { data } = await supabase
      .from("contract_templates")
      .select("*")
      .order("display_order")
    if (data) setContractTemplates(data)
  }

  const loadCompanySeals = async () => {
    const { data } = await supabase
      .from("company_seals")
      .select("*")
      .eq("is_active", true)
    if (data) setCompanySeals(data)
  }

  const getTemplatesForCategory = (category: string) => {
    return contractTemplates.filter(t => t.category === category)
  }

  const getSelectedTemplate = () => {
    if (selectedTemplateId) return contractTemplates.find(t => t.id === selectedTemplateId)
    const catTemplates = getTemplatesForCategory(selectedTemplateCategory)
    return catTemplates.length > 0 ? catTemplates[0] : null
  }

  const handleSaveTemplate = async () => {
    const template = getSelectedTemplate()
    const payload = {
      category: selectedTemplateCategory,
      title: templateTitle || `${selectedTemplateCategory} 계약서`,
      bank_info: templateBankInfo,
      company_info: templateCompanyInfo,
      clauses: template?.clauses || [],
      is_active: true,
    }
    if (template) {
      await supabase.from("contract_templates").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", template.id)
    } else {
      await supabase.from("contract_templates").insert({ ...payload, display_order: contractTemplates.length + 1 })
    }
    loadContractTemplates()
  }

  const handleAddTemplate = async () => {
    const catTemplates = getTemplatesForCategory(selectedTemplateCategory)
    const title = prompt("새 계약서 템플릿 이름을 입력하세요:", `${selectedTemplateCategory} 계약서 ${catTemplates.length + 1}`)
    if (!title) return
    const { data } = await supabase.from("contract_templates").insert({
      category: selectedTemplateCategory,
      title,
      clauses: [],
      bank_info: templateBankInfo,
      company_info: templateCompanyInfo,
      display_order: contractTemplates.length + 1,
      is_active: true,
    }).select("id").single()
    await loadContractTemplates()
    if (data) setSelectedTemplateId(data.id)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("이 계약서 템플릿을 삭제하시겠습니까?")) return
    await supabase.from("contract_templates").delete().eq("id", id)
    setSelectedTemplateId(null)
    loadContractTemplates()
  }

  const handleAddClause = () => {
    setEditingClause(null)
    setClauseTitle("")
    setClauseBody("")
    setIsClauseDialogOpen(true)
  }

  const handleEditClause = (clause: any) => {
    setEditingClause(clause)
    setClauseTitle(clause.title)
    setClauseBody(clause.body)
    setIsClauseDialogOpen(true)
  }

  const handleSaveClause = async () => {
    const template = getSelectedTemplate()
    if (!template) return
    let clauses = [...(template.clauses || [])]

    if (editingClause) {
      clauses = clauses.map(c => c.order === editingClause.order ? { ...c, title: clauseTitle, body: clauseBody } : c)
    } else {
      const maxOrder = clauses.length > 0 ? Math.max(...clauses.map((c: any) => c.order)) : 0
      clauses.push({ order: maxOrder + 1, title: clauseTitle, body: clauseBody })
    }

    await supabase.from("contract_templates").update({ clauses, updated_at: new Date().toISOString() }).eq("id", template.id)
    loadContractTemplates()
    setIsClauseDialogOpen(false)
  }

  const handleDeleteClause = async (order: number) => {
    if (!confirm("이 조항을 삭제하시겠습니까?")) return
    const template = getSelectedTemplate()
    if (!template) return
    const clauses = (template.clauses || [])
      .filter((c: any) => c.order !== order)
      .map((c: any, idx: number) => ({ ...c, order: idx + 1 }))
    await supabase.from("contract_templates").update({ clauses, updated_at: new Date().toISOString() }).eq("id", template.id)
    loadContractTemplates()
  }

  const handleClauseReorder = async () => {
    if (clauseDragItem === null || clauseDragOverItem === null || clauseDragItem === clauseDragOverItem) return
    const template = getSelectedTemplate()
    if (!template) return

    const clauses = [...(template.clauses || [])]
    const [moved] = clauses.splice(clauseDragItem, 1)
    clauses.splice(clauseDragOverItem, 0, moved)
    const reordered = clauses.map((c: any, idx: number) => ({ ...c, order: idx + 1 }))

    await supabase.from("contract_templates").update({ clauses: reordered, updated_at: new Date().toISOString() }).eq("id", template.id)
    setClauseDragItem(null)
    setClauseDragOverItem(null)
    loadContractTemplates()
  }

  const handleUploadSeal = async () => {
    if (!sealFile) return
    const fileExt = sealFile.name.split(".").pop()
    const fileName = `${sealUploadCompany}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("company-seals")
      .upload(fileName, sealFile, { upsert: true })

    if (uploadError) {
      alert("도장 업로드 실패: " + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from("company-seals").getPublicUrl(fileName)
    if (!urlData?.publicUrl) return

    await supabase.from("company_seals").update({ is_active: false }).eq("company", sealUploadCompany)
    await supabase.from("company_seals").insert({
      company: sealUploadCompany,
      seal_url: urlData.publicUrl,
      is_active: true,
    })
    setSealFile(null)
    loadCompanySeals()
  }

  useEffect(() => {
    loadSettings()
    loadContractTemplates()
    loadCompanySeals()
  }, [])

  useEffect(() => {
    const catTemplates = getTemplatesForCategory(selectedTemplateCategory)
    if (catTemplates.length > 0 && !catTemplates.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId(catTemplates[0].id)
    } else if (catTemplates.length === 0) {
      setSelectedTemplateId(null)
    }
  }, [selectedTemplateCategory, contractTemplates])

  useEffect(() => {
    const template = getSelectedTemplate()
    if (template) {
      setTemplateTitle(template.title || "")
      setTemplateBankInfo(template.bank_info || { bank: "", account: "", holder: "" })
      setTemplateCompanyInfo(template.company_info || { address: "", business_number: "", company_name: "", representative: "" })
    } else {
      setTemplateTitle(`${selectedTemplateCategory} 계약서`)
      setTemplateBankInfo({ bank: "", account: "", holder: "" })
      setTemplateCompanyInfo({ address: "", business_number: "", company_name: "", representative: "" })
    }
  }, [selectedTemplateId, contractTemplates])

  useEffect(() => {
    loadActivities()
  }, [selectedDate])

  const loadSettings = async () => {
    const { data, error } = await supabase.from("settings").select("*").order("display_order")

    if (!error && data) {
      setNeedsSettings(data.filter((s: any) => s.category === "needs"))
      setSourceSettings(data.filter((s: any) => s.category === "source"))
      setChannelSettings(data.filter((s: any) => s.category === "channel"))
      setGradeSettings(data.filter((s: any) => s.category === "grade"))
      setContractReasonSettings(data.filter((s: any) => s.category === "contract_reason"))
    }
  }

  const loadActivities = async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")

      const { data: activitiesData } = await supabase
        .from("activities")
        .select("*")
        .eq("activity_date", dateStr)
        .neq("activity_type", "메모")
        .order("created_at", { ascending: false })

      if (!activitiesData) {
        setActivities([])
        return
      }

      const dealIds = [...new Set(activitiesData.map((a: any) => a.deal_id).filter(Boolean))]
      if (dealIds.length === 0) {
        setActivities(activitiesData)
        return
      }

      const { data: dealsData } = await supabase.from("deals").select("id, deal_name, account_id").in("id", dealIds)

      const accountIds = [...new Set(dealsData?.map((d: any) => d.account_id).filter(Boolean) || [])]
      const { data: accountsData } =
        accountIds.length > 0
          ? await supabase.from("accounts").select("id, company_name").in("id", accountIds)
          : { data: [] }

      const enriched = activitiesData.map((activity: any) => {
        const deal = dealsData?.find((d: any) => d.id === activity.deal_id)
        const account = deal ? accountsData?.find((a: any) => a.id === deal.account_id) : null
        return {
          ...activity,
          deal: deal
            ? {
                deal_name: deal.deal_name,
                account: account ? { company_name: account.company_name } : undefined,
              }
            : undefined,
        }
      })

      setActivities(enriched)
    } catch (error) {
      console.error("활동 로드 오류:", error)
      setActivities([])
    }
  }

  const groupByAssignee = () => {
    const grouped: any = {}
    activities.forEach((activity) => {
      const assignee = activity.assigned_to || "미정"
      if (!grouped[assignee]) grouped[assignee] = []
      grouped[assignee].push(activity)
    })
    return grouped
  }

  const renderActivityLog = () => {
    const groupedActivities = groupByAssignee()
    const assignees =
      selectedAssignee === "전체"
        ? Object.keys(groupedActivities)
        : Object.keys(groupedActivities).filter((a) => a === selectedAssignee)

    const allAssignees = ["전체", "오일환", "박상혁", "윤경호", "미정"]

    // 텍스트 자르기 함수 (최대 글자수)
    const truncateText = (text: string | null | undefined, maxLength: number) => {
      if (!text) return "-"
      if (text.length <= maxLength) return text
      return text.slice(0, maxLength) + "..."
    }

    // 이미지로 복사하는 함수
    const copyAsImage = async (assignee: string) => {
      const element = assigneeRefs.current[assignee]
      if (!element) return

      try {
        // 복사 버튼 임시 숨기기
        const copyBtn = element.querySelector(".copy-button") as HTMLElement
        if (copyBtn) copyBtn.style.display = "none"
        
        // 원본 요소의 테두리 임시 제거
        const originalBorder = element.style.border
        element.style.border = "none"

        const blob = await toBlob(element, {
          backgroundColor: "#ffffff",
          pixelRatio: 2,
          cacheBust: true,
        })

        // 스타일 복원
        element.style.border = originalBorder
        if (copyBtn) copyBtn.style.display = ""
        
        if (!blob) {
          throw new Error("이미지 생성 실패")
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ])
          setCopiedAssignee(assignee)
          setTimeout(() => setCopiedAssignee(null), 2000)
        } catch (err) {
          // 클립보드 API 실패 시 다운로드로 대체
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${assignee}_활동기록_${format(selectedDate, "yyyyMMdd")}.png`
          a.click()
          URL.revokeObjectURL(url)
          setCopiedAssignee(assignee)
          setTimeout(() => setCopiedAssignee(null), 2000)
        }
      } catch (error) {
        console.error("이미지 생성 실패:", error)
        alert("이미지 복사에 실패했습니다.")
      }
    }

    const goToPreviousDay = () => {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() - 1)
      setSelectedDate(newDate)
    }

    const goToNextDay = () => {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() + 1)
      setSelectedDate(newDate)
    }

    return (
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">담당자별 활동 기록</h3>
          <div className="flex gap-2">
            {allAssignees.map((assignee) => (
              <Button
                key={assignee}
                variant={selectedAssignee === assignee ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssignee(assignee)}
              >
                {assignee}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] bg-transparent">
                <Calendar className="h-4 w-4 mr-2" />
                {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date)
                    setIsDatePickerOpen(false)
                  }
                }}
                locale={ko}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {assignees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">선택한 날짜에 등록된 활동이 없습니다.</div>
        ) : (
          <div className="space-y-6">
            {assignees.map((assignee) => (
              <div 
                key={assignee} 
                ref={(el) => { assigneeRefs.current[assignee] = el }}
                data-capture="true"
                className="rounded-lg p-4 border border-gray-200"
                style={{ backgroundColor: "#ffffff", overflow: "hidden" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">
                    {assignee} ({groupedActivities[assignee].length}건) - {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}
                </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyAsImage(assignee)}
                    className="print:hidden copy-button"
                  >
                    {copiedAssignee === assignee ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                        복사됨!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        이미지로 복사
                      </>
                    )}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="py-2 w-[5%]">번호</TableHead>
                      <TableHead className="py-2 w-[15%]">거래처</TableHead>
                      <TableHead className="py-2 w-[10%]">활동 유형</TableHead>
                      <TableHead className="py-2 w-[10%]">제목</TableHead>
                      <TableHead className="py-2 w-[60%]">내용</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedActivities[assignee].map((activity: any, index: number) => (
                      <TableRow 
                        key={activity.id} 
                        className={`h-12 ${activity.deal_id ? "cursor-pointer hover:bg-muted/50" : ""}`}
                        onClick={() => {
                          if (activity.deal_id) {
                            router.push(`/deals/${activity.deal_id}`)
                          }
                        }}
                      >
                        <TableCell className="py-2">{index + 1}</TableCell>
                        <TableCell className="py-2">{truncateText(activity.deal?.account?.company_name, 15)}</TableCell>
                        <TableCell className="py-2">{activity.activity_type}</TableCell>
                        <TableCell className="py-2">{truncateText(activity.title, 10)}</TableCell>
                        <TableCell className="py-2">{truncateText(activity.content, 70)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </Card>
    )
  }

  const handleAdd = (category: string) => {
    setCurrentCategory(category)
    setEditingItem(null)
    setNewValue("")
    setNewServiceType("")
    setIsDialogOpen(true)
  }

  const handleEdit = (item: any) => {
    setCurrentCategory(item.category)
    setEditingItem(item)
    setNewValue(item.value)
    setNewServiceType(item.service_type || "")
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    await supabase.from("settings").delete().eq("id", id)
    loadSettings()
  }

  const handleSave = async () => {
    if (!newValue.trim()) return

    if (editingItem) {
      const updateData: any = { value: newValue }
      if (currentCategory === "needs") {
        updateData.service_type = newServiceType || null
      }
      await supabase.from("settings").update(updateData).eq("id", editingItem.id)
    } else {
      const settings =
        currentCategory === "needs"
          ? needsSettings
          : currentCategory === "source"
            ? sourceSettings
            : currentCategory === "grade"
              ? gradeSettings
              : currentCategory === "contract_reason"
                ? contractReasonSettings
                : channelSettings
      const insertData: any = {
        category: currentCategory,
        value: newValue,
        display_order: settings.length + 1,
      }
      if (currentCategory === "needs") {
        insertData.service_type = newServiceType || null
      }
      await supabase.from("settings").insert(insertData)
    }
    loadSettings()
    setIsDialogOpen(false)
  }

  const renderSettingsTable = (settings: any[], category: string, title: string) => {
    const isNeedsCategory = category === "needs"
    
    return (
      <Card className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button onClick={() => handleAdd(category)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            추가
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="h-10">
              <TableHead className="w-[40px] py-2"></TableHead>
              <TableHead className="py-2">항목</TableHead>
              {isNeedsCategory && <TableHead className="w-[120px] py-2">서비스 타입</TableHead>}
              <TableHead className="w-[60px] py-2">순서</TableHead>
              <TableHead className="w-[120px] py-2">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.length === 0 ? (
              <TableRow className="h-12">
                <TableCell colSpan={isNeedsCategory ? 5 : 4} className="text-center text-muted-foreground py-3">
                  등록된 항목이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              settings.map((item) => (
                <TableRow
                  key={item.id}
                  className={`h-12 transition-colors ${dragOverItem === item.id ? "bg-primary/10" : ""}`}
                  draggable
                  onDragStart={() => setDragItem(item.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverItem(item.id) }}
                  onDragLeave={() => { if (dragOverItem === item.id) setDragOverItem(null) }}
                  onDrop={(e) => { e.preventDefault(); handleReorder(settings, category) }}
                  onDragEnd={() => { setDragItem(null); setDragOverItem(null) }}
                >
                  <TableCell className="py-2 w-[40px] cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="py-2">{item.value}</TableCell>
                  {isNeedsCategory && (
                    <TableCell className="py-2">
                      {item.service_type ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.service_type === "마케팅" ? "bg-purple-100 text-purple-700" :
                          item.service_type === "홈페이지" ? "bg-cyan-100 text-cyan-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>
                          {item.service_type}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">미지정</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="py-2 text-muted-foreground text-xs">{item.display_order}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    )
  }

  const TEMPLATE_CATEGORIES = ["홈페이지", "마케팅", "디자인", "앱개발", "ERP개발", "영상"]

  const renderContractTemplates = () => {
    const template = getSelectedTemplate()
    const clauses = template?.clauses || []
    const catTemplates = getTemplatesForCategory(selectedTemplateCategory)

    return (
      <div className="space-y-6">
        {/* 카테고리 선택 */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map(cat => {
            const count = getTemplatesForCategory(cat).length
            return (
              <Button
                key={cat}
                variant={selectedTemplateCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTemplateCategory(cat)}
              >
                {cat}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{count}</Badge>
                )}
              </Button>
            )
          })}
        </div>

        {/* 해당 카테고리의 템플릿 목록 */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{selectedTemplateCategory} 계약서 템플릿 ({catTemplates.length}개)</h3>
            <Button size="sm" variant="outline" onClick={handleAddTemplate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              새 템플릿
            </Button>
          </div>
          {catTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">등록된 템플릿이 없습니다. 새 템플릿을 추가하세요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {catTemplates.map(t => (
                <div key={t.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedTemplateId === t.id ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedTemplateId(t.id)}
                  >
                    {t.title}
                    <span className="ml-1 text-[10px] opacity-70">({(t.clauses || []).length}조)</span>
                  </Button>
                  {catTemplates.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 왼쪽: 기본 정보 */}
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                기본 정보
              </h3>
              <div>
                <label className="text-xs font-medium text-muted-foreground">계약서 제목</label>
                <Input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} className="mt-1 text-sm" placeholder="예: 홈페이지 구축 계약서" />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">은행 정보</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">은행명</label>
                  <Input value={templateBankInfo.bank} onChange={e => setTemplateBankInfo(p => ({ ...p, bank: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">계좌번호</label>
                  <Input value={templateBankInfo.account} onChange={e => setTemplateBankInfo(p => ({ ...p, account: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">예금주</label>
                  <Input value={templateBankInfo.holder} onChange={e => setTemplateBankInfo(p => ({ ...p, holder: e.target.value }))} className="mt-1 text-sm" />
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">을(우리 회사) 정보</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">회사명</label>
                  <Input value={templateCompanyInfo.company_name} onChange={e => setTemplateCompanyInfo(p => ({ ...p, company_name: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">대표자</label>
                  <Input value={templateCompanyInfo.representative} onChange={e => setTemplateCompanyInfo(p => ({ ...p, representative: e.target.value }))} className="mt-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">사업자번호</label>
                <Input value={templateCompanyInfo.business_number} onChange={e => setTemplateCompanyInfo(p => ({ ...p, business_number: e.target.value }))} className="mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">주소</label>
                <Input value={templateCompanyInfo.address} onChange={e => setTemplateCompanyInfo(p => ({ ...p, address: e.target.value }))} className="mt-1 text-sm" />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">도장 관리</h3>
              <div className="space-y-3">
                {companySeals.map(seal => (
                  <div key={seal.id} className="flex items-center gap-3 p-2 border rounded-md">
                    <img src={seal.seal_url} alt={`${seal.company} 도장`} className="w-16 h-16 object-contain border rounded" />
                    <div>
                      <p className="text-sm font-medium">{seal.company}</p>
                      <p className="text-xs text-muted-foreground">사용 중</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs font-medium">도장 업로드</label>
                  <div className="flex gap-2">
                    <Select value={sealUploadCompany} onValueChange={setSealUploadCompany}>
                      <SelectTrigger className="w-28 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="플루타">플루타</SelectItem>
                        <SelectItem value="오코랩스">오코랩스</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-sm flex-1"
                      onChange={e => setSealFile(e.target.files?.[0] || null)}
                    />
                    <Button size="sm" onClick={handleUploadSeal} disabled={!sealFile}>
                      <Upload className="h-4 w-4 mr-1" />
                      업로드
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG 투명 배경 권장 (200x200px)</p>
                </div>
              </div>
            </Card>

            <Button onClick={handleSaveTemplate} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              템플릿 저장
            </Button>
          </div>

          {/* 오른쪽: 조항 목록 */}
          <div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">조항 목록 ({clauses.length}개)</h3>
                <Button size="sm" onClick={handleAddClause} disabled={!template}>
                  <Plus className="h-4 w-4 mr-1" />
                  조항 추가
                </Button>
              </div>
              {!template ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  먼저 왼쪽에서 기본 정보를 입력하고 &quot;템플릿 저장&quot;을 눌러주세요.
                </div>
              ) : clauses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">등록된 조항이 없습니다.</div>
              ) : (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {clauses.map((clause: any, idx: number) => (
                    <div
                      key={clause.order}
                      className={`flex items-start gap-2 p-2 rounded-md border text-sm transition-colors ${clauseDragOverItem === idx ? "bg-primary/10 border-primary" : "hover:bg-muted/50"}`}
                      draggable
                      onDragStart={() => setClauseDragItem(idx)}
                      onDragOver={e => { e.preventDefault(); setClauseDragOverItem(idx) }}
                      onDragLeave={() => { if (clauseDragOverItem === idx) setClauseDragOverItem(null) }}
                      onDrop={e => { e.preventDefault(); handleClauseReorder() }}
                      onDragEnd={() => { setClauseDragItem(null); setClauseDragOverItem(null) }}
                    >
                      <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{clause.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{clause.body}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditClause(clause)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteClause(clause.order)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              조항 본문에서 <code className="px-1 bg-muted rounded">{"{{변수명}}"}</code>을 사용하면 계약서 생성 시 자동 치환됩니다.
              <br />예: {"{{amount}}"}, {"{{content_description}}"}, {"{{dev_start}}"}, {"{{dev_end}}"}
            </p>
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
        <main className="flex-1 overflow-auto p-4 xl:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">관리자</h1>
            </div>
            <p className="text-muted-foreground">거래 정보 필드의 선택 항목을 관리합니다.</p>
          </div>

          <Tabs defaultValue="needs" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="needs">니즈 축약</TabsTrigger>
              <TabsTrigger value="source">유입 경로</TabsTrigger>
              <TabsTrigger value="channel">문의 창구</TabsTrigger>
              <TabsTrigger value="grade">등급</TabsTrigger>
              <TabsTrigger value="contract_reason">결정 사유</TabsTrigger>
              <TabsTrigger value="contract_template">계약서 템플릿</TabsTrigger>
              <TabsTrigger value="activity">활동 기록</TabsTrigger>
              <TabsTrigger value="patchnotes">패치노트</TabsTrigger>
            </TabsList>

            <TabsContent value="needs">{renderSettingsTable(needsSettings, "needs", "니즈 축약 항목")}</TabsContent>
            <TabsContent value="source">{renderSettingsTable(sourceSettings, "source", "유입 경로 항목")}</TabsContent>
            <TabsContent value="channel">
              {renderSettingsTable(channelSettings, "channel", "문의 창구 항목")}
            </TabsContent>
            <TabsContent value="grade">{renderSettingsTable(gradeSettings, "grade", "등급 항목")}</TabsContent>
            <TabsContent value="contract_reason">{renderSettingsTable(contractReasonSettings, "contract_reason", "계약 확정 결정 사유")}</TabsContent>
            <TabsContent value="contract_template">{renderContractTemplates()}</TabsContent>
            <TabsContent value="activity">{renderActivityLog()}</TabsContent>
            <TabsContent value="patchnotes">
              <PatchNotesManager />
            </TabsContent>
          </Tabs>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItem ? "항목 수정" : "항목 추가"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">값</label>
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="항목 값을 입력하세요"
                    className="mt-1"
                  />
                </div>
                {currentCategory === "needs" && (
                  <div>
                    <label className="text-sm font-medium">서비스 타입</label>
                    <Select value={newServiceType} onValueChange={setNewServiceType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="서비스 타입을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="마케팅">마케팅</SelectItem>
                        <SelectItem value="홈페이지">홈페이지</SelectItem>
                        <SelectItem value="ERP/커스텀">ERP/커스텀</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      파이프라인에서 서비스별 분류에 사용됩니다.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave}>{editingItem ? "수정" : "추가"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 조항 편집 다이얼로그 */}
          <Dialog open={isClauseDialogOpen} onOpenChange={setIsClauseDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingClause ? "조항 수정" : "조항 추가"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">조항 제목</label>
                  <Input
                    value={clauseTitle}
                    onChange={e => setClauseTitle(e.target.value)}
                    placeholder="예: 제 1 조 ( 목적 )"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">조항 본문</label>
                  <Textarea
                    value={clauseBody}
                    onChange={e => setClauseBody(e.target.value)}
                    placeholder="조항 내용을 입력하세요. {{변수명}} 형태로 동적 필드를 삽입할 수 있습니다."
                    className="mt-1 min-h-[200px] text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    사용 가능한 변수: {"{{amount}}"}, {"{{content_description}}"}, {"{{dev_start}}"}, {"{{dev_end}}"}, {"{{bank_name}}"}, {"{{bank_account}}"}, {"{{bank_holder}}"}, {"{{deposit_percent}}"}, {"{{deposit_amount}}"}, {"{{balance_percent}}"}, {"{{balance_amount}}"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClauseDialogOpen(false)}>취소</Button>
                <Button onClick={handleSaveClause}>{editingClause ? "수정" : "추가"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
