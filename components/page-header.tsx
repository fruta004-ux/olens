"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Search, User, Home } from "lucide-react"
import { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  className?: string
}

export function PageHeader({ icon: Icon, title, className }: PageHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // TODO: 검색 기능 구현
      console.log("검색:", searchQuery)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <header className={cn(
      "flex items-center justify-between gap-4 py-3 px-4 bg-card border-b border-border",
      className
    )}>
      {/* 좌측: 아이콘 + 타이틀 */}
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      {/* 중앙: 검색바 */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="검색어를 입력해주세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pr-20 h-9 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            className="absolute right-1 h-7 px-3 text-xs"
          >
            검색
          </Button>
        </div>
      </div>

      {/* 우측: 유저 정보 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">user01</span>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}
