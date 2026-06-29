import { NextRequest, NextResponse } from "next/server"
import { lookup as dnsLookup } from "node:dns/promises"
import net from "node:net"
import { requireAuthApi } from "@/lib/auth-guard"
import { rateLimit, maybeCleanup } from "@/lib/rate-limit"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const SYSTEM_PROMPT = `당신은 한국 사업자등록증을 정확히 OCR 인식하는 전문가입니다.
이미지(원본/스캔본/사진 촬영본/PDF 모두 포함)에 있는 한국 사업자등록증의 정보를 추출하여 반드시 JSON 형식으로만 응답하세요.

## 여러 장이 함께 주어지는 경우 (중요)
이미지나 PDF 페이지가 2장 이상 주어질 수 있습니다. 사업자등록증 한 장을 위/아래 또는 좌/우로 나눠 촬영하거나, 여러 페이지로 스캔한 경우입니다.
이때는 모두 같은 사업자등록증의 부분으로 간주하고, 전체를 종합하여 단 하나의 JSON 으로 합쳐서 답하세요. 같은 항목이 여러 장에 보이면 더 선명하게 읽히는 값을 채택하세요.

## 한국 사업자등록증 일반 양식 안내
한국 사업자등록증은 발급처와 무관하게 항상 동일한 양식과 라벨을 가집니다. 스캔본이라도 아래 라벨의 "오른쪽 / 아래" 에 적힌 값을 읽으면 됩니다.
- 등록번호: "등록번호" 또는 "사업자등록번호" 라벨 옆, 상단의 "000-00-00000" 형태 (10자리, "-" 포함하여 출력)
- 법인등록번호: "법인등록번호" 라벨 옆 13자리 (있을 경우만, "000000-0000000" 형태)
- 상호 / 법인명: "법인명(단체명)", "상호" 라벨 옆 회사 이름
- 대표자(성명): "대표자", "성명" 라벨 옆
- 개업연월일: "개업연월일", "개업일자" → YYYY-MM-DD
- 사업장 소재지(주소): "사업장 소재지" 라벨 옆
- 본점 소재지: "본점 소재지" 라벨 옆 (법인사업자만 별도 표기될 수 있음)
- 사업의 종류:
    - 업태: "업태" 라벨 (예: 도매 및 소매업, 정보통신업, 서비스업, 제조업)
    - 종목: "종목" 라벨 (예: 컴퓨터프로그래밍, 광고대행, 스테인레스 등)
- 발급일자: 사업자등록증 하단 발급일 "YYYY 년 MM 월 DD 일" → YYYY-MM-DD
- 과세 유형: "법인사업자", "일반과세자", "간이과세자", "면세사업자" 중 하나로 추정

## 스캔본 / 노이즈 처리 (중요)
스캔본·사진본에는 본문과 무관한 글씨·문양·도장이 함께 보일 수 있습니다. 아래 요소는 모두 무시하고 본문 인쇄 텍스트만 읽으세요.
- 배경 워터마크: "국세청", "NTS", 태극 문양, 빗금/물결 등 보안 배경 패턴
- 직인/도장: "○○세무서장", "포천세무서장" 등 발급기관 직인 이미지와 그 위에 겹친 빨간 도장 (발급일자 텍스트는 직인과 별개로 읽을 것)
- 워터마크로 비스듬히 겹쳐 찍힌 흐릿한 글자 (반투명 회색 문구)
- 스캔 시 생긴 검은 테두리, 접힘 자국, 그림자, 손가락/스캐너 가장자리
- 문서 제목 "사 업 자 등 록 증", "( 법인사업자 )" 등 헤더 텍스트 (tax_type 추정에만 참고하고 다른 필드 값으로 넣지 말 것)
글자가 흐리거나 일부 깨져도, 한국 사업자등록증의 고정 양식을 근거로 가장 합리적인 값을 읽되, 끝내 판독 불가한 항목만 빈 문자열로 두세요.

## 규칙
1. 위 "라벨 옆/아래의 값"만 해당 필드에 채우세요. 워터마크·직인·배경 문양에서 읽은 글자는 절대 필드 값으로 쓰지 마세요.
2. 날짜는 모두 YYYY-MM-DD 포맷으로 변환 (예: "2020년 03월 05일" → "2020-03-05", "2023 년 08 월 29 일" → "2023-08-29").
3. 사업자등록번호는 "000-00-00000" 하이픈 포함 형식으로 정규화. 공백으로 끊겨 보여도 숫자 10자리를 이어붙여 정규화.
4. company_name 은 라벨에 적힌 그대로 출력하세요. "주식회사", "(주)" 등이 실제로 인쇄되어 있으면 포함하고, 없으면 임의로 붙이지 마세요.
5. 응답은 반드시 아래 JSON 스키마 그대로, 다른 설명/주석 없이 JSON만 출력.

## 응답 JSON 스키마
{
  "company_name": "string",
  "business_number": "string",
  "corporate_number": "string",
  "representative": "string",
  "opening_date": "string (YYYY-MM-DD)",
  "address": "string",
  "head_office_address": "string",
  "business_type": "string",
  "business_item": "string",
  "issue_date": "string (YYYY-MM-DD)",
  "tax_type": "string",
  "raw_text": "이미지에서 읽은 전체 텍스트 (디버깅용)"
}
`

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_BASE64_BYTES = 14 * 1024 * 1024 // 약 10MB 의 base64 인코딩 크기
const FETCH_TIMEOUT_MS = 8000
const MAX_IMAGES = 4 // 반쪽/여러 페이지 업로드 대비 (한 번에 보낼 최대 장수)

