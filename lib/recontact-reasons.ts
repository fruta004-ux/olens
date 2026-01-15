// 재접촉 사유 코드 및 상수 정의

export interface RecontactReason {
  code: string
  reason: string
}

export const RECONTACT_REASONS: RecontactReason[] = [
  { code: 'RC01', reason: '예산 미확보 - 다음 분기 재논의' },
  { code: 'RC02', reason: '담당자 부재 - 복귀 후 재접촉' },
  { code: 'RC03', reason: '프로젝트 지연 - 일정 확정 후 연락' },
  { code: 'RC04', reason: '내부 검토 중 - 결과 후 재접촉' },
  { code: 'RC05', reason: '경쟁사 검토 중 - 결과 후 재접촉' },
  { code: 'RC06', reason: '시기 미정 - 추후 재접촉' },
  { code: 'RC99', reason: '직접 입력' },
]

// 코드로 재접촉 사유 찾기
export function getRecontactReasonByCode(code: string): RecontactReason | undefined {
  return RECONTACT_REASONS.find(r => r.code === code)
}

// 코드로 재접촉 사유 텍스트 가져오기
export function getRecontactReasonText(code: string): string {
  if (!code) return '-'
  
  // RC로 시작하는 코드인 경우 매핑된 사유 반환
  const reason = getRecontactReasonByCode(code)
  if (reason && reason.code !== 'RC99') {
    return reason.reason
  }
  
  // 직접 입력된 사유인 경우 그대로 반환
  return code
}
