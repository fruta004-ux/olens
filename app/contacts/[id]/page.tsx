"use client"

import { useEffect } from "react"

import type React from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, Calendar, MessageSquare, FileText, Check, X } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <ContactDetailPageClient accountId={id} />
}

function ContactDetailPageClient({ accountId }: { accountId: string }) {
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null)
  const [activityEditValues, setActivityEditValues] = useState<{ title: string; content: string }>({
    title: "",
    content: "",
  })
  const [activeTab, setActiveTab] = useState("info")
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [newActivity, setNewActivity] = useState({
    title: "",
    content: "",
    type: "이메일",
  })

  const [contactData, setContactData] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createBrowserClient()

      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", accountId)
        .single()

      if (accountError) {
        console.error("[v0] 거래처 정보 로드 오류:", accountError)
        setLoading(false)
        return
      }

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })

      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })

      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("account_id", accountId)

      setContactData(account)
      setActivities(activitiesData || [])
      setDeals(dealsData || [])
      setNotes(notesData || [])
      setLoading(false)
    }

    loadData()
  }, [accountId])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "call":
        return <Phone className="h-4 w-4" />
      case "meeting":
        return <Calendar className="h-4 w-4" />
      case "note":
        return <FileText className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "높음":
        return "text-red-600"
      case "중간":
        return "text-yellow-600"
      default:
        return "text-muted-foreground"
    }
  }

  const handleSave = async (field: string) => {
    const newValue = editValues[field]

    if (newValue === undefined || newValue === null) {
      setEditingField(null)
      setEditValues((prev) => {
        const newValues = { ...prev }
        delete newValues[field]
        return newValues
      })
      return
    }

    try {
      const supabase = createBrowserClient()

      const fieldMap = {
        contact_name: "contact_name",
        contact_position: "contact_position",
        contact_department: "contact_department",
        email: "email",
        phone: "phone",
        company_name: "company_name",
        website: "website",
        address: "address",
        lead_score: "lead_score",
        industry: "industry",
        company_size: "company_size",
        annual_revenue: "annual_revenue",
        representative: "representative",
        business_number: "business_number",
        employee_count: "employee_count",
      }

      const dbField = fieldMap[field]

      if (dbField) {
        const { data, error } = await supabase
          .from("accounts")
          .update({ [dbField]: newValue })
          .eq("id", accountId)
          .select()

        if (error) {
          console.error("[v0] Supabase error:", error)
          throw error
        }

        setContactData((prev) => ({ ...prev, [field]: newValue }))
      }
    } catch (error) {
      console.error("[v0] === SAVE ERROR ===", error)
    }

    setEditingField(null)
    setEditValues((prev) => {
      const newValues = { ...prev }
      delete newValues[field]
      return newValues
    })
  }

  const handleCancel = () => {
    const currentField = editingField
    setEditingField(null)
    if (currentField) {
      setEditValues((prev) => {
        const newValues = { ...prev }
        delete newValues[currentField]
        return newValues
      })
    }
  }

  const handleActivityClick = (activityId: number, title: string, content: string) => {
    setEditingActivityId(activityId)
    setActivityEditValues({ title, content })
  }

  const handleSaveActivity = async (activityId: number, title: string, content: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from("activities")
      .update({
        title: title,
        content: content,
      })
      .eq("id", activityId)

    if (error) {
      console.error("[v0] 활동 저장 오류:", error)
      alert("활동 저장 중 오류가 발생했습니다.")
      return
    }

    setActivities(activities.map((a) => (a.id === activityId ? { ...a, title, content: content } : a)))
    setEditingActivityId(null)
  }

  const handleCancelActivityEdit = () => {
    setEditingActivityId(null)
  }

  const handleSaveNote = async (noteId: number, content: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.from("notes").update({ content: content }).eq("id", noteId)

    if (error) {
      console.error("[v0] 메모 저장 오류:", error)
      alert("메모 저장 중 오류가 발생했습니다.")
      return
    }

    setNotes(notes.map((n) => (n.id === noteId ? { ...n, content } : n)))
    setEditingNoteId(null)
  }

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null)
  }

  const handleAddActivity = async () => {
    if (!newActivity.title || !newActivity.content) {
      alert("제목과 내용을 입력해주세요.")
      return
    }

    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from("activities")
      .insert({
        related_to: "account",
        related_id: accountId,
        type: newActivity.type,
        title: newActivity.title,
        content: newActivity.content,
        user: "담당자", // TODO: 실제 로그인 유저로 변경
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] 활동 추가 오류:", error)
      alert("활동 추가 중 오류가 발생했습니다.")
      return
    }

    setActivities([data, ...activities])
    setIsAddingActivity(false)
    setNewActivity({ title: "", content: "", type: "이메일" })
  }

  const handleEdit = (field: string, value: string) => {
    setEditingField(field)
    setEditValues({ ...editValues, [field]: value })
  }

  const EditableField = ({
    label,
    field,
    value,
    multiline = false,
  }: {
    label: string
    field: string
    value: string
    multiline?: boolean
  }) => {
    const isEditing = editingField === field
    const currentValue = isEditing ? (editValues[field] ?? "") : value || ""

    const handleSaveClick = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleSave(field)
    }

    const handleCancelClick = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleCancel()
    }

    const handleBlur = (e: React.FocusEvent) => {
      if (e.relatedTarget instanceof HTMLElement) {
        const isButton = e.relatedTarget.closest("button")
        if (isButton) {
          return
        }
      }
      handleSave(field)
    }

    return (
      <div>
        <label className="text-xs text-muted-foreground">{label}</label>
        {isEditing ? (
          <div className="mt-1 flex items-center gap-2">
            {multiline ? (
              <Textarea
                value={currentValue}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                onBlur={handleBlur}
                className="text-sm"
                rows={3}
                autoFocus
              />
            ) : (
              <Input
                value={currentValue}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                onBlur={handleBlur}
                className="text-sm"
                autoFocus
              />
            )}
            <Button size="sm" variant="ghost" onMouseDown={handleSaveClick}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onMouseDown={handleCancelClick}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <p
            className="text-sm font-medium text-foreground mt-1 cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2"
            onClick={() => handleEdit(field, value)}
          >
            {currentValue || "클릭하여 입력"}
          </p>
        )}
      </div>
    )
  }

  const tasks = [
    {
      id: 1,
      title: "후속 이메일 발송",
      dueDate: "2024-03-21",
      priority: "높음",
      status: "예정",
    },
    {
      id: 2,
      title: "계약서 초안 검토",
      dueDate: "2024-03-23",
      priority: "중간",
      status: "예정",
    },
    {
      id: 3,
      title: "기술 미팅 일정 조율",
      dueDate: "2024-03-20",
      priority: "높음",
      status: "완료",
    },
  ]

  useEffect(() => {
    async function redirectToDeal() {
      const supabase = createBrowserClient()

      // 해당 account_id에 속한 거래 찾기
      const { data: dealsData, error } = await supabase
        .from("deals")
        .select("id")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        console.error("[v0] 거래 조회 오류:", error)
        // 거래가 없으면 연락처 목록으로 이동
        router.replace("/contacts")
        return
      }

      if (dealsData && dealsData.length > 0) {
        // 가장 최근 거래의 정보 탭으로 리다이렉트
        router.replace(`/deals/${dealsData[0].id}?tab=info`)
      } else {
        // 거래가 없으면 연락처 목록으로 이동
        router.replace("/contacts")
      }
    }

    redirectToDeal()
  }, [accountId, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">거래 정보로 이동 중...</p>
      </div>
    </div>
  )
}
