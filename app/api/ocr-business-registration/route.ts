import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const SYSTEM_PROMPT = `당신은 한국 사업자등록증을 정확히 OCR 인식하는 전문가입니다.
이미지에 있는 한국 사업자등록증의 정보를 추출하여 반드시 JSON 형식으로만 응답하세요.

## 한국 사업자등록증 일반 양식 안내
- 등록번호: "사업자등록번호" 또는 상단의 "000-00-00000" 형태 (10자리, "-" 포함하여 출력)
- 법인등록번호: "법인등록번호" 라벨 옆 13자리 (있을 경우만, "000000-0000000" 형태)
- 상호 / 법인명: 회사 이름
- 대표자(성명): 대표자 또는 성명
- 개업연월일: "개업연월일", "개업일자" → YYYY-MM-DD
- 사업장 소재지(주소)
- 본점 소재지: 법인사업자만 별도 표기될 수 있음
- 사업의 종류:
    - 업태: "업태" 라벨 (예: 도매 및 소매업, 정보통신업, 서비스업)
    - 종목: "종목" 라벨 (예: 컴퓨터프로그래밍, 광고대행 등)
- 발급일자: 사업자등록증 하단 발급일 → YYYY-MM-DD
- 과세 유형: "법인사업자", "일반과세자", "간이과세자", "면세사업자" 중 하나로 추정

## 규칙
1. 이미지에서 명확히 읽히는 값만 채우세요. 추측하지 말고, 안 보이는 항목은 빈 문자열("")로 두세요.
2. 날짜는 모두 YYYY-MM-DD 포맷으로 변환 (예: "2020년 03월 05일" → "2020-03-05").
3. 사업자등록번호는 "000-00-00000" 하이픈 포함 형식으로 정규화.
4. 응답은 반드시 아래 JSON 스키마 그대로, 다른 설명/주석 없이 JSON만 출력.

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

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`이미지 다운로드 실패: ${res.status}`)
  }
  const contentType = res.headers.get("content-type") || "image/jpeg"
  const arrayBuffer = await res.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  return { base64, mimeType: contentType }
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY를 추가해주세요." },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { imageUrl, imageBase64, mimeType: providedMimeType } = body as {
      imageUrl?: string
      imageBase64?: string
      mimeType?: string
    }

    let base64: string
    let mimeType: string

    if (imageBase64) {
      base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "")
      mimeType = providedMimeType || "image/jpeg"
    } else if (imageUrl) {
      const fetched = await fetchImageAsBase64(imageUrl)
      base64 = fetched.base64
      mimeType = fetched.mimeType
    } else {
      return NextResponse.json(
        { error: "imageUrl 또는 imageBase64 중 하나를 전달해야 합니다." },
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
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error("[OCR] Gemini API 오류:", response.status, errText)
      return NextResponse.json(
        { error: `Gemini API 호출 실패 (${response.status})`, detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const data = await response.json()
    const textPart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text
    if (!textPart) {
      console.error("[OCR] Gemini 응답에 text 파트가 없음:", JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: "Gemini 응답에서 OCR 결과를 추출할 수 없습니다." },
        { status: 502 }
      )
    }

    let parsed: Record<string, string>
    try {
      parsed = JSON.parse(textPart)
    } catch (e) {
      console.error("[OCR] JSON 파싱 실패. 원본:", textPart.slice(0, 500))
      return NextResponse.json(
        { error: "OCR 응답 JSON 파싱 실패", raw: textPart.slice(0, 500) },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: parsed,
    })
  } catch (err: any) {
    console.error("[OCR] 처리 오류:", err)
    return NextResponse.json(
      { error: err?.message || "알 수 없는 오류" },
      { status: 500 }
    )
  }
}
