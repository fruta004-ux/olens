"use client"

import { useState } from "react"
import JSZip from "jszip"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Download, Database, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

// 백업 대상 테이블 목록
const TABLES = [
  "accounts",
  "contacts",
  "deals",
  "activities",
  "clients",
  "client_activities",
  "client_contracts",
  "contracts",
  "contract_templates",
  "company_seals",
  "project_specs",
  "recurring_projects",
  "quotations",
  "quotation_presets",
  "tasks",
  "memos",
  "notes",
  "settings",
  "patch_notes",
  "patch_note_changes",
  "pipeline_snapshots",
  "bug_reports",
  "feature_requests",
  "stage_feedbacks",
]

// 백업 대상 Storage 버킷
const STORAGE_BUCKETS = ["business-registrations", "company-seals", "attachments"]

const PAGE_SIZE = 1000

type LogLine = { type: "info" | "success" | "warn" | "error"; text: string }

export default function BackupPanel() {
  const supabase = createBrowserClient()
  const [includeTables, setIncludeTables] = useState(true)
  const [includeStorage, setIncludeStorage] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [logs, setLogs] = useState<LogLine[]>([])

  const log = (type: LogLine["type"], text: string) => {
    setLogs((prev) => [...prev, { type, text }])
  }

  const fetchAllRows = async (table: string) => {
    const all: any[] = []
    let page = 0
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < PAGE_SIZE) break
      page++
    }
    return all
  }

  const listAllStorageFiles = async (
    bucket: string,
    prefix = "",
  ): Promise<{ path: string; size: number | null }[]> => {
    const acc: { path: string; size: number | null }[] = []
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 10000, sortBy: { column: "name", order: "asc" } })
    if (error) throw error
    if (!data) return []
    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name
      // 폴더는 id가 null인 경향이 있음 → 재귀 진입
      if (item.id === null && (item.metadata == null || (item as any).metadata?.size == null)) {
        const sub = await listAllStorageFiles(bucket, itemPath)
        acc.push(...sub)
      } else {
        acc.push({ path: itemPath, size: (item as any).metadata?.size ?? null })
      }
    }
    return acc
  }

  const handleBackup = async () => {
    if (!includeTables && !includeStorage) {
      alert("백업 항목을 1개 이상 선택해주세요.")
      return
    }
    setIsRunning(true)
    setLogs([])
    setProgress(0)
    setProgressLabel("백업 준비 중...")

    const zip = new JSZip()
    const startedAt = new Date()
    const summary: any = {
      version: "1.0",
      generated_at: startedAt.toISOString(),
      generated_at_kst: new Date(startedAt.getTime() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00"),
      app: "oort-sale-crm",
      tables: {} as Record<string, { count: number; ok: boolean; error?: string }>,
      storage: {} as Record<string, { count: number; bytes: number; ok: boolean; error?: string }>,
    }

    try {
      // ─── 테이블 백업 ───
      if (includeTables) {
        log("info", `테이블 ${TABLES.length}개 백업 시작`)
        const tablesFolder = zip.folder("tables")!
        for (let i = 0; i < TABLES.length; i++) {
          const table = TABLES[i]
          setProgressLabel(`(${i + 1}/${TABLES.length}) 테이블: ${table}`)
          try {
            const rows = await fetchAllRows(table)
            tablesFolder.file(`${table}.json`, JSON.stringify(rows, null, 2))
            summary.tables[table] = { count: rows.length, ok: true }
            log("success", `✓ ${table} (${rows.length}행)`)
          } catch (err: any) {
            summary.tables[table] = { count: 0, ok: false, error: err?.message || String(err) }
            log("warn", `⚠ ${table} 실패: ${err?.message || err} (스킵하고 진행)`)
          }
          const portion = includeStorage ? 0.5 : 1
          setProgress(((i + 1) / TABLES.length) * portion * 100)
        }
      }

      // ─── Storage 백업 ───
      if (includeStorage) {
        log("info", `Storage 버킷 ${STORAGE_BUCKETS.length}개 백업 시작`)
        const storageFolder = zip.folder("storage")!

        for (let bi = 0; bi < STORAGE_BUCKETS.length; bi++) {
          const bucket = STORAGE_BUCKETS[bi]
          setProgressLabel(`(${bi + 1}/${STORAGE_BUCKETS.length}) 버킷 목록: ${bucket}`)
          let files: { path: string; size: number | null }[] = []
          try {
            files = await listAllStorageFiles(bucket)
          } catch (err: any) {
            summary.storage[bucket] = { count: 0, bytes: 0, ok: false, error: err?.message || String(err) }
            log("warn", `⚠ ${bucket} 목록 조회 실패: ${err?.message || err}`)
            continue
          }
          if (files.length === 0) {
            summary.storage[bucket] = { count: 0, bytes: 0, ok: true }
            log("info", `(빈 버킷) ${bucket}`)
            continue
          }
          const bucketFolder = storageFolder.folder(bucket)!
          let bucketBytes = 0
          let okCount = 0
          for (let fi = 0; fi < files.length; fi++) {
            const f = files[fi]
            setProgressLabel(`Storage [${bucket}] ${fi + 1}/${files.length}: ${f.path}`)
            try {
              const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(f.path)
              if (dlErr || !blob) throw dlErr || new Error("blob 없음")
              const arrayBuf = await blob.arrayBuffer()
              bucketFolder.file(f.path, arrayBuf)
              bucketBytes += arrayBuf.byteLength
              okCount++
            } catch (err: any) {
              log("warn", `⚠ ${bucket}/${f.path} 다운로드 실패: ${err?.message || err}`)
            }
            const tablesPortion = includeTables ? 0.5 : 0
            const totalBuckets = STORAGE_BUCKETS.length
            const bucketProgress = (bi + (fi + 1) / files.length) / totalBuckets
            setProgress((tablesPortion + (1 - tablesPortion) * bucketProgress) * 100)
          }
          summary.storage[bucket] = { count: okCount, bytes: bucketBytes, ok: true }
          log(
            "success",
            `✓ ${bucket}: ${okCount}/${files.length}개 (${formatBytes(bucketBytes)})`,
          )
        }
      }

      // ─── 메타 파일 ───
      zip.file("metadata.json", JSON.stringify(summary, null, 2))
      zip.file(
        "README.txt",
        [
          "Oort Sale CRM 백업",
          `생성 시각: ${startedAt.toLocaleString("ko-KR")}`,
          "",
          "구조:",
          "  tables/<table>.json   각 테이블 전체 데이터 (JSON 배열)",
          "  storage/<bucket>/...  Supabase Storage 원본 파일",
          "  metadata.json         백업 요약 (행수/파일수/오류)",
          "",
          "복원: scripts/restore-backup.mjs (또는 metadata.json을 참고하여 supabase 클라이언트로 insert)",
        ].join("\n"),
      )

      setProgressLabel("ZIP 생성 중...")
      setProgress(99)
      const blob = await zip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        },
        (meta) => {
          // 압축 진행률을 UI에 가볍게 반영
          if (meta && typeof meta.percent === "number") {
            setProgressLabel(`ZIP 생성 중... ${meta.percent.toFixed(0)}%`)
          }
        },
      )

      const ts = formatTimestamp(startedAt)
      const filename = `oort_crm_backup_${ts}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress(100)
      setProgressLabel(`완료: ${filename} (${formatBytes(blob.size)})`)
      log("success", `🎉 백업 완료: ${filename} (${formatBytes(blob.size)})`)
    } catch (err: any) {
      log("error", `백업 실패: ${err?.message || err}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-2">
        <Download className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">전체 데이터 백업</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        시스템의 모든 테이블과 Storage 파일을 1개의 ZIP으로 다운로드합니다. 이 파일을 외장 디스크/클라우드에 보관하시면
        Supabase 외부에 물리적 백업이 마련됩니다.
      </p>

      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
          <Checkbox
            checked={includeTables}
            onCheckedChange={(v) => setIncludeTables(!!v)}
            disabled={isRunning}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Database className="h-4 w-4" /> 테이블 데이터 ({TABLES.length}개)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              accounts / deals / activities / clients / contracts / project_specs / quotations / settings / patch_notes 등 전체
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
          <Checkbox
            checked={includeStorage}
            onCheckedChange={(v) => setIncludeStorage(!!v)}
            disabled={isRunning}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-sm">
              <ImageIcon className="h-4 w-4" /> Storage 파일 ({STORAGE_BUCKETS.length}개 버킷)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {STORAGE_BUCKETS.join(", ")} (사업자등록증·직인·첨부파일 등)
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Button onClick={handleBackup} disabled={isRunning} size="lg" className="min-w-[200px]">
          <Download className="h-4 w-4 mr-2" />
          {isRunning ? "백업 진행 중..." : "백업 다운로드"}
        </Button>
        {isRunning && (
          <span className="text-xs text-muted-foreground truncate max-w-[400px]">{progressLabel}</span>
        )}
      </div>

      {(isRunning || progress > 0) && (
        <div className="mb-4">
          <Progress value={progress} />
          <div className="text-right text-xs text-muted-foreground mt-1">{progress.toFixed(0)}%</div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="border rounded-lg bg-muted/30 p-3 max-h-64 overflow-y-auto text-xs font-mono space-y-0.5">
          {logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              {l.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />}
              {l.type === "warn" && <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />}
              {l.type === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />}
              {l.type === "info" && <span className="w-3.5 shrink-0" />}
              <span
                className={
                  l.type === "error"
                    ? "text-red-600"
                    : l.type === "warn"
                      ? "text-amber-700"
                      : l.type === "success"
                        ? "text-green-700"
                        : "text-muted-foreground"
                }
              >
                {l.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-medium">참고사항</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Storage 파일이 많은 경우(수백 MB 이상) 시간이 오래 걸리고 브라우저 메모리를 사용합니다.</li>
          <li>RLS/권한 문제로 일부 테이블/파일은 접근이 제한될 수 있습니다 (해당 항목은 스킵하고 metadata.json에 기록).</li>
          <li>이 백업은 <strong>이미지 + JSON</strong> 형태이며, 복원은 별도 스크립트(또는 SQL INSERT)로 수행해야 합니다.</li>
          <li>주기적인 자동 백업을 원하시면 Supabase Dashboard의 자동 백업 또는 pg_dump 스케줄러를 병행 권장.</li>
        </ul>
      </div>
    </Card>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}`
}
