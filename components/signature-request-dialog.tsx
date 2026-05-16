"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react"

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

  const reset = () => {
    setError(null)
    setSuccess(null)
    setSending(false)
  }

  const handleClose = (next: boolean) => {
    if (sending) return
    if (!next) {
      // 닫을 때 초기화 (다시 열 때 새 입력)
      setMessage("")
      reset()
    }
    onOpenChange(next)
  }

  const handleSend = async () => {
    setError(null)
    if (!email.trim()) {
      setError("받는 사람 이메일을 입력해주세요.")
      return
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
