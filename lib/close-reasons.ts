// 종료 사유 코드 및 상수 정의

export interface CloseReason {
  code: string
  reason: string
  category: 'C' | 'P' | 'R' | 'I' | 'S'
}

export const CLOSE_REASON_CATEGORIES = {
  C: { name: 'Client', label: '고객 사유', color: 'bg-blue-100 text-blue-800' },
  P: { name: 'Price', label: '가격 사유', color: 'bg-green-100 text-green-800' },
  R: { name: 'Rival', label: '경쟁 사유', color: 'bg-orange-100 text-orange-800' },
  I: { name: 'Internal', label: '내부 사유', color: 'bg-purple-100 text-purple-800' },
  S: { name: 'Strategic', label: '전략 사유', color: 'bg-red-100 text-red-800' },
} as const

export const CLOSE_REASONS: CloseReason[] = [
  // C - Client (고객 사유)
  { code: 'C01', reason: '예산 부족', category: 'C' },
  { code: 'C02', reason: '일정 보류 / 시기 미정', category: 'C' },
  { code: 'C03', reason: '내부 의사결정 지연', category: 'C' },
  { code: 'C04', reason: '우선순위 변경', category: 'C' },
  { code: 'C05', reason: '내부 제작 전환', category: 'C' },
  { code: 'C06', reason: '기존 거래처 유지', category: 'C' },
  { code: 'C07', reason: '연락 두절', category: 'C' },
  { code: 'C08', reason: '니즈 불일치', category: 'C' },
  { code: 'C09', reason: '프로젝트 취소', category: 'C' },
  
  // P - Price (가격 사유)
  { code: 'P01', reason: '가격 부담', category: 'P' },
  { code: 'P02', reason: '가격 비교 후 이탈', category: 'P' },
  { code: 'P03', reason: '결제 조건 불일치', category: 'P' },
  { code: 'P04', reason: '계약 조건 불일치', category: 'P' },
  { code: 'P05', reason: '할인 요구 과다', category: 'P' },
  { code: 'P06', reason: '견적 범위 오해', category: 'P' },
  
  // R - Rival (경쟁 사유)
  { code: 'R01', reason: '경쟁사 수주', category: 'R' },
  { code: 'R02', reason: '기존 파트너 재계약', category: 'R' },
  { code: 'R03', reason: '지인/소개 업체 선택', category: 'R' },
  { code: 'R04', reason: '브랜드 신뢰도 열위', category: 'R' },
  { code: 'R05', reason: '포트폴리오 부족 인식', category: 'R' },
  
  // I - Internal (내부 사유)
  { code: 'I01', reason: '응답 지연', category: 'I' },
  { code: 'I02', reason: '제안서 품질 부족', category: 'I' },
  { code: 'I03', reason: '상담 단계 설득 실패', category: 'I' },
  { code: 'I04', reason: '니즈 파악 미흡', category: 'I' },
  { code: 'I05', reason: '후속 관리 누락', category: 'I' },
  { code: 'I06', reason: '담당자 변경 이슈', category: 'I' },
  
  // S - Strategic (전략 사유)
  { code: 'S01', reason: '수익성 부족', category: 'S' },
  { code: 'S02', reason: '리스크 과다', category: 'S' },
  { code: 'S03', reason: '요구사항 과도', category: 'S' },
  { code: 'S04', reason: '계약 조건 비합리', category: 'S' },
  { code: 'S05', reason: '내부 전략적 제외', category: 'S' },
]

// 카테고리별로 그룹화된 종료 사유
export const CLOSE_REASONS_BY_CATEGORY = CLOSE_REASONS.reduce((acc, reason) => {
  if (!acc[reason.category]) {
    acc[reason.category] = []
  }
  acc[reason.category].push(reason)
  return acc
}, {} as Record<string, CloseReason[]>)

// 코드로 종료 사유 찾기
export function getCloseReasonByCode(code: string): CloseReason | undefined {
  return CLOSE_REASONS.find(r => r.code === code)
}

// 코드로 종료 사유 텍스트 가져오기 (다중 코드 지원)
export function getCloseReasonText(codes: string): string {
  if (!codes) return '-'
  
  // 쉼표로 구분된 다중 코드 처리
  const codeList = codes.split(',').map(c => c.trim()).filter(Boolean)
  
  if (codeList.length === 0) return '-'
  
  if (codeList.length === 1) {
    const reason = getCloseReasonByCode(codeList[0])
    return reason ? `${reason.code} ${reason.reason}` : codeList[0]
  }
  
  // 다중 코드인 경우
  return codeList.map(code => {
    const reason = getCloseReasonByCode(code)
    return reason ? `${reason.code} ${reason.reason}` : code
  }).join(' / ')
}

// 카테고리 색상 가져오기
export function getCategoryColor(category: 'C' | 'P' | 'R' | 'I' | 'S'): string {
  return CLOSE_REASON_CATEGORIES[category]?.color || 'bg-gray-100 text-gray-800'
}

