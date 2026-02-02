"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Bell, PhoneIncoming, Plus, Lock, Building2, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { QuickMemoDialog } from "@/components/quick-memo-dialog"
import { CrmQuickRegisterDialog } from "@/components/crm-quick-register-dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// 초성 검색 관련 함수
const getChosung = (str: string) => {
  const CHOSUNG_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
  let result = ""
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xac00
    if (code > -1 && code < 11172) {
      result += CHOSUNG_LIST[Math.floor(code / 588)]
    } else if (str[i] !== " ") {
      result += str[i]
    }
  }
  return result
}

const isChosungSearch = (text: string) => {
  const CHOSUNG_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
  return text.split("").every((char) => CHOSUNG_LIST.includes(char))
}

interface SearchResult {
  id: string
  name: string
  stage: string
  type: 'deal' | 'client'
}

export function CrmHeader() {
  const router = useRouter()
  const [quickMemoOpen, setQuickMemoOpen] = useState(false)
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false)
  
  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 검색 실행 (디바운스)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const supabase = createBrowserClient()
        const search = searchTerm.toLowerCase()
        
        // deals 검색 - 전체 데이터 가져오기
        const { data: deals } = await supabase
          .from("deals")
          .select("id, deal_name, stage, account:accounts(company_name)")
        
        // clients 검색 - 전체 데이터 가져오기
        const { data: clients } = await supabase
          .from("clients")
          .select("id, deal_name, stage, account:accounts(company_name)")

        const results: SearchResult[] = []
        
        // deals 필터링
        if (deals) {
          deals.forEach((deal: any) => {
            const name = deal.account?.company_name || deal.deal_name || ""
            if (!name) return
            
            const matchesSearch = isChosungSearch(searchTerm)
              ? getChosung(name).includes(searchTerm)
              : name.toLowerCase().includes(search)
            
            if (matchesSearch) {
              results.push({
                id: deal.id,
                name,
                stage: deal.stage || "",
                type: 'deal'
              })
            }
          })
        }

        // clients 필터링
        if (clients) {
          clients.forEach((client: any) => {
            const name = client.account?.company_name || client.deal_name || ""
            if (!name) return
            
            const matchesSearch = isChosungSearch(searchTerm)
              ? getChosung(name).includes(searchTerm)
              : name.toLowerCase().includes(search)
            
            if (matchesSearch) {
              results.push({
                id: client.id,
                name,
                stage: client.stage || "",
                type: 'client'
              })
            }
          })
        }

        // 이름순 정렬 후 최대 15개 표시
        results.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        setSearchResults(results.slice(0, 15))
        setShowResults(true)
      } catch (error) {
        console.error("[CrmHeader] 검색 오류:", error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleSelectResult = (result: SearchResult) => {
    const path = result.type === 'deal' 
      ? `/deals/${result.id}?tab=activity`
      : `/clients/${result.id}?tab=activity`
    router.push(path)
    setSearchTerm("")
    setShowResults(false)
  }

  const getStageDisplay = (stage: string) => {
    const stageMap: Record<string, string> = {
      S0_new_lead: "S0_신규 유입",
      S1_qualified: "S1_유효 리드",
      S2_contact: "S2_상담 완료",
      S2_consultation: "S2_상담 완료",
      S3_proposal: "S3_제안 발송",
      S4_negotiation: "S4_결정 대기",
      S4_decision: "S4_결정 대기",
      S5_contract: "S5_계약완료",
      S5_complete: "S5_계약완료",
      S6_closed: "S6_종료",
      S6_complete: "S6_종료",
      S7_recontact: "S7_재접촉",
    }
    return stageMap[stage] || stage
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex flex-1 items-center gap-4">
          <div ref={searchRef} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              ref={inputRef}
              type="search" 
              placeholder="거래처 검색..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setShowResults(true)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
            
            {/* 검색 결과 드롭다운 */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSelectResult(result)}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-xs",
                          result.type === 'deal' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        )}>
                          {result.type === 'deal' ? '신규' : '기존'}
                        </span>
                        <span>{getStageDisplay(result.stage)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 검색 결과 없음 */}
            {showResults && searchTerm && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={() => setQuickRegisterOpen(true)}
          >
            <Plus className="h-4 w-4" />
            CRM 빠른 등록
          </Button>

          <Button variant="default" size="sm" className="gap-2" onClick={() => setQuickMemoOpen(true)}>
            <PhoneIncoming className="h-4 w-4" />
            빠른 메모
          </Button>

          <Button variant="ghost" size="icon" className="relative opacity-50 cursor-not-allowed" disabled>
            <Bell className="h-5 w-5" />
            <Lock className="absolute right-1.5 top-1.5 h-3 w-3" />
          </Button>

          <div className="relative opacity-50 cursor-not-allowed">
            <Avatar>
              <AvatarFallback className="bg-muted text-muted-foreground">JS</AvatarFallback>
            </Avatar>
            <Lock className="absolute right-0 bottom-0 h-3 w-3 bg-card rounded-full p-0.5" />
          </div>
        </div>
      </header>

      <QuickMemoDialog open={quickMemoOpen} onOpenChange={setQuickMemoOpen} />
      <CrmQuickRegisterDialog open={quickRegisterOpen} onOpenChange={setQuickRegisterOpen} />
    </>
  )
}

export default CrmHeader
