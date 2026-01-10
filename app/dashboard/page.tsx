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
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trash2,
  Target,
  DollarSign,
  ArrowRight,
  Lightbulb,
  PieChart
} from "lucide-react";

// ===== 공통 타입 =====
interface Deal {
  id: string;
  deal_name: string | null;
  needs_summary: string | null;
  stage: string;
  amount_range: string | null;
  grade: string | null;
  priority: string | null;
}

// ===== 파이프라인 관련 =====
const PIPELINE_DUMMY_DATA = {
  totalPipeline: 206000000,
  targetPipeline: 1000000000,
  stages: [
    { id: "S3", name: "제안발송", count: 10, amount: 78600000, target: 666000000, color: "bg-amber-500" },
    { id: "S4", name: "결정대기", count: 23, amount: 127400000, target: 333000000, color: "bg-blue-500" },
    { id: "S5", name: "계약완료", count: 3, amount: 100000000, target: 100000000, color: "bg-green-500" },
  ],
  serviceTypes: [
    { name: "마케팅", amount: 48100000, target: 300000000, color: "bg-purple-500" },
    { name: "홈페이지", amount: 33500000, target: 400000000, color: "bg-cyan-500" },
    { name: "ERP/커스텀", amount: 124400000, target: 300000000, color: "bg-orange-500" },
  ],
  conversions: [
    { from: "S3", to: "S5", rate: 10, currentAmount: 78600000 },
    { from: "S4", to: "S5", rate: 20, currentAmount: 127400000 },
  ],
  targetRevenue: 100000000,
  insights: [
    { type: "warning", message: "S3 파이프라인이 목표 대비 8.5배 부족합니다" },
    { type: "tip", message: "ERP/커스텀 비중을 높여 딜 평균 금액 증가 필요" },
    { type: "opportunity", message: "S4→S5 전환율 20%→30% 개선 시 +12,700,000원 추가 가능" },
  ]
};

function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

// ===== 단계별 현황 분석 관련 =====
interface StageInfo {
  key: string;
  label: string;
  minRate: number;
  maxRate: number;
}

