import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// 단가 기준표 (프롬프트에 포함)
const PRICING_GUIDE = `
## 웹 개발 단가 기준표 (2025년 기준, 부가세 별도)

### 웹사이트 유형별 기본 단가
- 랜딩페이지 (1페이지): 100~200만원
- 소규모 홈페이지 (5페이지 이내): 300~500만원
- 중소기업 홈페이지 (10페이지 이내): 500~800만원
- 기업 홈페이지 (15페이지 이상): 800~1,500만원
- 쇼핑몰 (기본형): 800~1,500만원
- 쇼핑몰 (커스텀): 1,500~3,000만원

### 기능별 추가 단가
- 회원가입/로그인 시스템: 100~200만원
- 게시판 (기본): 50~100만원
- 게시판 (고급, 파일첨부 등): 100~200만원
- 결제 시스템 연동: 200~400만원
- 예약 시스템: 150~300만원
- 채팅/상담 기능: 100~200만원
- 관리자 페이지 (기본): 200~400만원
- 관리자 페이지 (고급): 400~800만원
- API 연동 (건당): 50~150만원
- 반응형 웹 (추가비용): 기본가의 20~30%
- 다국어 지원: 기본가의 30~50%

### 앱 개발 단가
- 하이브리드 앱 (기본): 500~1,000만원
- 하이브리드 앱 (고급): 1,000~2,000만원
- 네이티브 앱 (iOS 또는 Android): 1,500~3,000만원
- 네이티브 앱 (iOS + Android): 2,500~5,000만원

### SaaS/웹앱 개발
- MVP 개발 (기본 기능): 2,000~5,000만원
- 중규모 SaaS: 5,000~1억원
- 대규모 SaaS: 1억원 이상

### 유지보수 비용 (월)
- 기본 유지보수: 개발비의 5~10% / 월
- 호스팅/서버 비용: 5~30만원 / 월
- 도메인: 2~5만원 / 년

### 디자인 별도 단가
- UI/UX 디자인 (페이지당): 10~30만원
- 로고 디자인: 30~100만원
- 브랜드 아이덴티티: 100~300만원
`

const INTERNAL_COST_GUIDE = `
## 내부 인력 단가 기준 (월 기준)
- 기획/PM: 333만원/월
- UI/UX 설계: 333만원/월
- 프론트엔드 개발: 333만원/월
- 백엔드 개발: 333만원/월
- QA/안정화: 333만원/월
- 기타 공용: 333만원/월
`

const SYSTEM_PROMPT = `당신은 웹/앱 개발 프로젝트의 견적을 작성하는 전문가입니다.
고객의 요구사항을 분석하여 적절한 견적 항목과 금액을 산정해주세요.
또한 내부 원가 분석을 위해 인력/공수 산정도 함께 제공해주세요.

${PRICING_GUIDE}

${INTERNAL_COST_GUIDE}

## 규칙
1. 고객의 요구사항을 정확히 파악하고, 누락된 부분은 일반적인 기준으로 추정
2. 각 항목의 금액은 위 단가표를 참고하되, 복잡도에 따라 조정
3. 견적 항목은 구체적이고 명확하게 작성
4. 고객이 이해하기 쉬운 용어 사용
5. 내부 원가 분석은 실제 투입될 인력과 공수를 현실적으로 산정
6. 반드시 JSON 형식으로만 응답

## 응답 형식 (반드시 이 JSON 형식으로만 응답)
{
  "title": "견적서 제목 (예: OOO 홈페이지 제작 견적서)",
  "items": [
    {
      "name": "항목명",
      "quantity": 1,
      "unit_price": 금액(숫자),
      "description": "항목 설명"
    }
  ],
  "notes": "특이사항 및 참고사항",
  "email_template": {
    "subject": "이메일 제목",
    "body": "이메일 본문 (견적서 첨부 안내 포함)"
  },
  "assumptions": ["추정한 사항 목록"],
  "internal_cost": {
    "resources": [
      {
        "role": "역할명 (예: 기획/PM, UI/UX 설계, 프론트엔드 개발, 백엔드 개발, QA/안정화)",
        "headcount": "투입 인력 (예: 1명, 포함, 공용)",
        "duration": 공수(숫자, 개월 단위, 예: 0.8),
        "monthly_rate": 월단가(숫자, 예: 3330000),
        "total_cost": 원가(숫자, duration * monthly_rate)
      }
    ],
    "total_duration": "총 예상 기간 (예: 5.5개월)",
    "total_internal_cost": 총내부원가(숫자),
    "profit_margin": "예상 마진율 (예: 30%)"
  }
}
`

export async function POST(request: NextRequest) {
  try {
    // 디버깅: API 키 확인 (앞 10자만 출력)
    console.log("GEMINI_API_KEY 설정 여부:", !!GEMINI_API_KEY)
    console.log("GEMINI_API_KEY 앞 10자:", GEMINI_API_KEY?.substring(0, 10) + "...")
    console.log("GEMINI_API_KEY 길이:", GEMINI_API_KEY?.length)

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY를 추가해주세요." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { customerInfo, requirements, additionalContext } = body

    if (!requirements) {
      return NextResponse.json(
        { error: "요구사항을 입력해주세요." },
        { status: 400 }
      )
    }

    // 사용자 프롬프트 구성
    const userPrompt = `
## 고객 정보
${customerInfo || "정보 없음"}

## 프로젝트 요구사항
${requirements}

## 추가 정보
${additionalContext || "없음"}

위 정보를 바탕으로 견적서를 작성해주세요. 정보가 부족한 부분은 일반적인 기준으로 추정하고, assumptions에 명시해주세요.
`

    // Gemini API 호출 (gemini-3-flash-preview 사용)
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
                {
                  text: SYSTEM_PROMPT + "\n\n" + userPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Gemini API 오류:", errorData)
      return NextResponse.json(
        { error: "AI 서비스 호출에 실패했습니다.", details: errorData },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    // 토큰 사용량 출력
    const usageMetadata = data.usageMetadata
    if (usageMetadata) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("📊 Gemini API 토큰 사용량")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log(`  입력 토큰: ${usageMetadata.promptTokenCount?.toLocaleString() || 0}`)
      console.log(`  출력 토큰: ${usageMetadata.candidatesTokenCount?.toLocaleString() || 0}`)
      console.log(`  총 토큰: ${usageMetadata.totalTokenCount?.toLocaleString() || 0}`)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    }
    
    // Gemini 응답에서 텍스트 추출
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!generatedText) {
      return NextResponse.json(
        { error: "AI 응답을 받지 못했습니다." },
        { status: 500 }
      )
    }

    // JSON 파싱
    let quotationData
    try {
      // JSON 블록 추출 (```json ... ``` 형식일 경우)
      const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : generatedText
      quotationData = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error("JSON 파싱 오류:", parseError, "원본:", generatedText)
      return NextResponse.json(
        { error: "AI 응답 파싱에 실패했습니다.", raw: generatedText },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: quotationData,
    })
  } catch (error) {
    console.error("견적 생성 오류:", error)
    return NextResponse.json(
      { error: "견적 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