// 허용 mime: 이미지 + PDF (Gemini 는 PDF inline_data 도 처리 가능)
const ALLOWED_MIME = /^(image\/(png|jpe?g|gif|webp|bmp|tiff)|application\/pdf)$/i

/**
 * 사용자가 제공한 URL 이 안전한지 검증한다.
 * - https 만 허용
 * - 호스트 화이트리스트 (Supabase Storage / Imweb 업로드 도메인)
 * - DNS resolve 후 private / loopback / link-local IP 차단 (SSRF 1차)
 *
 * AWS metadata (169.254.169.254) / 사내 네트워크 호출을 차단한다.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true // link-local + AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    return false
  }
  // IPv6
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase()
    if (lower === "::1") return true
    if (lower === "::") return true
    if (lower.startsWith("fe80:")) return true // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true // ULA
    if (lower.startsWith("::ffff:")) {
      // IPv4-mapped — 뒤의 IPv4 부분으로 다시 검사
      const v4 = lower.slice(7)
      if (net.isIPv4(v4)) return isPrivateIp(v4)
    }
    return false
  }
  return false
}

function getAllowedHosts(): Set<string> {
  const hosts = new Set<string>()
  // 환경변수로 추가 도메인 허용 (콤마 구분)
  for (const h of (process.env.OCR_ALLOWED_HOSTS || "").split(",")) {
    const t = h.trim().toLowerCase()
    if (t) hosts.add(t)
  }
  // Supabase Storage 호스트 자동 추가
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supaUrl) {
    try {
      const u = new URL(supaUrl)
      hosts.add(u.hostname.toLowerCase())
    } catch {}
  }
  return hosts
}

async function safeFetchImage(rawUrl: string): Promise<{ base64: string; mimeType: string }> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("imageUrl 형식이 올바르지 않습니다.")
  }

  if (url.protocol !== "https:") {
    throw new Error("https URL 만 허용됩니다.")
  }

  const allowed = getAllowedHosts()
  const host = url.hostname.toLowerCase()
  const isAllowed =
    allowed.has(host) ||
    [...allowed].some((h) => host.endsWith("." + h))
  if (!isAllowed) {
    throw new Error(`허용되지 않은 호스트: ${host}`)
  }

  // DNS resolve 후 모든 IP 가 public 인지 확인 (DNS rebinding / private IP 차단)
  let resolved
  try {
    resolved = await dnsLookup(host, { all: true })
  } catch {
    throw new Error(`도메인 해석 실패: ${host}`)
  }
  for (const r of resolved) {
    if (isPrivateIp(r.address)) {
      throw new Error(`내부 IP 로의 접근은 허용되지 않습니다: ${r.address}`)
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      redirect: "manual", // 리다이렉트 따라가지 않음 (재검증 회피 차단)
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new Error(`이미지 다운로드 실패: ${res.status}`)
  }

  // 파일 사이즈 가드
  const contentLength = Number(res.headers.get("content-length") || 0)
  if (contentLength && contentLength > MAX_IMAGE_BYTES) {
    throw new Error("이미지가 너무 큽니다.")
  }

  const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim()
  if (!ALLOWED_MIME.test(contentType)) {
    throw new Error(`허용되지 않은 mime: ${contentType}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("이미지가 너무 큽니다.")
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64")
  return { base64, mimeType: contentType }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthApi()
    if (!guard.ok) return guard.response

    maybeCleanup()
    const rl = rateLimit({
      key: `ocr:${guard.user.id}`,
      limit: 30,
      windowMs: 5 * 60 * 1000,
    })
    if (!rl.ok) {
      return NextResponse.json(
        { error: `너무 많은 요청. ${Math.ceil(rl.retryAfterMs / 1000)}초 후 다시 시도하세요.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      )
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { imageUrl, imageUrls, imageBase64, mimeType: providedMimeType } = body as {
      imageUrl?: string
      imageUrls?: string[]
      imageBase64?: string
      mimeType?: string
    }

    // 여러 장(반쪽/여러 페이지) 지원: 모든 입력을 하나의 이미지 목록으로 모은다.
    const images: { base64: string; mimeType: string }[] = []

    if (imageBase64) {
      if (typeof imageBase64 !== "string") {
        return NextResponse.json({ error: "imageBase64 형식이 올바르지 않습니다." }, { status: 400 })
      }
      if (imageBase64.length > MAX_BASE64_BYTES) {
        return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413 })
      }
      const b64 = imageBase64.replace(/^data:[^;]+;base64,/, "")
      const mt = (typeof providedMimeType === "string" ? providedMimeType : "image/jpeg").split(";")[0].trim()
      if (!ALLOWED_MIME.test(mt)) {
        return NextResponse.json({ error: `허용되지 않은 mime: ${mt}` }, { status: 400 })
      }
      images.push({ base64: b64, mimeType: mt })
    }

    // 단일 imageUrl + 배열 imageUrls 모두 수용
    const urlList = [
      ...(typeof imageUrl === "string" ? [imageUrl] : []),
      ...(Array.isArray(imageUrls) ? imageUrls.filter((u): u is string => typeof u === "string") : []),
    ].slice(0, MAX_IMAGES)

    for (const u of urlList) {
      try {
        const fetched = await safeFetchImage(u)
        images.push({ base64: fetched.base64, mimeType: fetched.mimeType })
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "이미지 다운로드 실패" },
          { status: 400 }
        )
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "imageUrl / imageUrls / imageBase64 중 하나를 전달해야 합니다." },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: SYSTEM_PROMPT },
                ...images.map((img) => ({
                  inline_data: {
                    mime_type: img.mimeType,
                    data: img.base64,
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error("[OCR] Gemini API 오류 status=", response.status)
      return NextResponse.json(
        { error: `Gemini API 호출 실패 (${response.status})`, detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = await response.json()
    const textPart = data?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text
    if (!textPart) {
      return NextResponse.json(
        { error: "Gemini 응답에서 OCR 결과를 추출할 수 없습니다." },
        { status: 502 }
      )
    }

    let parsed: Record<string, string> | null = null
    try {
      parsed = JSON.parse(textPart)
    } catch {
      // 코드펜스/설명문이 섞이거나 끝이 잘려와도 최대한 복구: 첫 { ~ 마지막 } 추출
      const m = textPart.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          parsed = JSON.parse(m[0])
        } catch {
          /* 아래에서 502 처리 */
        }
      }
    }
    if (!parsed) {
      return NextResponse.json(
        { error: "OCR 응답 JSON 파싱 실패", raw: textPart.slice(0, 500) },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: parsed,
    })
  } catch (err: unknown) {
    console.error("[OCR] 처리 오류:", err instanceof Error ? err.message : "unknown")
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 500 }
    )
  }
}
