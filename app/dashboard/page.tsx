"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CrmSidebar } from "@/components/crm-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Save,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
  Clock,
  Building2,
  Trash2
} from "lucide-react";

// 단계 정보 타입
interface StageInfo {
  key: string;
  label: string;
  minRate: number;
  maxRate: number;
}

// 단계별 적정 비율 설정
const STAGE_CONFIG: StageInfo[] = [
  { key: "S0", label: "S0_신규 유입", minRate: 8, maxRate: 12 },
  { key: "S1", label: "S1_유효 리드", minRate: 18, maxRate: 22 },
  { key: "S2", label: "S2_상담 완료", minRate: 15, maxRate: 18 },
  { key: "S3", label: "S3_제안 발송", minRate: 12, maxRate: 15 },
  { key: "S4", label: "S4_결정 대기", minRate: 8, maxRate: 12 },
  { key: "S5", label: "S5_계약완료", minRate: 5, maxRate: 8 },
  { key: "S6", label: "S6_종료", minRate: 15, maxRate: 20 },
];

// 단계 키와 DB stage 매핑 (영어 + 한글 값 모두 포함)
const STAGE_KEY_MAP: Record<string, string[]> = {
  S0: ["S0_new_lead", "S0_신규 유입"],
  S1: ["S1_qualified", "S1_유효 리드", "S1_유효리드"],
  S2: ["S2_contact", "S2_consultation", "S2_상담 완료"],
  S3: ["S3_proposal", "S3_제안 발송"],
  S4: ["S4_negotiation", "S4_decision", "S4_closed_won", "S4_결정 대기", "S4_협상"],
  S5: ["S5_contract", "S5_complete", "S5_계약완료", "S5_계약 완료"],
  S6: ["S6_closed", "S6_complete", "S6_종료"],
};

interface FeedbackHistory {
  id: string;
  stage: string;
  feedback: string;
  created_at: string;
}

