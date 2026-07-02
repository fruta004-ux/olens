// 월별 업무 완수 체크 시스템 - 타입 / 상태 메타 / 자동 상태 산출 / 월 유틸

export type ItemStatus = "대기" | "진행중" | "완료" | "이월"
export const ITEM_STATUSES: ItemStatus[] = ["대기", "진행중", "완료", "이월"]

export type ProjectStatus =
  | "정상 진행"
  | "일부 이월 진행"
  | "50% 이상 지연"
  | "일부 지연"
  | "사이클 붕괴"
  | "대기"

export const PROJECT_STATUSES: ProjectStatus[] = [
  "정상 진행",
  "일부 이월 진행",
  "50% 이상 지연",
  "일부 지연",
  "사이클 붕괴",
  "대기",
]

// 상태 칩 색상 (Tailwind). 제안서(PDF) 색과 동일 계열.
export const PROJECT_STATUS_META: Record<ProjectStatus, { dot: string; chip: string; label?: string }> = {
  "정상 진행": { dot: "bg-green-500", chip: "bg-green-100 text-green-700 border-green-200" },
  "일부 이월 진행": { dot: "bg-teal-500", chip: "bg-teal-100 text-teal-700 border-teal-200" },
  "50% 이상 지연": { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  "일부 지연": { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700 border-violet-200", label: "일부 지연(회차내)" },
  "사이클 붕괴": { dot: "bg-red-500", chip: "bg-red-100 text-red-700 border-red-200" },
  "대기": { dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600 border-gray-200" },
}

export const ITEM_STATUS_META: Record<ItemStatus, { chip: string }> = {
  "완료": { chip: "bg-green-100 text-green-700 border-green-200" },
  "진행중": { chip: "bg-amber-100 text-amber-700 border-amber-200" },
  "이월": { chip: "bg-teal-100 text-teal-700 border-teal-200" },
  "대기": { chip: "bg-gray-100 text-gray-600 border-gray-200" },
}

export interface DeliverableItem {
  id: string
  recurring_project_id: string
  month: string
  item_name: string
  target_qty: number | null
  done_qty: number
  status: ItemStatus
  carried_over: boolean
  reason: string | null
  link_url: string | null
  content: string | null
  sort_order: number
}

/**
 * 항목 진행도로 프로젝트 월 상태를 자동 산출한다.
 * (override 가 있으면 호출부에서 그 값을 우선 사용)
 */
export function deriveProjectStatus(items: DeliverableItem[]): ProjectStatus {
  const total = items.length
  if (total === 0) return "대기"

  const done = items.filter((i) => i.status === "완료").length
  const carried = items.filter((i) => i.carried_over || i.status === "이월").length
  const ratio = done / total

  if (done === total) return "정상 진행"
  if (ratio < 0.5) {
    // 절반 이상 미완료
    if (done === 0 && carried >= Math.ceil(total * 0.5)) return "사이클 붕괴"
    return "50% 이상 지연"
  }
  // 절반 이상 완료
  return carried > 0 ? "일부 이월 진행" : "정상 진행"
}

/**
 * 프로젝트 완수율(%) — 내부 항목들의 진행도를 합산/평균.
 * - 목표수량 있는 항목: min(완료/목표, 1)
 * - 목표수량 없는 항목: 완료=1 / 진행중=0.5 / 그 외=0
 */
export function projectPercent(items: DeliverableItem[]): number {
  if (items.length === 0) return 0
  let sum = 0
  for (const it of items) {
    if (it.target_qty && it.target_qty > 0) {
      sum += Math.min(it.done_qty / it.target_qty, 1)
    } else {
      sum += it.status === "완료" ? 1 : it.status === "진행중" ? 0.5 : 0
    }
  }
  return Math.round((sum / items.length) * 100)
}

/** items 진행 요약: "완료/전체" + 이월 수 */
export function summarizeItems(items: DeliverableItem[]) {
  const total = items.length
  const done = items.filter((i) => i.status === "완료").length
  const carried = items.filter((i) => i.carried_over || i.status === "이월").length
  return { total, done, carried }
}

// ── 월(yyyy-MM) 유틸 ──────────────────────────────────────────
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return `${y}년 ${m}월`
}
