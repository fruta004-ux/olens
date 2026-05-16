/**
 * /sign/* 단독 레이아웃 — CRM 사이드바/헤더 없이 공개 페이지로 표시.
 * 거래처(외부) 사용자가 보는 화면이라 내부 UI 노출 X.
 */
export default function SignLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
