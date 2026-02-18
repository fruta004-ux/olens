import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
      .select("id")
      .eq("snapshot_date", todayStr)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ status: "already_exists", date: todayStr })
    }

    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("stage")
      .not("stage", "is", null)

    if (dealsError) {
      return NextResponse.json({ error: dealsError.message }, { status: 500 })
    }

    const stageCounts: Record<string, number> = {}
    ;(deals || []).forEach((deal: { stage: string }) => {
      const stage = normalizeStage(deal.stage)
      if (stage) {
        stageCounts[stage] = (stageCounts[stage] || 0) + 1
      }
    })

    const rows = Object.entries(stageCounts).map(([stage, count]) => ({
      snapshot_date: todayStr,
      stage,
      deal_count: count,
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
