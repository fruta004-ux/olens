"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@/lib/supabase/client"
import { Clipboard, Check } from "lucide-react"

interface CrmQuickRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CrmQuickRegisterDialog({ open, onOpenChange }: CrmQuickRegisterDialogProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    company_name: "",
    industry: "",
    inflow_source: "",
    inquiry_channel: "",
    assigned_to: "오일환",
    first_contact_datetime: "",
    phone: "",
    email: "",
    needs_summary: "",
    grade: "",
    content: "",
  })

  const [channelTalkText, setChannelTalkText] = useState("")

  const [inflowSources, setInflowSources] = useState<string[]>([])
  const [inquiryChannels, setInquiryChannels] = useState<string[]>([])
  const [needsOptions, setNeedsOptions] = useState<string[]>([])
  const [gradeOptions, setGradeOptions] = useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    loadSettings()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    setFormData((prev) => ({
      ...prev,
      first_contact_datetime: `${year}-${month}-${day}T${hours}:${minutes}`,
    }))
  }, [])

  const loadSettings = async () => {
    const supabase = createBrowserClient()

    const { data: sources } = await supabase
      .from("settings")
      .select("value")
      .eq("category", "source")
      .order("display_order")
    setInflowSources(sources?.map((s) => s.value) || [])

    const { data: channels } = await supabase
      .from("settings")
      .select("value")
      .eq("category", "channel")
      .order("display_order")
    setInquiryChannels(channels?.map((c) => c.value) || [])

    const { data: needs } = await supabase
      .from("settings")
      .select("value")
      .eq("category", "needs")
      .order("display_order")
    setNeedsOptions(needs?.map((n) => n.value) || [])

    const { data: grades } = await supabase
      .from("settings")
      .select("value")
      .eq("category", "grade")
      .order("display_order")
    setGradeOptions(grades?.map((g) => g.value) || [])
  }

  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .replace(/^\d+_/, "") // 숫자 prefix 제거 (1_, 2_ 등)
      .replace(/[_\s\-()]/g, "") // 언더스코어, 공백, 하이픈, 괄호 제거
      .trim()
  }

  // 키워드 추출 (한글 2글자 이상 또는 영문 단어)
  const extractKeywords = (str: string) => {
    const normalized = str.toLowerCase()
    // 한글 단어 추출 (2글자 이상)
    const koreanWords = normalized.match(/[가-힣]{2,}/g) || []
    // 영문 단어 추출
    const englishWords = normalized.match(/[a-z]{2,}/g) || []
    return [...koreanWords, ...englishWords]
  }

  const findBestMatch = (input: string, options: string[]) => {
    if (!input || options.length === 0) return ""

    const normalizedInput = normalizeString(input)
    const inputLower = input.toLowerCase()

    // 1. 정확히 일치하는 항목 찾기
    const exactMatch = options.find((opt) => normalizeString(opt) === normalizedInput)
    if (exactMatch) return exactMatch

    // 2. 입력값이 옵션에 포함되거나 옵션이 입력값에 포함되는 경우
    const containsMatch = options.find((opt) => {
      const optLower = opt.toLowerCase()
      return optLower.includes(inputLower) || inputLower.includes(optLower)
    })
    if (containsMatch) return containsMatch

    // 3. 정규화된 문자열로 부분 매칭
    const normalizedMatches = options.filter((opt) => {
      const normalizedOpt = normalizeString(opt)
      return normalizedOpt.includes(normalizedInput) || normalizedInput.includes(normalizedOpt)
    })
    if (normalizedMatches.length > 0) {
      return normalizedMatches.reduce((best, current) => 
        current.length < best.length ? current : best
      )
    }

    // 4. 키워드 기반 매칭 (핵심 단어가 포함되어 있는지)
    const inputKeywords = extractKeywords(input)
    const keywordScores = options.map(opt => {
      const optKeywords = extractKeywords(opt)
      let score = 0
      
      // 입력 키워드가 옵션에 포함된 횟수
      inputKeywords.forEach(keyword => {
        if (opt.toLowerCase().includes(keyword)) score += 2
        if (optKeywords.some(ok => ok.includes(keyword) || keyword.includes(ok))) score += 1
      })
      
      // 옵션 키워드가 입력에 포함된 횟수
      optKeywords.forEach(keyword => {
        if (input.toLowerCase().includes(keyword)) score += 2
      })
      
      return { option: opt, score }
    })

    const bestKeywordMatch = keywordScores.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    if (bestKeywordMatch.score > 0) {
      return bestKeywordMatch.option
    }

    return "" // 매칭 실패
  }

  // 담당자 이름 정규화 (직함 제거하고 이름만 추출)
  const normalizeAssignedTo = (name: string) => {
    const trimmed = name.trim()
    // 직함 제거 (대표, 과장, 사원, 팀장, 부장, 차장, 이사 등)
    const nameOnly = trimmed.replace(/\s*(대표|과장|사원|팀장|부장|차장|이사|사장|매니저|실장|본부장)$/g, '').trim()
    
    // 알려진 담당자 매핑
    const assigneeMap: Record<string, string> = {
      "오일환": "오일환",
      "박상혁": "박상혁",
      "윤경호": "윤경호",
      "미정": "미정",
    }
    
    for (const [key, value] of Object.entries(assigneeMap)) {
      if (nameOnly.includes(key)) return value
    }
    return nameOnly || "미정"
  }

  const parseChannelTalkText = (text: string) => {
    const parsed: any = {
      company_name: "",
      industry: "",
      inflow_source: "",
      inquiry_channel: "",
      assigned_to: "오일환",
      first_contact_datetime: "",
      phone: "",
      email: "",
      needs_summary: "",
      grade: "",
      content: "",
    }

    const nameMatch = text.match(/명\s*칭\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (nameMatch) parsed.company_name = nameMatch[1].trim()

    const industryMatch = text.match(/업\s*종\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (industryMatch) parsed.industry = industryMatch[1].trim()

    const sourceMatch = text.match(/경\s*로\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (sourceMatch) {
      const rawSource = sourceMatch[1].trim()
      const matched = findBestMatch(rawSource, inflowSources)
      parsed.inflow_source = matched || rawSource
      // 매칭 실패시 원본 값 저장 (나중에 수동 선택 가능)
      if (!matched) {
        console.log(`[CRM 파싱] 유입경로 매칭 실패: "${rawSource}" → 옵션: ${inflowSources.join(', ')}`)
      }
    }

    const channelMatch = text.match(/요\s*청\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (channelMatch) {
      const rawChannel = channelMatch[1].trim()
      const matched = findBestMatch(rawChannel, inquiryChannels)
      parsed.inquiry_channel = matched || rawChannel
      if (!matched) {
        console.log(`[CRM 파싱] 문의창구 매칭 실패: "${rawChannel}" → 옵션: ${inquiryChannels.join(', ')}`)
      }
    }

    // 응대자 처리 - 직함 포함 처리
    const assignedMatch = text.match(/응\s*대\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (assignedMatch) {
      const rawAssigned = assignedMatch[1].trim()
      parsed.assigned_to = normalizeAssignedTo(rawAssigned)
    }

    const datetimeMatch = text.match(/일\s*시\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (datetimeMatch) {
      const datetimeStr = datetimeMatch[1].trim()
      const monthMatch = datetimeStr.match(/(\d+)월/)
      const dayMatch = datetimeStr.match(/(\d+)일/)

      // 오전/오후 형식 (예: "오후 3시 5분", "오전 12시 30분")
      const ampmTimeMatch = datetimeStr.match(/(오전|오후)\s*(\d+)시\s*(\d+)분/)
      // 24시간 형식 (예: "17시 50분", "13시 21분", "11시 00분")
      const hourTimeMatch = datetimeStr.match(/(\d+)시\s*(\d+)분/)

      if (monthMatch && dayMatch) {
        const year = new Date().getFullYear()
        const month = String(Number.parseInt(monthMatch[1])).padStart(2, "0")
        const day = String(Number.parseInt(dayMatch[1])).padStart(2, "0")

        let hour = 0
        let minute = 0

        if (ampmTimeMatch) {
          // 오전/오후 형식 처리
          hour = Number.parseInt(ampmTimeMatch[2])
          if (ampmTimeMatch[1] === "오후" && hour !== 12) hour += 12
          if (ampmTimeMatch[1] === "오전" && hour === 12) hour = 0
          minute = Number.parseInt(ampmTimeMatch[3])
        } else if (hourTimeMatch) {
          // 24시간 형식 처리
          hour = Number.parseInt(hourTimeMatch[1])
          minute = Number.parseInt(hourTimeMatch[2])
        }

        const hourStr = String(hour).padStart(2, "0")
        const minuteStr = String(minute).padStart(2, "0")
        parsed.first_contact_datetime = `${year}-${month}-${day}T${hourStr}:${minuteStr}`
      }
    }

    const phoneMatch = text.match(/연락처\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (phoneMatch) parsed.phone = phoneMatch[1].trim()

    // 이메일 파싱 (선택적 - 없어도 됨)
    const emailMatch = text.match(/이메일\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (emailMatch) parsed.email = emailMatch[1].trim()

    const needsMatch = text.match(/니\s*즈\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (needsMatch) {
      const rawNeeds = needsMatch[1].trim()
      const matched = findBestMatch(rawNeeds, needsOptions)
      parsed.needs_summary = matched || rawNeeds
      if (!matched) {
        console.log(`[CRM 파싱] 니즈 매칭 실패: "${rawNeeds}" → 옵션: ${needsOptions.join(', ')}`)
      }
    }

    const gradeMatch = text.match(/등\s*급\s*[:：]\s*(.+?)(?=\n|$)/i)
    if (gradeMatch) {
      const rawGrade = gradeMatch[1].trim()
      const matched = findBestMatch(rawGrade, gradeOptions)
      parsed.grade = matched || rawGrade
    }

    // 내용 파싱 개선 - "내 용 :" 이후부터 "응대자 코코" 또는 "응대 완료" 전까지 전체
    const contentMatch = text.match(/내\s*용\s*[:：]\s*\n?([\s\S]+?)(?=응대자\s*코코|응대\s*완료|$)/i)
    if (contentMatch) {
      // 앞뒤 공백 제거하고 저장
      parsed.content = contentMatch[1].trim()
    }

    return parsed
  }

  const handleParseChannelTalk = () => {
    const parsed = parseChannelTalkText(channelTalkText)
    setFormData(parsed)
  }

  useEffect(() => {
    if (channelTalkText.trim()) {
      const parsed = parseChannelTalkText(channelTalkText)
      setFormData(parsed)
    }
  }, [channelTalkText])

  const generateChannelTalkText = () => {
    let datetime = ""
    if (formData.first_contact_datetime) {
      const dt = new Date(formData.first_contact_datetime)
      const month = dt.getMonth() + 1
      const day = dt.getDate()
      const weekday = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
      const hour = dt.getHours()
      const minute = dt.getMinutes()
      const period = hour < 12 ? "오전" : "오후"
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      datetime = `${month}월 ${day}일 (${weekday}) ${period} ${displayHour}시 ${minute}분`
    }

    return `[ 비즈니스 요청 📞 ]
명 칭 : ${formData.company_name || "미입력"}
업 종 : ${formData.industry || "미입력"}
경 로 : ${formData.inflow_source || "미입력"}
요 청 : ${formData.inquiry_channel || "미입력"}
응 대 : ${formData.assigned_to}
일 시 : ${datetime || "미입력"}
연락처 : ${formData.phone || "미입력"}
이메일 : ${formData.email || "미입력"}
니 즈 : ${formData.needs_summary || "미입력"}
등 급 : ${formData.grade || "미상"}
내 용 : 
${formData.content || "내용 없음"}
응대자 코코 기재 완료 💌 표시 : @김다예
응대 완료 📞 표시 : @${formData.assigned_to || '박상혁'}`
  }

  const generateChannelTalkHTML = () => {
    let datetime = ""
    if (formData.first_contact_datetime) {
      const dt = new Date(formData.first_contact_datetime)
      const month = dt.getMonth() + 1
      const day = dt.getDate()
      const weekday = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
      const hour = dt.getHours()
      const minute = dt.getMinutes()
      const period = hour < 12 ? "오전" : "오후"
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      datetime = `${month}월 ${day}일 (${weekday}) ${period} ${displayHour}시 ${minute}분`
    }

    return `[ 비즈니스 요청 📞 ]<br><strong>명 칭 :</strong> ${formData.company_name || "미입력"}<br><strong>업 종 :</strong> ${formData.industry || "미입력"}<br><strong>경 로 :</strong> ${formData.inflow_source || "미입력"}<br><strong>요 청 :</strong> ${formData.inquiry_channel || "미입력"}<br><strong>응 대 :</strong> ${formData.assigned_to}<br><strong>일 시 :</strong> ${datetime || "미입력"}<br><strong>연락처 :</strong> ${formData.phone || "미입력"}<br><strong>이메일 :</strong> ${formData.email || "미입력"}<br><strong>니 즈 :</strong> ${formData.needs_summary || "미입력"}<br><strong>등 급 :</strong> ${formData.grade || "미상"}<br><strong>내 용 :</strong><br>${formData.content || "내용 없음"}<br>응대자 코코 기재 완료 💌 표시 : @김다예<br>응대 완료 📞 표시 : @${formData.assigned_to || '박상혁'}`
  }

  const handleCopyToChannelTalk = async () => {
    const plainText = generateChannelTalkText()
    const htmlText = generateChannelTalkHTML()

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([htmlText], { type: "text/html" }),
        }),
      ])
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      await navigator.clipboard.writeText(plainText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleSubmit = async () => {
    if (!formData.company_name.trim()) {
      alert("상호명을 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient()

      const { data: newAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          company_name: formData.company_name,
          phone: formData.phone || null,
          email: formData.email || null,
          industry: formData.industry || "미확인",
        })
        .select()
        .single()

      if (accountError) throw accountError

      const { data: newDeal, error: dealError } = await supabase
        .from("deals")
        .insert({
          account_id: newAccount.id,
          deal_name: formData.company_name,
          stage: "S0_new_lead",
          assigned_to: formData.assigned_to || "미정",
          first_contact_date: formData.first_contact_datetime || new Date().toISOString(),
          inflow_source: formData.inflow_source || null,
          inquiry_channel: formData.inquiry_channel || null,
          needs_summary: formData.needs_summary || null,
          grade: formData.grade || null,
        })
        .select()
        .single()

      if (dealError) throw dealError

      if (formData.content) {
        await supabase.from("activities").insert({
          deal_id: newDeal.id,
          account_id: newAccount.id,
          activity_type: "통화",
          activity_date: formData.first_contact_datetime || new Date().toISOString(),
          assigned_to: formData.assigned_to || "미정",
          title: "고객 통화",
          content: formData.content,
        })
      }

      alert("CRM에 등록되었습니다!")
      onOpenChange(false)
      router.push(`/deals/${newDeal.id}`)
    } catch (error) {
      console.error("CRM 등록 실패:", error)
      alert("등록 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CRM 빠른 등록</DialogTitle>
          <DialogDescription>고객 정보를 입력하고 채널톡 형식으로 복사하거나 CRM에 바로 등록하세요.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">새로 작성</TabsTrigger>
            <TabsTrigger value="parse">채널톡에서 가져오기</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">상호명 *</Label>
                <Input
                  id="company_name"
                  placeholder="회사명 입력"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">업종</Label>
                <Input
                  id="industry"
                  placeholder="업종 입력"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inflow_source">유입 경로</Label>
                <Select
                  value={formData.inflow_source}
                  onValueChange={(value) => setFormData({ ...formData, inflow_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {inflowSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiry_channel">요청/문의 창구</Label>
                <Select
                  value={formData.inquiry_channel}
                  onValueChange={(value) => setFormData({ ...formData, inquiry_channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {inquiryChannels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assigned_to">응대자</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="오일환">오일환</SelectItem>
                    <SelectItem value="박상혁">박상혁</SelectItem>
                    <SelectItem value="윤경호">윤경호</SelectItem>
                    <SelectItem value="미정">미정</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="needs_summary">니즈</Label>
                <Select
                  value={formData.needs_summary}
                  onValueChange={(value) => setFormData({ ...formData, needs_summary: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {needsOptions.map((need) => (
                      <SelectItem key={need} value={need}>
                        {need}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">등급</Label>
                <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_contact_datetime">첫 문의 날짜/시간</Label>
              <Input
                id="first_contact_datetime"
                type="datetime-local"
                value={formData.first_contact_datetime}
                onChange={(e) => setFormData({ ...formData, first_contact_datetime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                placeholder="상담 내용을 입력하세요..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="parse" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channelTalkText">채널톡 텍스트 붙여넣기</Label>
              <Textarea
                id="channelTalkText"
                placeholder="채널톡 비즈니스 요청 텍스트를 붙여넣으세요..."
                value={channelTalkText}
                onChange={(e) => setChannelTalkText(e.target.value)}
                rows={12}
                className="resize-none font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              텍스트를 붙여넣으면 자동으로 파싱됩니다. 직접입력 탭에서 확인하세요.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopyToChannelTalk}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-transparent"
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                복사 완료!
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4 mr-2" />
                채널톡 형식 복사
              </>
            )}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting ? "등록 중..." : "CRM 등록"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
