import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function parseAmountRange(amountRange: string | null): number {
  if (!amountRange) return 0
  const matches = amountRange.match(/[\d,]+/g)
  if (!matches || matches.length === 0) return 0
  const isManwon = amountRange.includes("만")
  const isEok = amountRange.includes("억")
  let multiplier = 1
  if (isManwon) multiplier = 10000
  if (isEok) multiplier = 100000000
  const numbers = matches.map((m) => parseInt(m.replace(/,/g, ""), 10))
  if (numbers.length >= 2) {
    return ((numbers[0] + numbers[1]) / 2) * multiplier
  }
  return numbers[0] * multiplier
}

function normalizeStage(stage: string): string {
  if (stage.startsWith("S0")) return "S0"
  if (stage.startsWith("S1")) return "S1"
  if (stage.startsWith("S2")) return "S2"
  if (stage.startsWith("S3")) return "S3"
  if (stage.startsWith("S4")) return "S4"
  if (stage.startsWith("S5")) return "S5"
  if (stage.startsWith("S6")) return "S6"
  if (stage.startsWith("S7")) return "S7"
  return stage
}

export async function POST() {
  try {
    const supabase = await createClient()

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const { data: existing } = await supabase
      .from("pipeline_snapshots")
      .select("id, total_amount")
      .eq("snapshot_date", todayStr)
      .limit(1)

    const hasAmounts = existing?.some((r: any) => r.total_amount && r.total_amount !== "0")
    if (existing && existing.length > 0 && hasAmounts) {
      return NextResponse.json({ status: "already_exists", date: todayStr })
    }

    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("stage, amount_range")
      .not("stage", "is", null)

    if (dealsError) {
      return NextResponse.json({ error: dealsError.message }, { status: 500 })
    }

    const stageCounts: Record<string, number> = {}
    const stageAmounts: Record<string, number> = {}
    ;(deals || []).forEach((deal: { stage: string; amount_range: string | null }) => {
      const stage = normalizeStage(deal.stage)
      if (stage) {
        stageCounts[stage] = (stageCounts[stage] || 0) + 1
        stageAmounts[stage] = (stageAmounts[stage] || 0) + parseAmountRange(deal.amount_range)
      }
    })

    const rows = Object.entries(stageCounts).map(([stage, count]) => ({
      snapshot_date: todayStr,
      stage,
      deal_count: count,
      total_amount: String(stageAmounts[stage] || 0),
    }))

    if (rows.length === 0) {
      return NextResponse.json({ status: "no_deals", date: todayStr })
    }

    const { error: insertError } = await supabase
      .from("pipeline_snapshots")
      .upsert(rows, { onConflict: "snapshot_date,stage" })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ status: "created", date: todayStr, stages: rows.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const { data: existing } = await supabase
      .from("pipeline_snapshots")
      .select("id")
      .eq("snapshot_date", todayStr)
      .limit(1)

    return NextResponse.json({
      hasToday: existing && existing.length > 0,
      date: todayStr,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
