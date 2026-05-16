"use client"

import { useState, useRef, type KeyboardEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Send, CheckCircle2, AlertCircle, X } from "lucide-react"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SignatureRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractTitle: string
  /** 초기 이메일 (거래처 정보에서 자동 채우기) */
  defaultEmail?: string
  defaultName?: string
  onSent?: (info: { signUrl: string; expiresAt: string }) => void
}

interface SuccessInfo {
  signUrl: string
  expiresAt: string
  emailId?: string
  ccCount?: number
}

export function SignatureRequestDialog({
  open,
  onOpenChange,
  contractId,
  contractTitle,
  defaultEmail,
  defaultName,
  onSent,
}: SignatureRequestDialogProps) {
  const [email, setEmail] = useState(defaultEmail || "")
  const [name, setName] = useState(defaultName || "")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessInfo | null>(null)

  // 참조 (CC) 이메일 — chip 입력
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [ccInput, setCcInput] = useState("")
  const [ccError, setCcError] = useState<string | null>(null)
  const ccInputRef = useRef<HTMLInputElement | null>(null)

  const reset = () => {
    setError(null)
    setSuccess(null)
    setSending(false)
  }

  const handleClose = (next: boolean) => {
    if (sending) return
    if (!next) {
      setMessage("")
      setCcEmails([])
      setCcInput("")
      setCcError(null)
      reset()
    }
    onOpenChange(next)
  }

  /** ccInput 의 현재 텍스트를 chip 으로 commit (콤마/공백/Enter 시 호출됨). */
  const commitCcInput = (): boolean => {
    const raw = ccInput.trim().replace(/,$/g, "")
    if (!raw) return true
    if (!EMAIL_RE.test(raw)) {
      setCcError(`이메일 형식이 올바르지 않습니다: ${raw}`)
      return false
    }
    if (raw.toLowerCase() === email.trim().toLowerCase()) {
      setCcError("받는 사람과 동일한 이메일은 추가할 수 없습니다.")
      return false
    }
    if (ccEmails.includes(raw)) {
      setCcInput("")
      setCcError(null)
      return true
    }
    setCcEmails((prev) => [...prev, raw])
    setCcInput("")
    setCcError(null)
    return true
  }

  const handleCcKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      // Tab 은 폼 흐름 유지 (preventDefault X)
      if (e.key !== "Tab") e.preventDefault()
      commitCcInput()
    } else if (e.key === "Backspace" && !ccInput && ccEmails.length > 0) {
      setCcEmails((prev) => prev.slice(0, -1))
      setCcError(null)
    }
  }

  const handleCcPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text")
    if (!pasted.match(/[,\s]/)) return
    e.preventDefault()
    const parts = pasted.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
    setCcEmails((prev) => {
      const next = [...prev]
      for (const p of parts) {
        if (!EMAIL_RE.test(p)) continue
        if (p.toLowerCase() === email.trim().toLowerCase()) continue
        if (!next.includes(p)) next.push(p)
      }
      return next
    })
    setCcInput("")
  }

  const removeCc = (idx: number) => {
    setCcEmails((prev) => prev.filter((_, i) => i !== idx))
    setCcError(null)
  }

  const handleSend = async () => {
    setError(null)
    if (!email.trim()) {
      setError("받는 사람 이메일을 입력해주세요.")
      return
    }
    // 발송 직전에 ccInput 에 남은 텍스트도 chip 으로 commit
    if (ccInput.trim()) {
      const ok = commitCcInput()
      if (!ok) return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/send-for-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: email.trim(),
          recipient_name: name.trim() || undefined,
          message: message.trim() || undefined,
          cc_emails: ccEmails,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || `서버 오류 (${res.status})`)
        if (data?.hint) setError((data.error || "오류") + "\n\n" + data.hint)
        return
      }
      setSuccess({
        signUrl: data.sign_url,
        expiresAt: data.expires_at,
        emailId: data.email_id,
        ccCount: data.cc_count ?? 0,
      })
      onSent?.({ signUrl: data.sign_url, expiresAt: data.expires_at })
    } catch (err) {
      setError(err instanceof Error ? err.message : "발송 중 오류")
    } finally {
      setSending(false)
    }
  }

  const copyUrl = async () => {
    if (!success?.signUrl) return
    try {
      await navigator.clipboard.writeText(success.signUrl)
      alert("서명 링크가 클립보드에 복사되었습니다.")
    } catch {
      window.prompt("서명 링크 (Ctrl+C 로 복사):", success.signUrl)
    }
  }

  const formattedExpiry = success
    ? new Date(success.expiresAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            서명 요청 보내기
          </DialogTitle>
          <DialogDescription className="text-xs">
            {contractTitle} — 거래처 이메일로 서명 링크를 발송합니다.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-700">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">메일이 발송되었습니다.</p>
                <p className="text-xs mt-0.5">
                  거래처가 링크를 클릭하면 서명 페이지가 열립니다.
                  {success.ccCount && success.ccCount > 0
                    ? ` (참조 ${success.ccCount}명 포함)`
                    : ""}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">서명 링크</label>
              <div className="mt-1 p-2 bg-muted rounded border text-xs font-mono break-all">
                {success.signUrl}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>⚠️ 유효기간: <strong>{formattedExpiry}</strong> 까지</p>
              {success.emailId && (
                <p className="mt-0.5">Email ID: <code className="text-[10px]">{success.emailId}</code></p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={copyUrl} className="flex-1">
                링크 복사
              </Button>
              <Button onClick={() => handleClose(false)} className="flex-1">
                닫기
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                받는 사람 이메일 <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="mt-1"
                disabled={sending}
              />
            </div>

            <div>
              <label className="text-sm font-medium">받는 사람 이름 (선택)</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동 대표님"
                className="mt-1"
                disabled={sending}
              />
            </div>

            <div>
              <label className="text-sm font-medium">참조 (선택, 여러명 가능)</label>
              <div
                className={`mt-1 flex flex-wrap items-center gap-1.5 min-h-[42px] px-2 py-1.5 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-input ${
                  sending ? "opacity-60 pointer-events-none" : ""
                }`}
                onClick={() => ccInputRef.current?.focus()}
              >
                {ccEmails.map((cc, idx) => (
                  <span
                    key={cc + idx}
                    className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {cc}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCc(idx)
                      }}
                      disabled={sending}
                      className="hover:bg-indigo-200 rounded-full p-0.5"
                      aria-label={`${cc} 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={ccInputRef}
                  type="email"
                  value={ccInput}
                  onChange={(e) => {
                    setCcInput(e.target.value)
                    setCcError(null)
                  }}
                  onKeyDown={handleCcKeyDown}
                  onPaste={handleCcPaste}
                  onBlur={commitCcInput}
                  placeholder={
                    ccEmails.length === 0
                      ? "이메일 입력 후 Enter / , (콤마)"
                      : ""
                  }
                  className="flex-1 min-w-[180px] text-sm bg-transparent outline-none border-0 px-1 py-1"
                  disabled={sending}
                />
              </div>
              {ccError ? (
                <p className="text-xs text-red-600 mt-1">{ccError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Enter / 콤마 / 공백 으로 여러명 추가. 최대 10명.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">메시지 (선택)</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="안녕하세요. 협의된 계약서 보내드립니다. 확인 후 서명 부탁드립니다."
                className="mt-1 min-h-[100px] text-sm"
                disabled={sending}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {message.length} / 1000
              </p>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md p-2.5">
              ⓘ 발송된 링크는 <strong>7일 후 자동 만료</strong>됩니다. 만료된 링크는 재발송하시면 새 토큰으로 다시 보낼 수 있습니다.
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-xs whitespace-pre-wrap">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={sending}
                className="flex-1"
              >
                취소
              </Button>
              <Button onClick={handleSend} disabled={sending || !email.trim()} className="flex-1 gap-1">
                <Send className="h-4 w-4" />
                {sending ? "발송 중..." : "발송하기"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
