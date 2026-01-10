"use client"

import { CrmSidebar } from "@/components/crm-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Bell, HelpCircle } from "lucide-react"
import { useHelpSettings } from "@/lib/use-help-settings"
import { usePatchNotes } from "@/lib/use-patch-notes"

export default function SettingsPage() {
  const { helpEnabled, setHelpEnabled, lastSeenVersion } = useHelpSettings()
  const { currentVersion } = usePatchNotes()

  return (
    <div className="flex h-screen bg-background">
      <CrmSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-2xl">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">⚙️ 설정</h1>
            <p className="text-muted-foreground mt-2">
              oort 영업 SOS CRM 환경 설정
            </p>
          </div>

          {/* 도움말 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                도움말 시스템
              </CardTitle>
              <CardDescription>
                도움말 및 알림 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 도움말 표시 토글 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="help-toggle" className="text-base font-medium">
                    도움말 표시
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    새 패치노트 알림, 도움말 말풍선 등을 표시합니다
                  </p>
                </div>
                <Switch
                  id="help-toggle"
                  checked={helpEnabled}
                  onCheckedChange={setHelpEnabled}
                />
              </div>

              <Separator />

              {/* 현재 상태 표시 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">현재 상태</h4>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">현재 버전</span>
                  </div>
                  <Badge variant="secondary">v{currentVersion}</Badge>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">마지막 확인한 버전</span>
                  </div>
                  <Badge variant="outline">
                    {lastSeenVersion ? `v${lastSeenVersion}` : "확인 기록 없음"}
                  </Badge>
                </div>
              </div>

              {!helpEnabled && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  💡 도움말이 꺼져 있으면 새 패치노트 알림이 표시되지 않습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 추가 설정 영역 (나중에 확장 가능) */}
          <Card className="mt-6 opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                🔒 사용자 설정
                <Badge variant="outline">준비 중</Badge>
              </CardTitle>
              <CardDescription>
                사용자 계정 및 개인화 설정 (추후 지원 예정)
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}

