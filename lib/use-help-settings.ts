"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEYS = {
  HELP_ENABLED: "oort-crm-help-enabled",
  LAST_SEEN_VERSION: "oort-crm-last-seen-version",
}

export interface HelpSettings {
  helpEnabled: boolean
  lastSeenVersion: string | null
  setHelpEnabled: (enabled: boolean) => void
  markPatchNotesAsSeen: (version: string) => void
  checkHasNewPatchNotes: (currentVersion: string) => boolean
}

export function useHelpSettings(): HelpSettings {
  const [helpEnabled, setHelpEnabledState] = useState(true)
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // 초기 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedHelpEnabled = localStorage.getItem(STORAGE_KEYS.HELP_ENABLED)
      const storedLastSeenVersion = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION)
      
      setHelpEnabledState(storedHelpEnabled !== "false") // 기본값 true
      setLastSeenVersion(storedLastSeenVersion)
      setIsLoaded(true)
    }
  }, [])

  // 도움말 설정 변경
  const setHelpEnabled = useCallback((enabled: boolean) => {
    setHelpEnabledState(enabled)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.HELP_ENABLED, String(enabled))
    }
  }, [])

  // 패치노트 확인 표시
  const markPatchNotesAsSeen = useCallback((version: string) => {
    setLastSeenVersion(version)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, version)
    }
  }, [])

  // 새 패치노트가 있는지 확인
  const checkHasNewPatchNotes = useCallback((currentVersion: string) => {
    return isLoaded && helpEnabled && lastSeenVersion !== currentVersion
  }, [isLoaded, helpEnabled, lastSeenVersion])

  return {
    helpEnabled,
    lastSeenVersion,
    setHelpEnabled,
    markPatchNotesAsSeen,
    checkHasNewPatchNotes,
  }
}
