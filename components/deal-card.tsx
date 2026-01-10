"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, Calendar, MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"

interface DealCardProps {
  id: string
  company: string
  value: string
  contact: string
  dueDate: string
  probability: number
}

export function DealCard({ id, company, value, contact, dueDate, probability }: DealCardProps) {
  const router = useRouter()

  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return "bg-green-500"
    if (prob >= 50) return "bg-yellow-500"
    return "bg-orange-500"
  }

  const handleCardClick = () => {
    router.push(`/deals/${id}`)
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/deals/${id}`)
  }

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{company}</h3>
            <p className="mt-1 text-xl font-bold text-primary">{value}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>상세 보기</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>수정</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>단계 변경</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {contact}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {dueDate}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">성공 확률</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full ${getProbabilityColor(probability)}`} style={{ width: `${probability}%` }} />
            </div>
            <span className="text-xs font-medium text-foreground">{probability}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
