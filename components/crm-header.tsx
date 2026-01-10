"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Bell, PhoneIncoming, Plus, Lock } from "lucide-react"
import { useState } from "react"
import { QuickMemoDialog } from "@/components/quick-memo-dialog"
import { CrmQuickRegisterDialog } from "@/components/crm-quick-register-dialog"

export function CrmHeader() {
  const [quickMemoOpen, setQuickMemoOpen] = useState(false)
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="검색..." className="pl-10" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={() => setQuickRegisterOpen(true)}
          >
            <Plus className="h-4 w-4" />
            CRM 빠른 등록
          </Button>

          <Button variant="default" size="sm" className="gap-2" onClick={() => setQuickMemoOpen(true)}>
            <PhoneIncoming className="h-4 w-4" />
            빠른 메모
          </Button>

          <Button variant="ghost" size="icon" className="relative opacity-50 cursor-not-allowed" disabled>
            <Bell className="h-5 w-5" />
            <Lock className="absolute right-1.5 top-1.5 h-3 w-3" />
          </Button>

          <div className="relative opacity-50 cursor-not-allowed">
            <Avatar>
              <AvatarFallback className="bg-muted text-muted-foreground">JS</AvatarFallback>
            </Avatar>
            <Lock className="absolute right-0 bottom-0 h-3 w-3 bg-card rounded-full p-0.5" />
          </div>
        </div>
      </header>

      <QuickMemoDialog open={quickMemoOpen} onOpenChange={setQuickMemoOpen} />
      <CrmQuickRegisterDialog open={quickRegisterOpen} onOpenChange={setQuickRegisterOpen} />
    </>
  )
}

export default CrmHeader
