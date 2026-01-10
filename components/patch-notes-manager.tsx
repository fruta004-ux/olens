"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { CHANGE_TYPE_CONFIG, type PatchNote, type PatchNoteChange } from "@/lib/patch-notes"

interface NewChange {
  type: 'feature' | 'improvement' | 'fix' | 'change'
  description: string
  link: string
}

export function PatchNotesManager() {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // 새 패치노트 다이얼로그
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newVersion, setNewVersion] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newChanges, setNewChanges] = useState<NewChange[]>([
    { type: "feature", description: "", link: "" }
  ])

  // 수정 다이얼로그
  const [editingNote, setEditingNote] = useState<PatchNote | null>(null)
  const [editVersion, setEditVersion] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editChanges, setEditChanges] = useState<(PatchNoteChange & { isNew?: boolean; isDeleted?: boolean })[]>([])

  const supabase = createBrowserClient()

  const loadPatchNotes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("patch_notes")
      .select(`
        id,
        version,
        date,
        title,
        patch_note_changes (
          id,
          type,
          description,
          link,
          sort_order
        )
      `)
      .order("date", { ascending: false })

    if (!error && data) {
      const formatted = data.map((note: any) => ({
        id: note.id,
        version: note.version,
        date: note.date,
        title: note.title,
        changes: (note.patch_note_changes || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order),
      }))
      setPatchNotes(formatted)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPatchNotes()
  }, [])

  // 새 패치노트 저장
  const handleSaveNew = async () => {
    if (!newVersion || !newTitle || newChanges.every(c => !c.description)) return
    
    setSaving(true)
    
    // 패치노트 생성
    const { data: noteData, error: noteError } = await supabase
      .from("patch_notes")
      .insert({ version: newVersion, title: newTitle })
      .select()
      .single()

    if (noteError || !noteData) {
      console.error("패치노트 생성 오류:", noteError)
      setSaving(false)
      return
    }

    // 변경 사항 생성
    const validChanges = newChanges.filter(c => c.description.trim())
    if (validChanges.length > 0) {
      const { error: changesError } = await supabase
        .from("patch_note_changes")
        .insert(
          validChanges.map((c, i) => ({
            patch_note_id: noteData.id,
            type: c.type,
            description: c.description,
            link: c.link || null,
            sort_order: i + 1,
          }))
        )

      if (changesError) {
        console.error("변경 사항 생성 오류:", changesError)
      }
    }

    setSaving(false)
    setIsNewDialogOpen(false)
    setNewVersion("")
    setNewTitle("")
    setNewChanges([{ type: "feature", description: "", link: "" }])
    loadPatchNotes()
  }

  // 패치노트 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 패치노트를 삭제하시겠습니까?")) return
    
    await supabase.from("patch_notes").delete().eq("id", id)
    loadPatchNotes()
  }

  // 수정 다이얼로그 열기
  const openEditDialog = (note: PatchNote) => {
    setEditingNote(note)
    setEditVersion(note.version)
    setEditTitle(note.title)
    setEditChanges(note.changes.map(c => ({ ...c })))
  }

  // 수정 저장
  const handleSaveEdit = async () => {
    if (!editingNote || !editVersion || !editTitle) return
    
    setSaving(true)

    // 패치노트 업데이트
    await supabase
      .from("patch_notes")
      .update({ version: editVersion, title: editTitle })
      .eq("id", editingNote.id)

    // 삭제된 변경 사항 제거
    const deletedChanges = editChanges.filter(c => c.isDeleted && c.id && !c.isNew)
    for (const change of deletedChanges) {
      await supabase.from("patch_note_changes").delete().eq("id", change.id)
    }

    // 기존 변경 사항 업데이트
    const existingChanges = editChanges.filter(c => !c.isDeleted && !c.isNew && c.id)
    for (let i = 0; i < existingChanges.length; i++) {
      const change = existingChanges[i]
      await supabase
        .from("patch_note_changes")
        .update({
          type: change.type,
          description: change.description,
          link: change.link || null,
          sort_order: i + 1,
        })
        .eq("id", change.id)
    }

    // 새 변경 사항 추가
    const newChangesFiltered = editChanges.filter(c => c.isNew && !c.isDeleted && c.description.trim())
    if (newChangesFiltered.length > 0) {
      await supabase.from("patch_note_changes").insert(
        newChangesFiltered.map((c, i) => ({
          patch_note_id: editingNote.id,
          type: c.type,
          description: c.description,
          link: c.link || null,
          sort_order: existingChanges.length + i + 1,
        }))
      )
    }

    setSaving(false)
    setEditingNote(null)
    loadPatchNotes()
  }

  // 새 변경 사항 추가
  const addNewChange = () => {
    setNewChanges([...newChanges, { type: "feature", description: "", link: "" }])
  }

  // 수정 중 변경 사항 추가
  const addEditChange = () => {
    setEditChanges([
      ...editChanges,
      { id: `new-${Date.now()}`, type: "feature", description: "", link: null, sort_order: editChanges.length + 1, isNew: true }
    ])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">패치노트 관리</h3>
        <Button size="sm" onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          새 패치노트
        </Button>
      </div>

      {/* 패치노트 목록 */}
      <div className="space-y-3">
        {patchNotes.map((note, index) => (
          <Card key={note.id} className={cn(index === 0 && "border-primary")}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : "outline"} className="font-mono">
                    v{note.version}
                  </Badge>
                  <span className="font-medium">{note.title}</span>
                  <span className="text-sm text-muted-foreground">({note.date})</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(note)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(note.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="text-sm text-muted-foreground">
                {note.changes.length}개의 변경 사항
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 새 패치노트 다이얼로그 */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 패치노트 작성</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>버전</Label>
                <Input
                  placeholder="예: 1.3.0"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                />
              </div>
              <div>
                <Label>제목</Label>
                <Input
                  placeholder="예: 새 기능 업데이트"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>변경 사항</Label>
              <div className="space-y-2 mt-2">
                {newChanges.map((change, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Select
                      value={change.type}
                      onValueChange={(v) => {
                        const updated = [...newChanges]
                        updated[i].type = v as any
                        setNewChanges(updated)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANGE_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="변경 내용"
                      value={change.description}
                      onChange={(e) => {
                        const updated = [...newChanges]
                        updated[i].description = e.target.value
                        setNewChanges(updated)
                      }}
                      className="flex-1 min-h-[60px]"
                    />
                    <Input
                      placeholder="링크 (선택)"
                      value={change.link}
                      onChange={(e) => {
                        const updated = [...newChanges]
                        updated[i].link = e.target.value
                        setNewChanges(updated)
                      }}
                      className="w-32"
                    />
                    {newChanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewChanges(newChanges.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addNewChange}>
                  <Plus className="h-4 w-4 mr-1" />
                  변경 사항 추가
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveNew} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>패치노트 수정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>버전</Label>
                <Input
                  value={editVersion}
                  onChange={(e) => setEditVersion(e.target.value)}
                />
              </div>
              <div>
                <Label>제목</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>변경 사항</Label>
              <div className="space-y-2 mt-2">
                {editChanges.filter(c => !c.isDeleted).map((change, i) => (
                  <div key={change.id} className="flex gap-2 items-start">
                    <Select
                      value={change.type}
                      onValueChange={(v) => {
                        const updated = editChanges.map(c => 
                          c.id === change.id ? { ...c, type: v as any } : c
                        )
                        setEditChanges(updated)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANGE_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={change.description}
                      onChange={(e) => {
                        const updated = editChanges.map(c => 
                          c.id === change.id ? { ...c, description: e.target.value } : c
                        )
                        setEditChanges(updated)
                      }}
                      className="flex-1 min-h-[60px]"
                    />
                    <Input
                      placeholder="링크"
                      value={change.link || ""}
                      onChange={(e) => {
                        const updated = editChanges.map(c => 
                          c.id === change.id ? { ...c, link: e.target.value } : c
                        )
                        setEditChanges(updated)
                      }}
                      className="w-32"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = editChanges.map(c => 
                          c.id === change.id ? { ...c, isDeleted: true } : c
                        )
                        setEditChanges(updated)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addEditChange}>
                  <Plus className="h-4 w-4 mr-1" />
                  변경 사항 추가
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>취소</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

