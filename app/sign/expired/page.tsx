import { AlertTriangle } from "lucide-react"

export const metadata = {
  title: "링크 만료",
}

export default function SignExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <AlertTriangle className="h-9 w-9 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">링크가 만료되었거나 사용할 수 없습니다</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          이 서명 링크는 만료되었거나 이미 사용된 링크입니다.
          <br />
          서명이 필요하시면 담당자에게 재발송을 요청해주세요.
        </p>
        <p className="text-xs text-gray-400 mt-6">— 플루타 / 오코랩스 —</p>
      </div>
    </div>
  )
}
