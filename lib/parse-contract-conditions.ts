/**
 * 계약 확정 시 입력된 "조건" 텍스트와 "비용" 텍스트를 파싱하여
 * 프로젝트 명세서 요청서(project_specs) 행 데이터를 생성한다.
 *
 * 예시 입력:
 *  - cost: "1,500,000원 ( vat별도 )"  / conditions: "선금 50% / 완납금 50%"
 *      → [{ cost_type:'계약금', amount:750000 }, { cost_type:'완납금', amount:750000 }]
 *  - cost: "월 50만원"  / conditions: ""
 *      → [{ cost_type:'월 대행비', amount:500000 }]
 *  - cost: "300만원"  / conditions: ""
 *      → [{ cost_type:'일괄 완납금', amount:3000000 }]
 */

export type CostType = "계약금" | "중도금" | "완납금" | "일괄 완납금" | "월 대행비"
export type ProjectCategory = "마케팅" | "홈페이지" | "개발" | "그 외"

export interface ParsedSpecRow {
  cost_type: CostType
  amount: number | null
  ratio_label?: string
}

/**
 * 프로젝트 명세서 행의 프로젝트명을 자동 생성한다.
 * 형식: "업체명 카테고리_비용종류"
 *  - 예) 메타애드 홈페이지_계약금
 *  - 예) 메타애드 마케팅_월 대행비
 * "그 외" 카테고리는 "영상" 으로 표기한다.
 * 업체명이 없으면 "카테고리_비용종류" 만 반환.
 */
export function buildSpecProjectName(
  companyName: string | null | undefined,
  category: string | null | undefined,
  costType: string | null | undefined
): string {
  const company = (companyName || "").trim()
  const catRaw = (category || "").trim()
  const cat = catRaw === "그 외" ? "영상" : catRaw
  const cost = (costType || "").trim()
  const suffix = [cat, cost].filter(Boolean).join("_")
  if (!suffix) return company
  return company ? `${company} ${suffix}` : suffix
}

/**
 * "1,500,000원", "1500000", "150만원", "1.5억", "월 50만원" 등을 정수(원)로 변환
 */
export function parseAmountToWon(raw: string): number | null {
  if (!raw) return null
  const text = raw.toString().trim()

  // "억", "만" 단위 처리
  const hasEok = /억/.test(text)
  const hasMan = /만/.test(text)
  if (hasEok || hasMan) {
    let total = 0
    const eokMatch = text.match(/([\d,.]+)\s*억/)
    const manMatch = text.match(/([\d,.]+)\s*만/)
    if (eokMatch) total += Math.round(parseFloat(eokMatch[1].replace(/,/g, "")) * 100_000_000)
    if (manMatch) total += Math.round(parseFloat(manMatch[1].replace(/,/g, "")) * 10_000)
    return total > 0 ? total : null
  }

  const cleaned = text.replace(/[^0-9]/g, "")
  if (!cleaned) return null
  const num = Number(cleaned)
  if (Number.isNaN(num) || num <= 0) return null
  return num
}

/**
 * "월 X만원", "매월 X원" 등의 패턴이면 true
 */
function isMonthlyCost(cost: string, conditions: string): boolean {
  const target = `${cost} ${conditions}`
  return /(^|\s)월\s|매월|월\s*\d|월\s*[가-힣]/.test(target) || /월\s*대행/.test(target)
}

/**
 * "선금 50%", "계약금 30%", "중도금 20%", "완납금 50%", "잔금 50%" 같은 비율 표현 파싱
 * 인식되면 비율로 분할된 행을 반환, 아니면 빈 배열
 */
function parseRatioConditions(conditions: string): { cost_type: CostType; ratio: number; ratio_label: string }[] {
  if (!conditions) return []
  const text = conditions.replace(/\s+/g, " ").trim()

  type Hit = { cost_type: CostType; ratio: number; ratio_label: string; index: number }
  const hits: Hit[] = []

  const patterns: { regex: RegExp; cost_type: CostType }[] = [
    { regex: /(선금|계약금|착수금)\s*([0-9]+(?:\.[0-9]+)?)\s*%/g, cost_type: "계약금" },
    { regex: /(중도금|중간금|2차)\s*([0-9]+(?:\.[0-9]+)?)\s*%/g, cost_type: "중도금" },
    { regex: /(완납금|잔금|잔액|최종금|마감금)\s*([0-9]+(?:\.[0-9]+)?)\s*%/g, cost_type: "완납금" },
  ]

  for (const { regex, cost_type } of patterns) {
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      hits.push({
        cost_type,
        ratio: parseFloat(m[2]) / 100,
        ratio_label: `${m[1]} ${m[2]}%`,
        index: m.index,
      })
    }
  }

  hits.sort((a, b) => a.index - b.index)
  return hits.map(({ index: _index, ...rest }) => rest)
}

/**
 * 메인 파서.
 * 우선순위:
 *  1) 월 대행비 패턴 → 1행
 *  2) 비율 조건 패턴 → N행 (cost가 있으면 비율 적용, 없으면 amount=null)
 *  3) fallback → 일괄 완납금 1행
 */
export function parseContractConditions(conditions: string, cost: string): ParsedSpecRow[] {
  const rawConditions = (conditions || "").toString()
  const rawCost = (cost || "").toString()

  const total = parseAmountToWon(rawCost)

  // 1) 월 대행비
  if (isMonthlyCost(rawCost, rawConditions)) {
    return [{ cost_type: "월 대행비", amount: total }]
  }

  // 2) 비율 조건 분할
  const ratioHits = parseRatioConditions(rawConditions)
  if (ratioHits.length >= 1) {
    // 비율 합계 검증 (대략 1.0이어야 정상)
    const sum = ratioHits.reduce((s, h) => s + h.ratio, 0)
    const isValidSum = sum > 0.99 && sum < 1.01

    return ratioHits.map((h) => ({
      cost_type: h.cost_type,
      amount: total != null && isValidSum ? Math.round(total * h.ratio) : null,
      ratio_label: h.ratio_label,
    }))
  }

  // 3) fallback
  return [{ cost_type: "일괄 완납금", amount: total }]
}

/**
 * 거래 needs_summary 또는 카테고리 텍스트로부터 명세서 카테고리 추론
 */
export function inferProjectCategory(needsSummary: string | null | undefined): ProjectCategory {
  const text = (needsSummary || "").toLowerCase()
  if (!text) return "그 외"
  if (/마케팅|광고|sns|seo|퍼포먼스|블로그/.test(text)) return "마케팅"
  if (/홈페이지|웹사이트|랜딩|랜딩페이지/.test(text)) return "홈페이지"
  if (/앱|개발|erp|시스템|커스텀|솔루션|플랫폼/.test(text)) return "개발"
  return "그 외"
}

/**
 * "2026.04.26" / "2026-04-26" / "20260426" 등 다양한 날짜 표기를 ISO YYYY-MM-DD로 정규화
 */
export function normalizeDateString(input: string | null | undefined): string | null {
  if (!input) return null
  const text = input.toString().trim()
  if (!text) return null

  // 이미 YYYY-MM-DD 인 경우
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)

  // YYYY.MM.DD or YYYY/MM/DD
  const dotMatch = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/)
  if (dotMatch) {
    const [, y, m, d] = dotMatch
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // YYYYMMDD
  const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})/)
  if (compactMatch) {
    const [, y, m, d] = compactMatch
    return `${y}-${m}-${d}`
  }

  return null
}