interface Deal {
  id: string;
  deal_name: string | null;
  needs_summary: string | null;
  stage: string;
  amount_range: string | null;
  grade: string | null;
  priority: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [stageDeals, setStageDeals] = useState<Record<string, Deal[]>>({});
  const [feedbackHistories, setFeedbackHistories] = useState<Record<string, FeedbackHistory[]>>({});
  const [selectedStage, setSelectedStage] = useState<string>("S0");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<string>("");
  const [draftFeedbacks, setDraftFeedbacks] = useState<Record<string, string>>({}); // 단계별 임시 저장
  const [isSaving, setIsSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // 각 단계 카드 ref
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const supabase = createClient();
  
  // 단계 변경 핸들러
  const handleStageChange = (newStage: string) => {
    // 현재 단계의 입력 내용을 임시 저장
    if (editingFeedback.trim()) {
      setDraftFeedbacks(prev => ({
        ...prev,
        [selectedStage]: editingFeedback
      }));
    }
    
    // 같은 단계를 다시 클릭하면 목록 토글
    if (selectedStage === newStage) {
      setExpandedStage(expandedStage === newStage ? null : newStage);
      return;
    }
    
    // 새 단계로 변경
    setSelectedStage(newStage);
    setExpandedStage(newStage);
    
    // 새 단계의 임시 저장된 내용 불러오기 (없으면 빈 문자열)
    setEditingFeedback(draftFeedbacks[newStage] || "");
    
    // 해당 단계 카드로 스크롤
    setTimeout(() => {
      stageRefs.current[newStage]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 딜 데이터 조회
      const { data: deals, error: dealsError } = await supabase
        .from("deals")
        .select("id, deal_name, needs_summary, stage, amount_range, grade, priority");
      
      if (dealsError) {
        console.error("딜 데이터 로드 실패:", dealsError.message);
        throw dealsError;
      }

      // 단계별 카운트 및 딜 목록 계산
      const counts: Record<string, number> = {};
      const dealsByStage: Record<string, Deal[]> = {};
      let total = 0;
      
      STAGE_CONFIG.forEach(stage => {
        const stageKeys = STAGE_KEY_MAP[stage.key] || [];
        const stageDeals = deals?.filter(d => stageKeys.includes(d.stage)) || [];
        counts[stage.key] = stageDeals.length;
        dealsByStage[stage.key] = stageDeals;
        total += stageDeals.length;
      });
      
      setStageCounts(counts);
      setStageDeals(dealsByStage);
      setTotalCount(total);

      // 피드백 히스토리 조회 (테이블이 없어도 에러 무시)
      try {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("stage_feedbacks")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (feedbackError) {
          console.warn("피드백 테이블 조회 실패 (테이블이 없을 수 있음):", feedbackError.message);
        } else {
          // 단계별로 그룹화
          const historyMap: Record<string, FeedbackHistory[]> = {};
          STAGE_CONFIG.forEach(stage => {
            historyMap[stage.key] = feedbackData
              ?.filter(f => f.stage === stage.key)
              .slice(0, 3) || [];
          });
          setFeedbackHistories(historyMap);
        }
      } catch (feedbackErr) {
        console.warn("피드백 로드 스킵:", feedbackErr);
      }
      
    } catch (error: any) {
      console.error("데이터 로드 실패:", error?.message || error);
    }
  };

  const saveFeedback = async () => {
    if (!editingFeedback.trim()) {
      alert("피드백 내용을 입력해주세요.");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stage_feedbacks")
        .insert({
          stage: selectedStage,
          feedback: editingFeedback.trim(),
        });

      if (error) throw error;

      // 히스토리 다시 로드
      await loadData();
      setEditingFeedback("");
      // 해당 단계의 임시 저장도 초기화
      setDraftFeedbacks(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[selectedStage];
        return newDrafts;
      });
      alert("피드백이 저장되었습니다!");
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 피드백 히스토리 클릭 시 작성란에 불러오기
  const loadFeedbackToEditor = (feedback: string) => {
    setEditingFeedback(feedback);
  };

  // 피드백 삭제
  const deleteFeedback = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    try {
      const { error } = await supabase
        .from("stage_feedbacks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      // 히스토리 다시 로드
      await loadData();
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  // 비율 계산
  const getRate = (stageKey: string): number => {
    if (totalCount === 0) return 0;
    return (stageCounts[stageKey] || 0) / totalCount * 100;
  };

  // 상태 판단 (부족/적정/초과)
  const getStatus = (stageKey: string): { status: "low" | "normal" | "high"; message: string } => {
    const rate = getRate(stageKey);
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return { status: "normal", message: "정보 없음" };

    if (rate < config.minRate) {
      const diff = (config.minRate - rate).toFixed(1);
      return { status: "low", message: `적정 대비 -${diff}% 부족` };
    } else if (rate > config.maxRate) {
      const diff = (rate - config.maxRate).toFixed(1);
      return { status: "high", message: `적정 대비 +${diff}% 초과` };
    } else {
      return { status: "normal", message: "적정 범위 내" };
    }
  };

  // 상태에 따른 스타일
  const getStatusStyle = (status: "low" | "normal" | "high") => {
    switch (status) {
      case "low":
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-700",
          badge: "bg-blue-100 text-blue-700",
          icon: <TrendingDown className="h-4 w-4" />,
          iconColor: "text-blue-500"
        };
      case "high":
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-700",
          badge: "bg-red-100 text-red-700",
          icon: <TrendingUp className="h-4 w-4" />,
          iconColor: "text-red-500"
        };
      default:
        return {
          bg: "bg-green-50 border-green-200",
          text: "text-green-700",
          badge: "bg-green-100 text-green-700",
          icon: <CheckCircle2 className="h-4 w-4" />,
          iconColor: "text-green-500"
        };
    }
  };

  // 프로그레스 바 계산
  const getProgressWidth = (stageKey: string): number => {
    const rate = getRate(stageKey);
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return 0;
    
    const maxDisplay = config.maxRate * 1.5;
    return Math.min((rate / maxDisplay) * 100, 100);
  };

  // 적정 범위 위치 계산
  const getRangePosition = (stageKey: string): { left: number; width: number } => {
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return { left: 0, width: 0 };
    
    const maxDisplay = config.maxRate * 1.5;
    const left = (config.minRate / maxDisplay) * 100;
    const width = ((config.maxRate - config.minRate) / maxDisplay) * 100;
    
    return { left, width };
  };

  // 단계 확장 토글
  const toggleStageExpand = (stageKey: string) => {
    setExpandedStage(expandedStage === stageKey ? null : stageKey);
  };

  // 금액 범위 표시
  const formatAmountRange = (value: string | null) => {
    if (!value) return "-";
    return value;
  };

  return (
    <div className="flex min-h-screen">
      <CrmSidebar />
      
      <main className="flex-1 p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">단계별 현황 분석</h1>
              <p className="text-sm text-muted-foreground">
                전체 {totalCount}건 기준 · 단계를 클릭하면 딜 목록을 확인할 수 있습니다
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 왼쪽: 단계별 현황 */}
          <div className="xl:col-span-2 space-y-3">
            {STAGE_CONFIG.map((stage) => {
              const count = stageCounts[stage.key] || 0;
              const rate = getRate(stage.key);
              const { status, message } = getStatus(stage.key);
              const style = getStatusStyle(status);
              const progressWidth = getProgressWidth(stage.key);
              const range = getRangePosition(stage.key);
              const isSelected = selectedStage === stage.key;
              const isExpanded = expandedStage === stage.key;
              const deals = stageDeals[stage.key] || [];

              return (
                <div 
                  key={stage.key}
                  ref={(el) => { stageRefs.current[stage.key] = el; }}
                >
                  <Card
                    className={cn(
                      "transition-all duration-200 border-2",
                      isSelected 
                        ? "ring-2 ring-blue-500 border-blue-500" 
                        : style.bg,
                      "hover:shadow-md"
                    )}
                  >
                    <CardContent className="p-4">
                      {/* 메인 영역 - 클릭하면 피드백 선택 */}
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleStageChange(stage.key)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-lg">{stage.label}</span>
                            <Badge variant="secondary" className="text-base px-3 py-1">
                              {count}건
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold text-xl", style.text)}>
                              {rate.toFixed(1)}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              / {stage.minRate}~{stage.maxRate}%
                            </span>
                          </div>
                        </div>

                        {/* 프로그레스 바 */}
                        <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                          {/* 현재 값 바 (아래 레이어) */}
                          <div
                            className={cn(
                              "absolute h-full rounded-full transition-all duration-500 z-10",
                              status === "low" ? "bg-blue-500" :
                              status === "high" ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ width: `${progressWidth}%` }}
                          />
                          {/* 적정 범위 표시 (위 레이어 - 항상 보임) */}
                          <div
                            className="absolute h-full z-20"
                            style={{
                              left: `${range.left}%`,
                              width: `${range.width}%`,
                              backgroundColor: status === "high" 
                                ? 'rgba(251, 191, 36, 0.3)' // 초과: 노란색/주황색
                                : 'rgba(34, 197, 94, 0.25)' // 정상/부족: 초록색
                            }}
                          />
                          {/* 적정 범위 시작 마커 */}
                          <div 
                            className={cn(
                              "absolute h-full w-[2px] z-30",
                              status === "high" ? "bg-amber-500" : "bg-green-600"
                            )}
                            style={{ left: `${range.left}%` }}
                          />
                          {/* 적정 범위 끝 마커 */}
                          <div 
                            className={cn(
                              "absolute h-full w-[2px] z-30",
                              status === "high" ? "bg-amber-500" : "bg-green-600"
                            )}
                            style={{ left: `calc(${range.left + range.width}% - 2px)` }}
                          />
                        </div>

                        {/* 상태 메시지 */}
                        <div className="flex items-center justify-between mt-2">
                          <div className={cn("flex items-center gap-1", style.iconColor)}>
                            {style.icon}
                            <span className="text-sm font-medium">{message}</span>
                          </div>
                          {status !== "normal" && (
                            <AlertTriangle className={cn("h-4 w-4", style.iconColor)} />
                          )}
                        </div>
                      </div>

                      {/* 딜 목록 토글 버튼 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => toggleStageExpand(stage.key)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Building2 className="h-4 w-4" />
                          <span>이 단계의 거래처 목록 보기 ({count}건)</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 확장된 딜 목록 - 테이블 형식 */}
                  {isExpanded && deals.length > 0 && (
                    <Card className="mt-2 ml-4 border-l-4 border-l-blue-500">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-[140px]">상호명</TableHead>
                              <TableHead>니즈 축약</TableHead>
                              <TableHead className="w-[60px] text-center">우선권</TableHead>
                              <TableHead className="w-[60px] text-center">등급</TableHead>
                              <TableHead className="w-[120px] text-right">예상 금액</TableHead>
                              <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deals.map((deal) => (
                              <TableRow
                                key={deal.id}
                                onClick={() => router.push(`/deals/${deal.id}`)}
                                className="cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <TableCell className="font-medium">
                                  {deal.deal_name || "이름 없음"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {deal.needs_summary || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {deal.priority ? (
                                    <Badge variant="outline" className={cn(
                                      "text-xs",
                                      deal.priority === "P0" ? "bg-red-100 text-red-700" :
                                      deal.priority === "P1" ? "bg-orange-100 text-orange-700" :
                                      deal.priority === "P2" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-gray-100 text-gray-700"
                                    )}>
                                      {deal.priority}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {deal.grade ? (
                                    <Badge variant="outline" className="text-xs">
                                      {deal.grade}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {formatAmountRange(deal.amount_range)}
                                </TableCell>
                                <TableCell>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                  
                  {isExpanded && deals.length === 0 && (
                    <Card className="mt-2 ml-4 border-l-4 border-l-gray-300">
                      <CardContent className="p-4 text-center text-muted-foreground">
                        이 단계에 해당하는 거래처가 없습니다.
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>

          {/* 오른쪽: 피드백 메모 */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* 피드백 작성 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    {STAGE_CONFIG.find(s => s.key === selectedStage)?.label} 피드백
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    현재 상태에 대한 분석과 액션 아이템을 기록하세요
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={editingFeedback}
                    onChange={(e) => setEditingFeedback(e.target.value)}
                    placeholder="이 단계의 현황에 대한 피드백을 입력하세요..."
                    className="min-h-[150px] resize-none"
                  />
                  <Button 
                    onClick={saveFeedback} 
                    disabled={isSaving}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "저장 중..." : "피드백 저장"}
                  </Button>
                </CardContent>
              </Card>

              {/* 피드백 히스토리 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-5 w-5 text-gray-500" />
                      이전 피드백
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/feedback-history?stage=${selectedStage}`)}
                      className="text-xs"
                    >
                      전체보기
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {feedbackHistories[selectedStage]?.length > 0 ? (
                    <div className="space-y-3">
                      {feedbackHistories[selectedStage].map((history, index) => (
                        <div key={history.id}>
                          <div
                            onClick={() => loadFeedbackToEditor(history.feedback)}
                            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(history.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                              </div>
                              <button
                                onClick={(e) => deleteFeedback(history.id, e)}
                                className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-sm line-clamp-3 whitespace-pre-wrap">
                              {history.feedback}
                            </p>
                          </div>
                          {index < feedbackHistories[selectedStage].length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      아직 작성된 피드백이 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">주의 필요 단계</p>
                  <p className="text-2xl font-bold text-red-600">
                    {STAGE_CONFIG.filter(s => getStatus(s.key).status !== "normal").length}개
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">가장 큰 병목</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      let maxDiff = 0;
                      let maxStage = "-";
                      STAGE_CONFIG.forEach(s => {
                        const rate = getRate(s.key);
                        if (rate > s.maxRate) {
                          const diff = rate - s.maxRate;
                          if (diff > maxDiff) {
                            maxDiff = diff;
                            maxStage = s.key;
                          }
                        }
                      });
                      return maxStage;
                    })()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">적정 범위 단계</p>
                  <p className="text-2xl font-bold text-green-600">
                    {STAGE_CONFIG.filter(s => getStatus(s.key).status === "normal").length}개
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
