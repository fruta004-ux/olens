"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Shield, Plus, Pencil, Trash2, Calendar, ChevronLeft, ChevronRight, Copy, Check, GripVertical } from "lucide-react"
import { toBlob } from "html-to-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
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

  useEffect(() => {
    loadSettings()
  }, [])

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
            <TabsList>
              <TabsTrigger value="needs">니즈 축약</TabsTrigger>
              <TabsTrigger value="source">유입 경로</TabsTrigger>
              <TabsTrigger value="channel">문의 창구</TabsTrigger>
              <TabsTrigger value="grade">등급</TabsTrigger>
              <TabsTrigger value="contract_reason">결정 사유</TabsTrigger>
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
        </main>
      </div>
    </div>
  )
}
