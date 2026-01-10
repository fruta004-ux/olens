// 브라우저 로컬스토리지 기반 사용자 설정 관리

export interface UserSettings {
  // 도움말/알림 설정
  showHelpTooltips: boolean
  lastSeenPatchVersion: string | null
}

const SETTINGS_KEY = "oort-crm-user-settings"

const DEFAULT_SETTINGS: UserSettings = {
  showHelpTooltips: true,
  lastSeenPatchVersion: null,
}

// 설정 불러오기
export function getUserSettings(): UserSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS
  }
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error("설정 로드 오류:", error)
  }
  
  return DEFAULT_SETTINGS
}

// 설정 저장하기
export function saveUserSettings(settings: Partial<UserSettings>): void {
  if (typeof window === "undefined") return
  
  try {
    const current = getUserSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("설정 저장 오류:", error)
  }
}

// 마지막으로 본 패치노트 버전 업데이트
export function markPatchNoteSeen(version: string): void {
  saveUserSettings({ lastSeenPatchVersion: version })
}

// 새로운 패치노트가 있는지 확인
export function hasNewPatchNote(currentVersion: string): boolean {
  const settings = getUserSettings()
  
  // 도움말이 꺼져있으면 false
  if (!settings.showHelpTooltips) {
    return false
  }
  
  // 처음 방문이거나 버전이 다르면 true
  if (!settings.lastSeenPatchVersion) {
    return true
  }
  
  return settings.lastSeenPatchVersion !== currentVersion
}

// 도움말 토글
export function toggleHelpTooltips(show: boolean): void {
  saveUserSettings({ showHelpTooltips: show })
}

