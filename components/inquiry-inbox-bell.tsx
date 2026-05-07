"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, Mail, Phone, ExternalLink, CheckCheck, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

type InquiryRow = {
  id: string
  source: string
  raw_text: string
  parsed_email: string | null
  parsed_phone: string | null
  parsed_field: string | null
  parsed_budget: string | null
  is_read: boolean
  received_at: string
}

const POLL_INTERVAL_MS = 60_000 // 1분마다 폴링 (실시간성 vs 부하 균형)

interface InquiryInboxBellProps {
  /** 헤더 안에 들어가는 ghost 버튼 / 플로팅용 카드 버튼 등 시각 변형 */
  variant?: "header" | "floating"
}

export function InquiryInboxBell({ variant = "header" }: InquiryInboxBellProps = {}) {
  const [items, setItems] = useState<InquiryRow[]>([])
  const [open, setOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("inquiry_inbox")
      .select("id, source, raw_text, parsed_email, parsed_phone, parsed_field, parsed_budget, is_read, received_at")
      .order("received_at", { ascending: false })
      .limit(20)
    if (!error && data) setItems(data as InquiryRow[])
  }, [supabase])

  // 초기 로드 + 주기적 폴링
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [load])

  // 드롭다운 열 때마다 즉시 새로고침 (사용자 체감 지연 최소화)
  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Realtime 구독 (Supabase가 활성화돼 있으면 즉시 반영)
  useEffect(() => {
    const channel = supabase
      .channel("inquiry_inbox_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inquiry_inbox" },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  const unreadCount = items.filter((i) => !i.is_read).length

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)))
    await supabase
      .from("inquiry_inbox")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
  }

  const markAllRead = async () => {
    const unreadIds = items.filter((i) => !i.is_read).map((i) => i.id)
    if (unreadIds.length === 0) return
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })))
    await supabase
      .from("inquiry_inbox")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds)
  }

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from("inquiry_inbox").delete().eq("id", id)
    setConfirmDeleteId(null)
  }

  const confirmingItem = confirmDeleteId ? items.find((i) => i.id === confirmDeleteId) : null

  const fmtRelative = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ko })
    } catch {
      return iso
    }
  }

  const triggerButton =
    variant === "floating" ? (
      <Button
        variant="default"
        size="icon"
        className="relative h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="새 문의 알림"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    ) : (
      <Button variant="ghost" size="icon" className="relative" aria-label="새 문의 알림">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] max-h-[520px] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">새 문의 알림</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            모두 읽음
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            아직 들어온 문의가 없습니다.
            <p className="text-xs mt-2">아임웹 새 문의가 카톡으로 도착하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((it) => {
              const preview = it.raw_text.split("\n").find((l) => l.trim())?.trim() || it.raw_text.slice(0, 40)
              return (
                <li
                  key={it.id}
                  className={`px-4 py-3 hover:bg-muted/40 ${it.is_read ? "" : "bg-blue-50/50"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          it.is_read ? "bg-muted-foreground/30" : "bg-red-500"
                        }`}
                      />
                      {fmtRelative(it.received_at)}
                      <Badge variant="secondary" className="text-[9px] py-0 px-1 h-4">
                        {it.source === "kakao_imweb" ? "아임웹" : it.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!it.is_read && (
                        <button
                          onClick={() => markRead(it.id)}
                          className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                          title="읽음 표시"
                        >
                          <Check className="h-3 w-3" />
                          읽음
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDeleteId(it.id)}
                        className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors"
                        title="처리 완료 (삭제)"
                      >
                        <Trash2 className="h-3 w-3" />
                        처리완료
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-1">
                    {it.parsed_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{it.parsed_email}</span>
                      </span>
                    )}
                    {it.parsed_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{it.parsed_phone}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] mb-1">
                    {it.parsed_field && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">{it.parsed_field}</span>
                    )}
                    {it.parsed_budget && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{it.parsed_budget}</span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{preview}</p>
                </li>
              )
            })}
          </ul>
        )}

        <DropdownMenuSeparator className="my-0" />
        <div className="px-4 py-2 text-[10px] text-muted-foreground bg-muted/30">
          상세 내용은 아임웹 전문가 관리 페이지에서 확인해주세요.{" "}
          <a
            href="https://imweb.me/expert"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            바로가기 <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </DropdownMenuContent>

      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 문의를 처리 완료(삭제)하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              알림에서 영구적으로 제거됩니다. 복구할 수 없습니다.
              {confirmingItem?.parsed_email && (
                <span className="block mt-2 px-2 py-1 rounded bg-muted text-xs font-mono text-foreground">
                  {confirmingItem.parsed_email}
                  {confirmingItem.parsed_phone ? ` · ${confirmingItem.parsed_phone}` : ""}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteItem(confirmDeleteId)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              처리 완료
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  )
}

export default InquiryInboxBell
