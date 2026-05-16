import { CheckCircle2 } from "lucide-react"

export const metadata = {
  title: "서명 완료",
}

export default function SignDonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">서명이 완료되었습니다</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          계약서 서명이 정상적으로 처리되었습니다.
          <br />
          이 창은 닫으셔도 됩니다.
        </p>
        <p className="text-xs text-gray-400 mt-6">— 플루타 / 오코랩스 —</p>
      </div>
    </div>
  )
}
