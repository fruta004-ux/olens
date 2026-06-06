"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, X, Check, AlertCircle, Stamp, PenTool } from "lucide-react"
import {
  buildContractFullHTML,
  measureContractHeights,
  paginateContract,
} from "@/components/contract-view-dialog"
import { formatContractDateKR } from "@/lib/contract-utils"
import type { Contract } from "@/lib/types/contract"
import type { PublicContractView } from "@/lib/types/signature"
import { SignatureCanvas, type SignatureCanvasHandle } from "@/components/signature-canvas"

interface SignRequestInfo {
  id: string
  recipient_name?: string | null
  recipient_email: string
  message?: string | null
  expires_at: string
}

export default function SignPage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<PublicContractView | null>(null)
  const [request, setRequest] = useState<SignRequestInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 두 가지 서명 방식
  const [signMode, setSignMode] = useState<"upload" | "draw">("upload")
  const [sealFile, setSealFile] = useState<File | null>(null)
  const [sealPreviewUrl, setSealPreviewUrl] = useState<string | null>(null)

  const canvasRef = useRef<SignatureCanvasHandle | null>(null)
  const [hasDrawing, setHasDrawing] = useState(false)

  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [previewHTML, setPreviewHTML] = useState<string>("")
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const iframeReadyRef = useRef(false)

  // 위 미리보기 iframe 의 갑 도장 자리에 동적으로 표시될 도장 (실시간)
  const [livePreviewSealDataUrl, setLivePreviewSealDataUrl] = useState<string | null>(null)

  // 토큰 로드
  useEffect(() => {
    if (!token) return
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`/api/sign/${token}`, { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          const reason = data?.reason
          if (reason === "expired" || reason === "cancelled") {
            router.replace("/sign/expired")
            return
          }
          if (reason === "signed") {
            router.replace("/sign/done")
            return
          }
          setLoadError(data?.error || `오류 (${res.status})`)
          return
        }

        setRequest(data.request)
        setContract(data.contract)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "로드 실패")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token, router])

  // 브라우저 탭 제목 — "{업체명} 전자계약" (외부 거래처용 화면이라 내부 브랜드명 노출 X)
  useEffect(() => {
    const companyName = contract?.client_info?.company_name?.trim()
    document.title = companyName ? `${companyName} 전자계약` : "전자계약"
    return () => {
      document.title = "오렌즈 - 오르트 영업 관리 시스템"
    }
  }, [contract])

  // 계약서 미리보기 HTML 빌드 (한 번만 — 이후 도장은 postMessage 로 갱신)
  useEffect(() => {
    if (!contract) {
      setPreviewHTML("")
      return
    }
    let cancelled = false

    const run = async () => {
      try {
        if (typeof document !== "undefined" && (document as any).fonts?.ready) {
          await (document as any).fonts.ready
        }
      } catch {}
      if (cancelled) return

      const contractForHtml: Contract = {
        contract_number: contract.contract_number,
        title: contract.title,
        category: contract.category,
        client_info: contract.client_info,
        contract_data: contract.contract_data,
        clauses: contract.clauses,
        bank_info: contract.bank_info,
        company_info: contract.company_info,
        seal_url: contract.seal_url,
        client_seal_url: contract.client_seal_url,
        status: "초안",
        contract_date: contract.contract_date,
      }

      const dateF = formatContractDateKR(contract.contract_date)
      const measured = measureContractHeights(contractForHtml, dateF)
      const pages = paginateContract(contractForHtml, measured)
      const html = buildContractFullHTML(contractForHtml, pages, { mode: "preview" })
      if (!cancelled) setPreviewHTML(html)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [contract])

  // iframe 안에서 ready 메시지 받으면 현재 도장 동기화
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string } | null
      if (d?.type === "contractPreviewReady") {
        iframeReadyRef.current = true
        // 이미 그려둔 도장이 있으면 즉시 전송
        sendSealToIframe(livePreviewSealDataUrl)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [livePreviewSealDataUrl])

  // 도장이 바뀔 때마다 iframe 에 실시간 전송
  useEffect(() => {
    if (!iframeReadyRef.current) return
    sendSealToIframe(livePreviewSealDataUrl)
  }, [livePreviewSealDataUrl])

  const sendSealToIframe = (dataUrl: string | null) => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      win.postMessage({ type: "updateClientSeal", dataUrl: dataUrl || "" }, "*")
    } catch (err) {
      console.warn("[sign] postMessage 실패:", err)
    }
  }

  // 도장 업로드 — 파일 선택 시 미리보기에도 즉시 반영
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("이미지는 3MB 이하여야 합니다.")
      return
    }
    setSealFile(file)
    const url = URL.createObjectURL(file)
    setSealPreviewUrl(url)
    setSubmitError(null)

    // 미리보기에도 즉시 반영 (base64 로 변환)
    fileToBase64(file).then((b64) => {
      setLivePreviewSealDataUrl(b64)
    })
  }

  const handleRemoveSeal = () => {
    setSealFile(null)
    if (sealPreviewUrl) URL.revokeObjectURL(sealPreviewUrl)
    setSealPreviewUrl(null)
    setLivePreviewSealDataUrl(null)
  }

  // 손글씨 모드: 캔버스 변경 시마다 dataURL 추출 → 미리보기 갱신
  const handleCanvasChange = (drawing: boolean) => {
    setHasDrawing(drawing)
    if (!drawing) {
      setLivePreviewSealDataUrl(null)
      return
    }
    const dataUrl = canvasRef.current?.toDataURL()
    if (dataUrl) setLivePreviewSealDataUrl(dataUrl)
  }

  // 탭 전환 시 미리보기도 그 모드의 데이터로 동기화
  const handleSignModeChange = (mode: "upload" | "draw") => {
    setSignMode(mode)
    if (mode === "upload") {
      if (sealFile) {
        fileToBase64(sealFile).then(setLivePreviewSealDataUrl)
      } else {
        setLivePreviewSealDataUrl(null)
      }
    } else {
      // draw 모드 — 캔버스에 있는 거 반영
      const dataUrl = canvasRef.current?.toDataURL()
      setLivePreviewSealDataUrl(dataUrl || null)
    }
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("파일 읽기 실패"))
      reader.readAsDataURL(file)
    })

  const handleSubmit = async () => {
    setSubmitError(null)

    let base64: string
    let mime: string

    if (signMode === "upload") {
      if (!sealFile) {
        setSubmitError("도장 이미지를 업로드해주세요.")
        return
      }
      try {
        base64 = await fileToBase64(sealFile)
        mime = sealFile.type || "image/png"
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "파일 읽기 실패")
        return
      }
    } else {
      const dataUrl = canvasRef.current?.toDataURL()
      if (!dataUrl) {
        setSubmitError("서명을 그려주세요.")
        return
      }
      base64 = dataUrl
      mime = "image/png"
    }

    if (!agreed) {
      setSubmitError("계약서 내용에 동의해주세요.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_image_base64: base64,
          signature_mime: mime,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data?.error || `서버 오류 (${res.status})`)
        return
      }
      router.replace("/sign/done")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출 실패")
    } finally {
      setSubmitting(false)
    }
  }

  const expiresStr = useMemo(() => {
    if (!request) return ""
    return new Date(request.expires_at).toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [request])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">계약서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900 mb-2">계약서를 불러올 수 없습니다</h1>
          <p className="text-sm text-gray-600">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!contract || !request) return null

  const canSubmit =
    !submitting &&
    agreed &&
    ((signMode === "upload" && !!sealFile) || (signMode === "draw" && hasDrawing))

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden bg-slate-100">
      {/* 좌측: 계약서 미리보기 (내부 스크롤) */}
      <main className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {previewHTML ? (
          <iframe
            ref={iframeRef}
            srcDoc={previewHTML}
            title="계약서"
            className="w-full h-full block"
            style={{ border: 0, background: "#f1f5f9" }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            미리보기 준비 중...
          </div>
        )}
      </main>

      {/* 우측: 서명 패널 (sticky, 자체 스크롤은 패널 안에서만) */}
      <aside className="w-full lg:w-[360px] lg:min-w-[360px] h-[40vh] lg:h-full bg-white border-t lg:border-t-0 lg:border-l flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold text-gray-900">서명</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {expiresStr} 까지 유효
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Tabs value={signMode} onValueChange={(v) => handleSignModeChange(v as "upload" | "draw")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-1.5 text-xs">
                <Stamp className="h-4 w-4" />
                도장
              </TabsTrigger>
              <TabsTrigger value="draw" className="gap-1.5 text-xs">
                <PenTool className="h-4 w-4" />
                손글씨
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-3">
              {sealPreviewUrl ? (
                <div className="space-y-2">
                  <div className="relative inline-block w-full p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <img
                      src={sealPreviewUrl}
                      alt="도장 미리보기"
                      className="block mx-auto w-32 h-32 object-contain bg-white border rounded"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveSeal}
                      disabled={submitting}
                      className="absolute top-1 right-1 h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center truncate">
                    {sealFile?.name}
                  </p>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition">
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-700 font-medium">도장 이미지 선택</p>
                    <p className="text-xs text-gray-500 mt-1">PNG/JPG, 3MB 이하</p>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={submitting}
                  />
                </label>
              )}
            </TabsContent>

            <TabsContent value="draw" className="mt-3">
              <SignatureCanvas
                ref={canvasRef}
                width={300}
                height={180}
                onChange={handleCanvasChange}
              />
            </TabsContent>
          </Tabs>

          {/* 동의 체크박스 */}
          <label className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              계약서의 내용을 충분히 확인하였으며, 위 서명에 동의합니다.
            </span>
          </label>

          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{submitError}</p>
            </div>
          )}
        </div>

        {/* 하단 고정 — 서명 완료 버튼 */}
        <div className="p-4 border-t bg-white">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="w-full gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                서명 처리 중...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                서명 완료
              </>
            )}
          </Button>
        </div>
      </aside>
    </div>
  )
}
