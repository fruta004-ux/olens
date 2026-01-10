"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, Clock, MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  title: string
  description: string | null
  task_type: string
  priority: "높음" | "보통" | "낮음"
  due_date: string
  due_time: string | null
  status: "진행중" | "완료" | "보류"
  assigned_to: string
  deal_id: string | null
  deal?: {
    id: string
    account?: {
      company_name: string
    }
  }
}

interface TaskItemProps {
  task: Task
  onToggleComplete: (taskId: string, currentStatus: string) => void
  onDelete: (taskId: string) => void
}

export function TaskItem({ task, onToggleComplete, onDelete }: TaskItemProps) {
  const router = useRouter()
  const completed = task.status === "완료"

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "높음":
        return "bg-red-500 text-white"
      case "보통":
        return "bg-yellow-500 text-white"
      case "낮음":
        return "bg-green-500 text-white"
      default:
        return "bg-secondary text-secondary-foreground"
    }
  }

  const getPriorityLabel = (priority: string) => {
    return priority
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateString === today.toISOString().split("T")[0]) return "오늘"
    if (dateString === tomorrow.toISOString().split("T")[0]) return "내일"

    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ""
    const [hour, minute] = timeString.split(":")
    const h = Number.parseInt(hour)
    const period = h >= 12 ? "오후" : "오전"
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${period} ${displayHour}:${minute}`
  }

  const companyName = task.deal?.account?.company_name || "내부"

  return (
    <Card className={completed ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Checkbox
            className="mt-1"
            checked={completed}
            onCheckedChange={() => onToggleComplete(task.id, task.status)}
          />

          <div className="flex-1">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`font-semibold text-foreground ${completed ? "line-through" : ""}`}>{task.title}</h3>
                {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {task.deal_id && (
                    <DropdownMenuItem onClick={() => router.push(`/deals/${task.deal_id}`)}>
                      거래 상세 보기
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onToggleComplete(task.id, task.status)}>
                    {completed ? "미완료 표시" : "완료 표시"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{task.task_type}</Badge>
              <Badge className={getPriorityColor(task.priority)}>{getPriorityLabel(task.priority)}</Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </div>
              {task.due_time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(task.due_time)}
                </div>
              )}
              {task.deal_id ? (
                <button
                  onClick={() => router.push(`/deals/${task.deal_id}`)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  · {companyName}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">· {companyName}</span>
              )}
              <span className="text-xs text-muted-foreground">· {task.assigned_to}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
