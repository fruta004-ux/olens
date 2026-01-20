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
} from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      return params.get("tab") || "activity"
    }
    return "activity"
  })
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
  const [showQuotationDialog, setShowQuotationDialog] = useState(false)
  const [pendingQuotation, setPendingQuotation] = useState<{
    quotationId: string
    totalAmount: number
  } | null>(null)

  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  const [showQuotationDetail, setShowQuotationDetail] = useState(false)
  
  // 활동 정렬 순서 상태 (desc: 최신순, asc: 오래된순)
  const [activitySortOrder, setActivitySortOrder] = useState<'desc' | 'asc'>('desc')
  
  // 종료 사유 모달 상태
  const [showCloseReasonDialog, setShowCloseReasonDialog] = useState(false)
  const [pendingStageChange, setPendingStageChange] = useState<string | null>(null)

  const supabase = createBrowserClient() // supabase 클라이언트 한번만 생성

  // resolvedId를 useEffect 외부에서 선언
  const resolvedId = clientId

  // isClosedStage 변수 정의
  const isClosedStage =
    dealData.stage === "S6_complete" ||
    dealData.stage === "S6_closed" ||
    dealData.stage === "S5_complete" ||
    dealData.stage === "S5_contract"

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("client_activities")
      .select("*")
      .eq("client_id", resolvedId)
      .order("activity_date", { ascending: false })

    if (error) {
      console.error("[v0] activities 로드 오류:", error)
      return
    }

    const parsedActivities = (data || []).map((activity: any) => {
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

      return {
        ...activity,
        attachments: parsedAttachments,
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

  useEffect(() => {
    if (!resolvedId) return

    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("*")

      if (data) {
        // needs, source, channel, grade 옵션들을 value와 label을 가진 객체 배열로 변환
        setNeedsOptions(data.filter((s) => s.category === "needs").map((s) => ({ value: s.value, label: s.value })))
        setSourceOptions(data.filter((s) => s.category === "source").map((s) => s.value))
        setChannelOptions(data.filter((s) => s.category === "channel").map((s) => s.value))
        setGradeOptions(data.filter((s) => s.category === "grade").map((s) => s.value))
      }
    }

    fetchSettings() // settings 로드
    loadDealData() // deal 데이터 로드
  }, [resolvedId, supabase, clientId]) // resolvedId, supabase, clientId 변경 시 다시 로드

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
      // 종료 단계로 변경 시 모달 열기
      setPendingStageChange(newStage)
      setShowCloseReasonDialog(true)
    } else {
      // 다른 단계는 바로 변경
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
          .update({ activity_id: activity.id })
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const newUrl = `/clients/${clientId}${tab === "activity" ? "" : `?tab=${tab}`}`
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
              <h3 className="font-semibold text-foreground">거래 정보</h3>

              <div>
                <label className="text-xs text-muted-foreground">니즈 축약</label>
                <div className="mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        {dealData.needs_summary ? dealData.needs_summary.split(",").join(", ") : "니즈를 선택하세요"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="니즈 검색..." />
                        <CommandList style={{ maxHeight: "300px", overflowY: "auto" }}>
                          <CommandEmpty>니즈를 찾을 수 없습니다.</CommandEmpty>
                          <CommandGroup>
                            {needsOptions.map((option) => {
                              const isSelected = dealData.needs_summary?.split(",").includes(option.value) || false
                              return (
                                <CommandItem
                                  key={option.value}
                                  onSelect={() => {
                                    const currentNeeds = dealData.needs_summary?.split(",").filter(Boolean) || []
                                    let newNeeds: string[]
                                    if (isSelected) {
                                      newNeeds = currentNeeds.filter((n) => n !== option.value)
                                    } else {
                                      newNeeds = [...currentNeeds, option.value]
                                    }
                                    handleUpdateDeal({ needs_summary: newNeeds.join(",") })
                                  }}
                                  className="cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="mr-2 w-4 h-4 rounded border-gray-300"
                                  />
                                  {option.label}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">유입 경로</label>
                <div className="mt-1">
                  <SearchableSelect
                    value={dealData.inflow_source || ""}
                    onValueChange={(value) => handleUpdateDeal({ inflow_source: value })}
                    options={sourceOptions}
                    placeholder="유입 경로 선택..."
                    searchPlaceholder="유입 경로 검색..."
                    emptyText="결과 없음"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">문의 창구</label>
                <div className="mt-1">
                  <SearchableSelect
                    value={dealData.inquiry_channel || ""}
                    onValueChange={(value) => handleUpdateDeal({ inquiry_channel: value })}
                    options={channelOptions}
                    placeholder="문의 창구 선택..."
                    searchPlaceholder="문의 창구 검색..."
                    emptyText="결과 없음"
                  />
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
                  <TabsTrigger value="activity" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    활동
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-2">
                    <FileText className="h-4 w-4" />
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

                <TabsContent value="activity" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle>활동 타임라인</CardTitle>
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
                                  placeholder="활동 내용 입력..."
                                  value={newActivity.content}
                                  onChange={(e) => setNewActivity({ ...newActivity, content: e.target.value })}
                                  className="min-h-[100px]"
                                />

                                <div>
                                  <Label className="mb-2">첨부파일</Label>
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || [])
                                      setNewActivity({ ...newActivity, attachments: files })
                                    }}
                                    className="cursor-pointer"
                                  />
                                  {newActivity.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {newActivity.attachments.map((file, idx) => (
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
                                              const newFiles = newActivity.attachments.filter((_, i) => i !== idx)
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

                                          {/* 활동 타임라인에서 견적서 표시 */}
                                          {activity.quotation && (
                                            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <p className="text-sm font-semibold text-purple-900">
                                                    💰 견적서: {activity.quotation.quotation_number}
                                                  </p>
                                                  <p className="text-xs text-purple-700">
                                                    ₩{activity.quotation.total_amount.toLocaleString("ko-KR")} (
                                                    {activity.quotation.company})
                                                  </p>
                                                </div>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedQuotation(activity.quotation)
                                                    setShowQuotationDetail(true)
                                                  }}
                                                >
                                                  견적서 보기
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {activity.attachments && activity.attachments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                              {activity.attachments.map((att: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="flex items-center gap-2 text-xs"
                                                  onClick={(e) => e.stopPropagation()}
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
                  <div className="mt-1 space-y-2">
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                      value={
                        [
                          "500만원 이하",
                          "500 ~ 1000만원",
                          "1000 ~ 2000만원",
                          "2000 ~ 3000만원",
                          "3000만원 이상",
                          "1억 이상",
                          "미입력 / 내부 검토",
                          "미확정",
                        ].includes(dealData.amount_range || "")
                          ? dealData.amount_range
                          : ""
                      }
                      onChange={(e) => {
                        const newAmount = e.target.value
                        handleUpdateDeal({ amount_range: newAmount })
                      }}
                    >
                      <option value="">선택 또는 직접 입력</option>
                      <option value="500만원 이하">500만원 이하</option>
                      <option value="500 ~ 1000만원">500 ~ 1000만원</option>
                      <option value="1000 ~ 2000만원">1000 ~ 2000만원</option>
                      <option value="2000 ~ 3000만원">2000 ~ 3000만원</option>
                      <option value="3000만원 이상">3000만원 이상</option>
                      <option value="1억 이상">1억 이상</option>
                      <option value="미입력 / 내부 검토">미입력 / 내부 검토</option>
                      <option value="미확정">미확정</option>
                    </select>
                    <Input
                      type="text"
                      placeholder="직접 입력 (예: 1,500,000)"
                      className="w-full text-sm bg-background"
                      value={
                        dealData.amount_range &&
                        ![
                          "500만원 이하",
                          "500 ~ 1000만원",
                          "1000 ~ 2000만원",
                          "2000 ~ 3000만원",
                          "3000만원 이상",
                          "1억 이상",
                          "미입력 / 내부 검토",
                          "미확정",
                        ].includes(dealData.amount_range)
                          ? dealData.amount_range
                          : ""
                      }
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value)
                        setDealData((prev) => ({ ...prev, amount_range: formatted }))
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleUpdateDeal({ amount_range: e.target.value })
                        }
                      }}
                    />
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
              </div>
            </div>
          </div>
        </div>
      </div>
      <CreateQuotationDialog
        open={showQuotationDialog}
        onOpenChange={setShowQuotationDialog}
        clientId={resolvedId}
        onSuccess={(quotationId, totalAmount) => {
          setPendingQuotation({ quotationId, totalAmount })
        }}
      />
      {/* 견적서 상세 다이얼로그 */}
      {selectedQuotation && (
        <QuotationViewDialog
          open={showQuotationDetail}
          onOpenChange={setShowQuotationDetail}
          quotation={selectedQuotation}
          clientName={dealData.account?.company_name || ""} // Pass company name here
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
    </div>
  )
}