const STAGE_CONFIG: StageInfo[] = [
  { key: "S0", label: "S0_신규 유입", minRate: 8, maxRate: 12 },
  { key: "S1", label: "S1_유효 리드", minRate: 18, maxRate: 22 },
  { key: "S2", label: "S2_상담 완료", minRate: 15, maxRate: 18 },
  { key: "S3", label: "S3_제안 발송", minRate: 12, maxRate: 15 },
  { key: "S4", label: "S4_결정 대기", minRate: 8, maxRate: 12 },
  { key: "S5", label: "S5_계약완료", minRate: 5, maxRate: 8 },
  { key: "S6", label: "S6_종료", minRate: 15, maxRate: 20 },
];

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

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pipeline");
  
  // 단계별 현황 분석 상태
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [stageDeals, setStageDeals] = useState<Record<string, Deal[]>>({});
  const [feedbackHistories, setFeedbackHistories] = useState<Record<string, FeedbackHistory[]>>({});
  const [selectedStage, setSelectedStage] = useState<string>("S0");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<string>("");
  const [draftFeedbacks, setDraftFeedbacks] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const supabase = createClient();

  // ===== 파이프라인 탭 컴포넌트 =====
  const PipelineTab = () => {
    const data = PIPELINE_DUMMY_DATA;
    const totalPercentage = (data.totalPipeline / data.targetPipeline) * 100;
    const expectedRevenue = data.conversions.reduce((sum, conv) => {
      return sum + (conv.currentAmount * conv.rate / 100);
    }, 0);
    const revenuePercentage = (expectedRevenue / data.targetRevenue) * 100;

    return (
      <div className="space-y-6">
        {/* 기간 선택 */}
        <div className="flex justify-end">
          <Select defaultValue="2025-01">
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">2025년 1월</SelectItem>
              <SelectItem value="2024-12">2024년 12월</SelectItem>
              <SelectItem value="2024-11">2024년 11월</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 전체 파이프라인 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              전체 파이프라인 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">현재 파이프라인</span>
                <span className="font-bold text-lg">
                  {formatWon(data.totalPipeline)} / {formatWon(data.targetPipeline)}
                </span>
              </div>
              <div className="relative">
                <Progress value={totalPercentage} className="h-4" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {totalPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                목표 달성까지 {formatWon(data.targetPipeline - data.totalPipeline)} 필요
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 단계별 파이프라인 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.stages.map((stage) => {
            const percentage = (stage.amount / stage.target) * 100;
            return (
              <Card key={stage.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${stage.color}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{stage.id}</Badge>
                      {stage.name}
                    </span>
                    <span className="text-2xl font-bold">{stage.count}건</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <p className="text-xl font-bold">{formatWon(stage.amount)}</p>
                    <p className="text-xs text-muted-foreground">목표: {formatWon(stage.target)}</p>
                  </div>
                  <div className="space-y-1">
                    <Progress value={Math.min(percentage, 100)} className="h-2" />
                    <p className="text-xs text-right text-muted-foreground">{percentage.toFixed(1)}% 달성</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 서비스별 파이프라인 & 전환율/예상매출 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 서비스별 파이프라인 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                서비스별 파이프라인 (S3+S4)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.serviceTypes.map((service) => {
                const percentage = (service.amount / service.target) * 100;
                return (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${service.color}`} />
                        {service.name}
                      </span>
                      <span className="font-medium">
                        {formatWon(service.amount)}
                        <span className="text-muted-foreground text-xs ml-1">/ {formatWon(service.target)}</span>
                      </span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 전환율 & 예상 매출 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                전환율 & 예상 매출
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.conversions.map((conv, idx) => {
                const expected = conv.currentAmount * conv.rate / 100;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{conv.from}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="font-mono">{conv.to}</Badge>
                      <span className="text-sm font-medium">({conv.rate}%)</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{formatWon(conv.currentAmount)} × {conv.rate}%</p>
                      <p className="font-bold text-green-600">= {formatWon(expected)} 예상</p>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">총 예상 매출</span>
                  <span className="text-xl font-bold">{formatWon(expectedRevenue)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>목표 매출</span>
                  <span>{formatWon(data.targetRevenue)}</span>
                </div>
                <Progress value={Math.min(revenuePercentage, 100)} className="h-3" />
                <p className="text-xs text-right mt-1 text-muted-foreground">달성률: {revenuePercentage.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 인사이트 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              인사이트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, idx) => (
                <div 
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.type === "warning" 
                      ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900" 
                      : insight.type === "tip"
                      ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900"
                      : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                  }`}
                >
                  {insight.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  ) : insight.type === "tip" ? (
                    <Lightbulb className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm">{insight.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ===== 단계별 현황 분석 로직 =====
  const handleStageChange = (newStage: string) => {
    if (editingFeedback.trim()) {
      setDraftFeedbacks(prev => ({ ...prev, [selectedStage]: editingFeedback }));
    }
    
    if (selectedStage === newStage) {
      setExpandedStage(expandedStage === newStage ? null : newStage);
      return;
    }
    
    setSelectedStage(newStage);
    setExpandedStage(newStage);
    setEditingFeedback(draftFeedbacks[newStage] || "");
    
    setTimeout(() => {
      stageRefs.current[newStage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: deals, error: dealsError } = await supabase
        .from("deals")
        .select("id, deal_name, needs_summary, stage, amount_range, grade, priority");
      
      if (dealsError) throw dealsError;

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

      try {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("stage_feedbacks")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!feedbackError) {
          const historyMap: Record<string, FeedbackHistory[]> = {};
          STAGE_CONFIG.forEach(stage => {
            historyMap[stage.key] = feedbackData?.filter(f => f.stage === stage.key).slice(0, 3) || [];
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
        .insert({ stage: selectedStage, feedback: editingFeedback.trim() });

      if (error) throw error;

      await loadData();
      setEditingFeedback("");
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

  const loadFeedbackToEditor = (feedback: string) => setEditingFeedback(feedback);

  const deleteFeedback = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    try {
      const { error } = await supabase.from("stage_feedbacks").delete().eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const getRate = (stageKey: string): number => {
    if (totalCount === 0) return 0;
    return (stageCounts[stageKey] || 0) / totalCount * 100;
  };

  const getStatus = (stageKey: string): { status: "low" | "normal" | "high"; message: string } => {
    const rate = getRate(stageKey);
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return { status: "normal", message: "정보 없음" };

    if (rate < config.minRate) {
      return { status: "low", message: `적정 대비 -${(config.minRate - rate).toFixed(1)}% 부족` };
    } else if (rate > config.maxRate) {
      return { status: "high", message: `적정 대비 +${(rate - config.maxRate).toFixed(1)}% 초과` };
    }
    return { status: "normal", message: "적정 범위 내" };
  };

  const getStatusStyle = (status: "low" | "normal" | "high") => {
    switch (status) {
      case "low":
        return { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700", icon: <TrendingDown className="h-4 w-4" />, iconColor: "text-blue-500" };
      case "high":
        return { bg: "bg-red-50 border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700", icon: <TrendingUp className="h-4 w-4" />, iconColor: "text-red-500" };
      default:
        return { bg: "bg-green-50 border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-4 w-4" />, iconColor: "text-green-500" };
    }
  };

  const getProgressWidth = (stageKey: string): number => {
    const rate = getRate(stageKey);
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return 0;
    return Math.min((rate / (config.maxRate * 1.5)) * 100, 100);
  };

  const getRangePosition = (stageKey: string): { left: number; width: number } => {
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return { left: 0, width: 0 };
    const maxDisplay = config.maxRate * 1.5;
    return { left: (config.minRate / maxDisplay) * 100, width: ((config.maxRate - config.minRate) / maxDisplay) * 100 };
  };

  const toggleStageExpand = (stageKey: string) => {
    setExpandedStage(expandedStage === stageKey ? null : stageKey);
  };

  const formatAmountRange = (value: string | null) => value || "-";

  // ===== 단계별 현황 분석 탭 컴포넌트 =====
  const StageAnalysisTab = () => (
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
            <div key={stage.key} ref={(el) => { stageRefs.current[stage.key] = el; }}>
              <Card className={cn("transition-all duration-200 border-2", isSelected ? "ring-2 ring-blue-500 border-blue-500" : style.bg, "hover:shadow-md")}>
                <CardContent className="p-4">
                  <div className="cursor-pointer" onClick={() => handleStageChange(stage.key)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{stage.label}</span>
                        <Badge variant="secondary" className="text-base px-3 py-1">{count}건</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-xl", style.text)}>{rate.toFixed(1)}%</span>
                        <span className="text-sm text-muted-foreground">/ {stage.minRate}~{stage.maxRate}%</span>
                      </div>
                    </div>

                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("absolute h-full rounded-full transition-all duration-500 z-10", status === "low" ? "bg-blue-500" : status === "high" ? "bg-red-500" : "bg-green-500")} style={{ width: `${progressWidth}%` }} />
                      <div className="absolute h-full z-20" style={{ left: `${range.left}%`, width: `${range.width}%`, backgroundColor: status === "high" ? 'rgba(251, 191, 36, 0.3)' : 'rgba(34, 197, 94, 0.25)' }} />
                      <div className={cn("absolute h-full w-[2px] z-30", status === "high" ? "bg-amber-500" : "bg-green-600")} style={{ left: `${range.left}%` }} />
                      <div className={cn("absolute h-full w-[2px] z-30", status === "high" ? "bg-amber-500" : "bg-green-600")} style={{ left: `calc(${range.left + range.width}% - 2px)` }} />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className={cn("flex items-center gap-1", style.iconColor)}>
                        {style.icon}
                        <span className="text-sm font-medium">{message}</span>
                      </div>
                      {status !== "normal" && <AlertTriangle className={cn("h-4 w-4", style.iconColor)} />}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <button onClick={() => toggleStageExpand(stage.key)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Building2 className="h-4 w-4" />
                      <span>이 단계의 거래처 목록 보기 ({count}건)</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

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
                          <TableRow key={deal.id} onClick={() => router.push(`/deals/${deal.id}`)} className="cursor-pointer hover:bg-gray-100 transition-colors">
                            <TableCell className="font-medium">{deal.deal_name || "이름 없음"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{deal.needs_summary || "-"}</TableCell>
                            <TableCell className="text-center">
                              {deal.priority ? (
                                <Badge variant="outline" className={cn("text-xs", deal.priority === "P0" ? "bg-red-100 text-red-700" : deal.priority === "P1" ? "bg-orange-100 text-orange-700" : deal.priority === "P2" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700")}>{deal.priority}</Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-center">{deal.grade ? <Badge variant="outline" className="text-xs">{deal.grade}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{formatAmountRange(deal.amount_range)}</TableCell>
                            <TableCell><ExternalLink className="h-4 w-4 text-muted-foreground" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              
              {isExpanded && deals.length === 0 && (
                <Card className="mt-2 ml-4 border-l-4 border-l-gray-300">
                  <CardContent className="p-4 text-center text-muted-foreground">이 단계에 해당하는 거래처가 없습니다.</CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>

      {/* 오른쪽: 피드백 메모 */}
      <div className="xl:col-span-1">
        <div className="sticky top-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                {STAGE_CONFIG.find(s => s.key === selectedStage)?.label} 피드백
              </CardTitle>
              <p className="text-sm text-muted-foreground">현재 상태에 대한 분석과 액션 아이템을 기록하세요</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={editingFeedback} onChange={(e) => setEditingFeedback(e.target.value)} placeholder="이 단계의 현황에 대한 피드백을 입력하세요..." className="min-h-[150px] resize-none" />
              <Button onClick={saveFeedback} disabled={isSaving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "저장 중..." : "피드백 저장"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-gray-500" />
                  이전 피드백
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/feedback-history?stage=${selectedStage}`)} className="text-xs">전체보기</Button>
              </div>
            </CardHeader>
            <CardContent>
              {feedbackHistories[selectedStage]?.length > 0 ? (
                <div className="space-y-3">
                  {feedbackHistories[selectedStage].map((history, index) => (
                    <div key={history.id}>
                      <div onClick={() => loadFeedbackToEditor(history.feedback)} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(history.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </div>
                          <button onClick={(e) => deleteFeedback(history.id, e)} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm line-clamp-3 whitespace-pre-wrap">{history.feedback}</p>
                      </div>
                      {index < feedbackHistories[selectedStage].length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">아직 작성된 피드백이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <CrmSidebar />
      
      <main className="flex-1 p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">대시보드</h1>
            <p className="text-sm text-muted-foreground">영업 현황을 한눈에 확인하세요</p>
          </div>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              파이프라인
            </TabsTrigger>
            <TabsTrigger value="stage-analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              단계별 현황 분석
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pipeline" className="mt-6">
            <PipelineTab />
          </TabsContent>
          
          <TabsContent value="stage-analysis" className="mt-6">
            <StageAnalysisTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
