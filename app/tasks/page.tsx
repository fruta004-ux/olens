"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CrmSidebar } from "@/components/crm-sidebar"
import { CrmHeader } from "@/components/crm-header"
import { TaskItem } from "@/components/task-item"
import { AddTaskDialog } from "@/components/add-task-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface Task {
  id: string
  title: string
  description: string | null
  priority: "높음" | "보통" | "낮음"
  due_date: string
  status: "진행중" | "완료" | "보류"
  assigned_to: string
  deal_id: string | null
  created_at: string
  deal?: {
    id: string
    account?: {
      company_name: string
    }
  }
}

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [assigneeFilter, setAssigneeFilter] = useState<string>(searchParams.get("assignee") || "전체")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isCreatingReminders, setIsCreatingReminders] = useState(false)
  const [activeTab, setActiveTab] = useState("today")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const loadTasks = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        deal:deals!deal_id (
          id,
          account:accounts!account_id (
            company_name
          )
        )
      `)
      .order("due_date", { ascending: true })

    if (error) {
      console.error("[v0] 작업 로드 실패:", error)
    } else {
      setTasks(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "완료" ? "진행중" : "완료"

    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)

    if (error) {
      console.error("[v0] 작업 상태 변경 실패:", error)
    } else {
      loadTasks()
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)

    if (error) {
      console.error("[v0] 작업 삭제 실패:", error)
    } else {
      loadTasks()
    }
  }

  const createRemindersFromNextContactDates = async () => {
    setIsCreatingReminders(true)

    try {
      const { data: deals, error: dealsError } = await supabase
        .from("deals")
        .select(`
          id,
          next_contact_date,
          assigned_to,
          deal_name,
          account:accounts!account_id (
            company_name
          )
        `)
        .not("next_contact_date", "is", null)

      if (dealsError) {
        console.error("[v0] 거래 조회 실패:", dealsError)
        setIsCreatingReminders(false)
        return
      }

      let createdCount = 0

      for (const deal of deals || []) {
        const { data: existingTasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("deal_id", deal.id)
          .eq("due_date", deal.next_contact_date)
          .limit(1)

        if (existingTasks && existingTasks.length > 0) {
          continue
        }

        const { error: taskError } = await supabase.from("tasks").insert({
          title: `${deal.account?.company_name || deal.deal_name} 연락하기`,
          description: `다음 연락일: ${deal.next_contact_date}`,
          priority: "보통",
          status: "진행중",
          assigned_to: deal.assigned_to || "미정",
          deal_id: deal.id,
          due_date: deal.next_contact_date,
        })

        if (taskError) {
          console.error("[v0] 작업 생성 실패:", taskError)
        } else {
          createdCount++
        }
      }

      alert(`${createdCount}개의 리마인더가 생성되었습니다.`)
      loadTasks()
    } catch (error) {
      console.error("[v0] 리마인더 생성 중 오류:", error)
    }

    setIsCreatingReminders(false)
  }

  const getKSTToday = () => {
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
    const kstDate = new Date(now.getTime() + kstOffset)
    return kstDate.toISOString().split("T")[0]
  }

  const today = getKSTToday()
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)
  const threeDaysLaterStr = threeDaysLater.toISOString().split("T")[0]

  const filteredTasks = tasks.filter((task) => {
    // 기존 데이터 호환성: "오일환 대표" → "오일환" 포함 체크
    const taskAssignee = task.assigned_to?.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장)$/g, '').trim() || ''
    const assigneeMatch = assigneeFilter === "전체" || task.assigned_to === assigneeFilter || taskAssignee === assigneeFilter
    return assigneeMatch
  })

  const todayTasks = filteredTasks.filter((task) => {
    const taskDate = task.due_date.split("T")[0]
    return task.status !== "완료" && taskDate <= today
  })

  const upcomingTasks = filteredTasks.filter((task) => {
    const taskDate = task.due_date.split("T")[0]
    return task.status !== "완료" && taskDate > today
  })

  const completedTasks = filteredTasks.filter((task) => task.status === "완료")

  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const getTasksForDate = (date: string) => {
    return filteredTasks.filter((task) => task.due_date === date)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleAssigneeFilterChange = (assignee: string) => {
    setAssigneeFilter(assignee)

    if (assignee === "전체") {
      router.push("/tasks")
    } else {
      router.push(`/tasks?assignee=${encodeURIComponent(assignee)}`)
    }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })

  const calendarDays = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : []

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <CrmSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CrmHeader />
          <main className="flex-1 overflow-y-auto p-2 xl:p-6">
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">작업 로딩 중...</p>
            </div>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">작업 관리</h1>
                <p className="mt-1 text-sm text-muted-foreground">영업 활동과 작업을 효율적으로 관리하세요</p>
              </div>
              <AddTaskDialog onTaskAdded={loadTasks} />
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              {/* 담당자 필터 */}
              <div className="flex flex-wrap gap-1 border border-border rounded-lg p-1">
                {["전체", "오일환", "박상혁", "윤경호", "미정"].map((assignee) => (
                  <Button
                    key={assignee}
                    variant={assigneeFilter === assignee ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleAssigneeFilterChange(assignee)}
                    className="text-xs sm:text-sm"
                  >
                    {assignee}
                  </Button>
                ))}
              </div>

              {/* 리마인더 생성 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={createRemindersFromNextContactDates}
                disabled={isCreatingReminders}
                className="whitespace-nowrap bg-transparent"
              >
                {isCreatingReminders ? "생성 중..." : "리마인더 생성"}
              </Button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => setActiveTab("today")}>
              <CardContent className="p-3 md:p-4">
                <div className="text-xs sm:text-sm text-muted-foreground">오늘 할 일</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{todayTasks.length}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => setActiveTab("upcoming")}>
              <CardContent className="p-3 md:p-4">
                <div className="text-xs sm:text-sm text-muted-foreground">다가오는 작업</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{upcomingTasks.length}</div>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setActiveTab("completed")}
            >
              <CardContent className="p-3 md:p-4">
                <div className="text-xs sm:text-sm text-muted-foreground">완료된 작업</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{completedTasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="text-xs sm:text-sm text-muted-foreground">완료율</div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{completionRate}%</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="today" className="text-xs sm:text-sm">
                오늘 ({todayTasks.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                예정 ({upcomingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">
                완료 ({completedTasks.length})
              </TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs sm:text-sm">
                캘린더
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              {todayTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">오늘 할 일이 없습니다.</p>
              ) : (
                todayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">예정된 작업이 없습니다.</p>
              ) : (
                upcomingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">완료된 작업이 없습니다.</p>
              ) : (
                completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                      <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                    <h2 className="text-base md:text-xl font-semibold">{monthName}</h2>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                      <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                    {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs md:text-sm font-semibold text-muted-foreground p-1 md:p-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {calendarDays.map((day, index) => {
                      if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />
                      }

                      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      const dayTasks = getTasksForDate(dateString)
                      const isToday = dateString === today
                      const isSelected = dateString === selectedDate

                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDate(dateString)}
                          className={`aspect-square p-1 md:p-2 rounded-lg border transition-colors ${
                            isToday ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                          } ${isSelected ? "ring-2 ring-primary" : ""}`}
                        >
                          <div className="text-xs md:text-sm font-medium mb-1">{day}</div>
                          {dayTasks.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 md:gap-1 justify-center">
                              {dayTasks.slice(0, 3).map((task, i) => (
                                <div
                                  key={i}
                                  className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                                    task.priority === "높음"
                                      ? "bg-red-500"
                                      : task.priority === "보통"
                                        ? "bg-yellow-500"
                                        : "bg-primary"
                                  }`}
                                />
                              ))}
                              {dayTasks.length > 3 && (
                                <div className="text-[10px] md:text-xs text-muted-foreground">+</div>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {selectedDate && (
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold mb-4">
                      {new Date(selectedDate).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      작업 ({selectedDateTasks.length})
                    </h3>
                    <div className="space-y-4">
                      {selectedDateTasks.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">이 날짜에 작업이 없습니다.</p>
                      ) : (
                        selectedDateTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggleComplete={handleToggleComplete}
                            onDelete={handleDeleteTask}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
