// 패치노트 데이터 - DB 기반

export interface PatchNoteChange {
  id: string
  type: 'feature' | 'improvement' | 'fix' | 'change'
  description: string
  link?: string | null
  sort_order: number
}

export interface PatchNote {
  id: string
  version: string
  date: string
  title: string
  changes: PatchNoteChange[]
}

// 변경 유형별 라벨 및 색상
export const CHANGE_TYPE_CONFIG = {
  feature: { label: "새 기능", color: "bg-green-100 text-green-800" },
  improvement: { label: "개선", color: "bg-blue-100 text-blue-800" },
  fix: { label: "버그 수정", color: "bg-red-100 text-red-800" },
  change: { label: "변경", color: "bg-yellow-100 text-yellow-800" },
} as const

// 하드코딩 데이터 제거 - DB에서 로드
