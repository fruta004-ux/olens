import { Resend } from "resend"

/**
 * Resend 클라이언트 (지연 초기화).
 * RESEND_API_KEY 가 없으면 throw — 서버 라우트에서 분기 처리.
 */
let _resend: Resend | null = null
function getResend(): Resend {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error(
      "RESEND_API_KEY 환경변수가 설정되어 있지 않습니다. " +
        "https://resend.com 에서 API 키를 발급받아 .env.local 과 Vercel 환경변수에 추가해주세요."
    )
  }
  _resend = new Resend(key)
  return _resend
}

export interface SendMailOptions {
  to: string
  toName?: string
  /** 참조 (CC) — 여러명 가능. 빈 배열이거나 undefined 면 미사용. */
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  text?: string
  /** 답장 받을 주소 — 영업 담당자 메일 같은 거 */
  replyTo?: string
}

export interface SendMailResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * EMAIL_FROM 환경변수를 정제 — Vercel 같은 환경에서 따옴표가 값에 포함되는 경우가 흔함.
 * "오렌즈 계약서 <addr>" 형태로 들어와도 자동으로 양끝 따옴표 제거.
 */
function getNormalizedFrom(): string {
  const raw = (process.env.EMAIL_FROM || "오렌즈 계약서 <onboarding@resend.dev>").trim()
  // 양끝 따옴표 (작은/큰) 자동 제거
  const unquoted = raw.replace(/^["']+|["']+$/g, "").trim()
  return unquoted
}

/**
 * 트랜잭셔널 메일 발송. 실패해도 throw 하지 않고 SendMailResult 로 반환.
 * 호출 측에서 ok 확인 후 사용자에게 표시.
 */
export async function sendMail(opts: SendMailOptions): Promise<SendMailResult> {
  const from = getNormalizedFrom()

  try {
    const resend = getResend()
    const result = await resend.emails.send({
      from,
      to: [opts.to],
      cc: opts.cc && opts.cc.length > 0 ? opts.cc : undefined,
      bcc: opts.bcc && opts.bcc.length > 0 ? opts.bcc : undefined,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    })

    if (result.error) {
      console.error("[email] Resend 응답 오류:", result.error)
      return { ok: false, error: result.error.message || "발송 실패" }
    }

    return { ok: true, id: result.data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    console.error("[email] 발송 예외:", message)
    return { ok: false, error: message }
  }
}

/**
 * 서명 요청 메일 템플릿 (HTML + 텍스트).
 * 한국어 메일 클라이언트 호환성을 위해 인라인 스타일 사용.
 */
export function buildSignatureRequestEmail(params: {
  recipientName?: string | null
  signUrl: string
  contractTitle: string
  contractCategory: string
  message?: string | null
  expiresAt: Date
  sellerCompany: string
}): { subject: string; html: string; text: string } {
  const greeting = params.recipientName
    ? `${escapeHtml(params.recipientName)}님,`
    : "안녕하세요,"

  const expiresStr = formatKoreanDate(params.expiresAt)
  const customMessage = (params.message || "").trim()

  const subject = `[${params.sellerCompany}] 계약서 서명 요청 - ${params.contractTitle}`

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <p style="margin:0 0 12px 0;color:#6b7280;font-size:14px;letter-spacing:0.04em;">${escapeHtml(params.sellerCompany)}</p>
              <h1 style="margin:0;font-size:20px;color:#111;font-weight:700;">계약서 서명 요청</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 16px 32px;color:#374151;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 12px 0;">${greeting}</p>
              <p style="margin:0 0 8px 0;">
                ${escapeHtml(params.sellerCompany)} 에서 보낸 <strong>${escapeHtml(params.contractTitle)}</strong> 입니다.
              </p>
              <p style="margin:0;">아래 버튼을 클릭하셔서 계약서 내용을 확인하시고 서명을 진행해주세요.</p>
            </td>
          </tr>
          ${customMessage ? `
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <div style="background:#f9fafb;border-left:4px solid #6366f1;padding:12px 16px;border-radius:4px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(customMessage)}</div>
            </td>
          </tr>` : ""}
          <tr>
            <td align="center" style="padding:24px 32px 24px 32px;">
              <a href="${escapeAttr(params.signUrl)}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">서명하러 가기 →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px 0;">⚠️ 이 링크는 <strong>${expiresStr}</strong> 까지 유효합니다.</p>
              <p style="margin:0;">본인이 요청하신 메일이 아니라면 이 메일을 무시해주세요.</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;color:#9ca3af;font-size:11px;">— ${escapeHtml(params.sellerCompany)} —</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${params.recipientName ? params.recipientName + "님," : "안녕하세요,"}

${params.sellerCompany} 에서 보낸 ${params.contractTitle} 입니다.
아래 링크에서 계약서 내용을 확인하시고 서명을 진행해주세요.

${customMessage ? customMessage + "\n\n" : ""}서명하러 가기 → ${params.signUrl}

⚠️ 이 링크는 ${expiresStr} 까지 유효합니다.
본인이 요청하신 메일이 아니라면 이 메일을 무시해주세요.

— ${params.sellerCompany} —`

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}

function formatKoreanDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}
