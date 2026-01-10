"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { PatchNote, PatchNoteChange } from "@/lib/patch-notes"

export function usePatchNotes() {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [currentVersion, setCurrentVersion] = useState<string>("1.0.0")

  const loadPatchNotes = useCallback(async () => {
    const supabase = createBrowserClient()
    
    // 패치노트 목록 로드
    const { data: notes, error } = await supabase
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
      .order("version", { ascending: false })

    if (error) {
      console.error("패치노트 로드 오류:", error)
      setLoading(false)
      return
    }

    // 데이터 변환
    const formattedNotes: PatchNote[] = (notes || []).map((note: any) => ({
      id: note.id,
      version: note.version,
      date: note.date,
      title: note.title,
      changes: (note.patch_note_changes || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((change: any) => ({
          id: change.id,
          type: change.type,
          description: change.description,
          link: change.link,
          sort_order: change.sort_order,
        })),
    }))

    setPatchNotes(formattedNotes)
    
    // 최신 버전 설정
    if (formattedNotes.length > 0) {
      setCurrentVersion(formattedNotes[0].version)
    }
    
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPatchNotes()
  }, [loadPatchNotes])

  // 최근 2개만
  const recentNotes = patchNotes.slice(0, 2)

  return {
    patchNotes,
    recentNotes,
    currentVersion,
    loading,
    reload: loadPatchNotes,
  }
}

// 현재 버전만 빠르게 가져오기
export async function fetchCurrentVersion(): Promise<string> {
  const supabase = createBrowserClient()
  
  const { data, error } = await supabase
    .from("patch_notes")
    .select("version")
    .order("date", { ascending: false })
    .order("version", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return "1.0.0"
  }

  return data.version
}

