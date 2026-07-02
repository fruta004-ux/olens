"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Save, UserPlus, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  type Member,
  type MemberRole,
  ROLE_LABEL,
  ROLE_OPTIONS,
  fetchAllMembers,
  memberDisplayName,
} from "@/lib/members"

export function MembersManager() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // 추가 다이얼로그
  const [addOpen, setAddOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addName, setAddName] = useState("")
  const [addRole, setAddRole] = useState<MemberRole>("sales")
  const [addPassword, setAddPassword] = useState("")
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await fetchAllMembers(supabase)
    setMembers(list)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const patchLocal = (id: string, patch: Partial<Member>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  const saveRow = async (m: Member) => {
    setSavingId(m.id)
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: m.id,
          name: m.name,
          role: m.role,
          active: m.active,
          display_order: m.display_order,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "저장 실패")
      toast.success("저장되었습니다.")
    } catch (err: any) {
      toast.error(err?.message || "저장 실패")
    } finally {
      setSavingId(null)
    }
  }

  const setActive = async (m: Member, active: boolean) => {
    setSavingId(m.id)
    try {
      const res = active
        ? await fetch("/api/admin/members", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: m.id, active: true }),
          })
        : await fetch(`/api/admin/members?id=${encodeURIComponent(m.id)}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "변경 실패")
      patchLocal(m.id, { active })
      toast.success(active ? "활성화했습니다." : "비활성화했습니다.")
    } catch (err: any) {
      toast.error(err?.message || "변경 실패")
    } finally {
      setSavingId(null)
    }
  }

  const addMember = async () => {
    if (!addEmail.trim() || !addPassword.trim()) {
      toast.error("이메일과 임시 비밀번호를 입력하세요.")
      return
    }
    setAdding(true)
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, name: addName, role: addRole, password: addPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "추가 실패")
      toast.success("멤버를 추가했습니다.")
      setAddOpen(false)
      setAddEmail("")
      setAddName("")
      setAddRole("sales")
      setAddPassword("")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "추가 실패")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">멤버(직원) 관리</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            모든 담당자 드롭다운(영업/PO/재무)이 이 목록을 사용합니다. 비활성 멤버는 드롭다운에서 숨겨집니다.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          멤버 추가
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">이름</TableHead>
              <TableHead className="w-[26%]">이메일</TableHead>
              <TableHead className="w-[16%]">역할</TableHead>
              <TableHead className="w-[10%] text-center">순서</TableHead>
              <TableHead className="w-[10%] text-center">상태</TableHead>
              <TableHead className="w-[18%] text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  멤버가 없습니다. [멤버 추가] 로 직원을 등록하세요.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id} className={cn(!m.active && "opacity-50")}>
                  <TableCell>
                    <Input
                      value={m.name || ""}
                      onChange={(e) => patchLocal(m.id, { name: e.target.value })}
                      placeholder={memberDisplayName(m)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Select value={m.role} onValueChange={(v) => patchLocal(m.id, { role: v as MemberRole })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={m.display_order}
                      onChange={(e) => patchLocal(m.id, { display_order: Number(e.target.value) || 0 })}
                      className="h-8 text-sm text-center w-16 mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {m.active ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        활성
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                        비활성
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1"
                        onClick={() => saveRow(m)}
                        disabled={savingId === m.id}
                      >
                        {savingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        저장
                      </Button>
                      {m.active ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-muted-foreground hover:text-red-600"
                          onClick={() => setActive(m, false)}
                          disabled={savingId === m.id}
                          title="비활성화"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-muted-foreground hover:text-green-600"
                          onClick={() => setActive(m, true)}
                          disabled={savingId === m.id}
                          title="활성화"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 멤버 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              멤버 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              로그인 계정이 함께 생성됩니다. 임시 비밀번호는 본인에게 전달 후 변경하도록 안내하세요.
            </p>
            <div>
              <label className="text-sm font-medium">이메일 *</label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="member@fruta.kr"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">이름</label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="홍길동" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">역할</label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as MemberRole)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">임시 비밀번호 *</label>
              <Input
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="6자 이상"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              취소
            </Button>
            <Button onClick={addMember} disabled={adding} className="gap-1.5">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MembersManager
