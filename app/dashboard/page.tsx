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
  PieChart,
  LayoutDashboard
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
// 목표 금액 설정 (나중에 관리자에서 수정 가능하게 할 수 있음)
const PIPELINE_TARGETS = {
  total: 1000000000,
  S3: 666000000,
  S4: 333000000,
  S5: 100000000,
  services: {
    "마케팅": 300000000,
    "홈페이지": 400000000,
    "ERP/커스텀": 300000000,
    "미분류": 0, // 미분류는 목표 없음
  }
};

// amount_range 문자열에서 금액 추출 (예: "1,000만원 ~ 3,000만원" -> 2000만원 평균)
function parseAmountRange(amountRange: string | null): number {
  if (!amountRange) return 0;
  
  // 숫자와 단위 추출
  const matches = amountRange.match(/[\d,]+/g);
  if (!matches || matches.length === 0) return 0;
  
  // 단위 확인 (만원, 억원 등)
  const isManwon = amountRange.includes("만");
  const isEok = amountRange.includes("억");
  
  let multiplier = 1;
  if (isManwon) multiplier = 10000;
  if (isEok) multiplier = 100000000;
  
  // 숫자 파싱
  const numbers = matches.map(m => parseInt(m.replace(/,/g, ""), 10));
  
  if (numbers.length >= 2) {
    // 범위인 경우 평균값 사용
    return ((numbers[0] + numbers[1]) / 2) * multiplier;
  }
  return numbers[0] * multiplier;
}

interface ServiceTypeMapping {
  [needValue: string]: string;
}

interface PipelineData {
  totalPipeline: number;
  targetPipeline: number;
  stages: { id: string; name: string; count: number; amount: number; target: number; color: string }[];
  serviceByStage: {
    S3: { name: string; amount: number; target: number; color: string }[];
    S4: { name: string; amount: number; target: number; color: string }[];
    total: { name: string; amount: number; target: number; color: string }[];
  };
  insights: { type: string; message: string }[];
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

// ===== 단계별 현황 분석 관련 =====
interface StageInfo {
  key: string;
  label: string;
  definition: string;
  targetMinRate: number;
  targetMaxRate: number;
}

// S0~S4: 핵심 파이프라인 (합산 = 100%)
const STAGE_CONFIG: StageInfo[] = [
  { key: "S0", label: "S0_신규 유입", definition: "마케팅/아웃바운드 인입", targetMinRate: 13, targetMaxRate: 15 },
  { key: "S1", label: "S1_유효 리드", definition: "자격 검증(SQL) 완료", targetMinRate: 20, targetMaxRate: 22 },
  { key: "S2", label: "S2_상담 완료", definition: "미팅 및 니즈 파악 완료", targetMinRate: 16, targetMaxRate: 18 },
  { key: "S3", label: "S3_제안 발송", definition: "맞춤형 제안서 전달", targetMinRate: 13, targetMaxRate: 15 },
  { key: "S4", label: "S4_결정 대기", definition: "내부 검토 및 최종 협상", targetMinRate: 28, targetMaxRate: 30 },
];

// S5, S6: 별도 표기 (전체 대비 비율)
const EXTRA_STAGES = [
  { key: "S5", label: "S5_계약완료", definition: "최종 클로징" },
  { key: "S6", label: "S6_종료", definition: "영업 종료" },
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
  const [totalCount, setTotalCount] = useState(0); // S0~S4 합계
  const [allDealsCount, setAllDealsCount] = useState(0); // S0~S6 전체 합계
  
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const supabase = createClient();

  // ===== 파이프라인 탭 컴포넌트 =====
  // 단계별 색상 설정 (차트용)
  const STAGE_COLORS: Record<string, string> = {
    S0: "#94a3b8", // slate
    S1: "#3b82f6", // blue
    S2: "#8b5cf6", // violet
    S3: "#f59e0b", // amber
    S4: "#a855f7", // purple
    S5: "#22c55e", // green
    S6: "#ef4444", // red
    S7: "#06b6d4", // cyan
  };

  const STAGE_LABELS: Record<string, string> = {
    S0: "S0 신규유입",
    S1: "S1 유효리드",
    S2: "S2 상담완료",
    S3: "S3 제안발송",
    S4: "S4 결정대기",
    S5: "S5 계약완료",
    S6: "S6 종료",
    S7: "S7 재접촉",
  };

  // 단계 코드를 S0~S7로 정규화
  const normalizeStageKey = (stage: string): string => {
    if (stage.startsWith("S0")) return "S0";
    if (stage.startsWith("S1")) return "S1";
    if (stage.startsWith("S2")) return "S2";
    if (stage.startsWith("S3")) return "S3";
    if (stage.startsWith("S4")) return "S4";
    if (stage.startsWith("S5")) return "S5";
    if (stage.startsWith("S6")) return "S6";
    if (stage.startsWith("S7")) return "S7";
    return stage;
  };

  const PipelineTab = () => {
    const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
    const [serviceTypeMap, setServiceTypeMap] = useState<ServiceTypeMapping>({});
    const [showInsight, setShowInsight] = useState(false);
    const [expandedService, setExpandedService] = useState<string | null>(null);
    const [serviceDeals, setServiceDeals] = useState<Record<string, Deal[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    // 스냅샷 추이 상태
    const [snapshotData, setSnapshotData] = useState<any[]>([]);
    const [trendRange, setTrendRange] = useState("30"); // 일 수
    const [trendUnit, setTrendUnit] = useState<"daily" | "weekly" | "monthly">("daily");
    const [snapshotLoading, setSnapshotLoading] = useState(false);

    // 스냅샷 데이터 로드
    const loadSnapshotData = async () => {
      setSnapshotLoading(true);
      try {
        const daysAgo = parseInt(trendRange);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - daysAgo);
        const fromStr = fromDate.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("pipeline_snapshots")
          .select("snapshot_date, stage, deal_count")
          .gte("snapshot_date", fromStr)
          .order("snapshot_date", { ascending: true });

        if (error) {
          console.error("스냅샷 데이터 로드 오류:", error);
          setSnapshotData([]);
          return;
        }

        if (!data || data.length === 0) {
          setSnapshotData([]);
          return;
        }

        // 날짜별로 그룹핑 + 단계별 정규화
        const dateMap: Record<string, Record<string, number>> = {};
        data.forEach((row: any) => {
          const date = row.snapshot_date;
          const stageKey = normalizeStageKey(row.stage);
          if (!dateMap[date]) {
            dateMap[date] = { S0: 0, S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0, S7: 0 };
          }
          dateMap[date][stageKey] = (dateMap[date][stageKey] || 0) + row.deal_count;
        });

        // 집계 단위에 따라 변환
        let chartData: any[] = [];

        if (trendUnit === "daily") {
          chartData = Object.entries(dateMap).map(([date, stages]) => ({
            date: format(new Date(date + "T00:00:00"), "MM/dd"),
            fullDate: date,
            ...stages,
            total: Object.values(stages).reduce((a, b) => a + b, 0),
          }));
        } else if (trendUnit === "weekly") {
          // 주간 집계: 주의 마지막 날짜 기준
          const weekMap: Record<string, { date: string; stages: Record<string, number> }> = {};
          Object.entries(dateMap).forEach(([date, stages]) => {
            const d = new Date(date + "T00:00:00");
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay() + 1); // 월요일 기준
            const weekKey = weekStart.toISOString().split("T")[0];
            // 각 주의 가장 마지막 스냅샷을 사용
            if (!weekMap[weekKey] || date > weekMap[weekKey].date) {
              weekMap[weekKey] = { date, stages };
            }
          });
          chartData = Object.entries(weekMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([weekKey, { date, stages }]) => ({
              date: format(new Date(weekKey + "T00:00:00"), "MM/dd") + "~",
              fullDate: date,
              ...stages,
              total: Object.values(stages).reduce((a, b) => a + b, 0),
            }));
        } else {
          // 월간 집계: 월의 마지막 스냅샷 기준
          const monthMap: Record<string, { date: string; stages: Record<string, number> }> = {};
          Object.entries(dateMap).forEach(([date, stages]) => {
            const monthKey = date.substring(0, 7); // YYYY-MM
            if (!monthMap[monthKey] || date > monthMap[monthKey].date) {
              monthMap[monthKey] = { date, stages };
            }
          });
          chartData = Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([monthKey, { date, stages }]) => ({
              date: format(new Date(monthKey + "-01T00:00:00"), "yyyy.MM"),
              fullDate: date,
              ...stages,
              total: Object.values(stages).reduce((a, b) => a + b, 0),
            }));
        }

        setSnapshotData(chartData);
      } catch (err) {
        console.error("스냅샷 로드 에러:", err);
        setSnapshotData([]);
      } finally {
        setSnapshotLoading(false);
      }
    };

    // 파이프라인 데이터 로드
    useEffect(() => {
      loadPipelineData();
    }, []);

    // 스냅샷 데이터 로드
    useEffect(() => {
      loadSnapshotData();
    }, [trendRange, trendUnit]);
    
    const loadPipelineData = async () => {
      setIsLoading(true);
      try {
        // 1. 니즈 축약의 서비스 타입 매핑 가져오기
        const { data: settingsData } = await supabase
          .from("settings")
          .select("value, service_type")
          .eq("category", "needs");
        
        const typeMap: ServiceTypeMapping = {};
        settingsData?.forEach((s: any) => {
          if (s.service_type) {
            typeMap[s.value] = s.service_type;
          }
        });
        setServiceTypeMap(typeMap);
        
        // 2. S3, S4, S5 단계 딜 가져오기
        const stageFilters = [
          "S3_proposal", "S3_제안 발송",
          "S4_negotiation", "S4_decision", "S4_결정 대기", "S4_협상",
          "S5_contract", "S5_complete", "S5_계약완료", "S5_계약 완료"
        ];
        
        const { data: dealsData } = await supabase
          .from("deals")
          .select("id, deal_name, needs_summary, stage, amount_range")
          .in("stage", stageFilters);
        
        // 3. 단계별, 서비스별 금액 집계
        const stageAmounts: Record<string, { count: number; amount: number }> = {
          S3: { count: 0, amount: 0 },
          S4: { count: 0, amount: 0 },
          S5: { count: 0, amount: 0 },
        };
        
        const serviceAmounts: Record<string, Record<string, number>> = {
          S3: { "마케팅": 0, "홈페이지": 0, "ERP/커스텀": 0, "미분류": 0 },
          S4: { "마케팅": 0, "홈페이지": 0, "ERP/커스텀": 0, "미분류": 0 },
          total: { "마케팅": 0, "홈페이지": 0, "ERP/커스텀": 0, "미분류": 0 },
        };
        
        dealsData?.forEach((deal: any) => {
          const amount = parseAmountRange(deal.amount_range);
          const stageKey = deal.stage?.startsWith("S3") ? "S3" : 
                          deal.stage?.startsWith("S4") ? "S4" : "S5";
          
          // 단계별 집계
          stageAmounts[stageKey].count++;
          stageAmounts[stageKey].amount += amount;
          
          // 서비스 타입 결정 (needs_summary의 첫 번째 니즈 기준)
          let serviceType = "미분류"; // 기본값을 미분류로 변경
          if (deal.needs_summary) {
            const needs = deal.needs_summary.split(",");
            for (const need of needs) {
              if (typeMap[need.trim()]) {
                serviceType = typeMap[need.trim()];
                break;
              }
            }
          }
          
          // S3, S4만 서비스별 파이프라인에 포함
          if (stageKey === "S3" || stageKey === "S4") {
            serviceAmounts[stageKey][serviceType] += amount;
            serviceAmounts.total[serviceType] += amount;
          }
        });
        
        // 4. 인사이트 생성
        const insights: { type: string; message: string }[] = [];
        
        const totalPipeline = stageAmounts.S3.amount + stageAmounts.S4.amount;
        const s3Ratio = PIPELINE_TARGETS.S3 / stageAmounts.S3.amount;
        const s4Ratio = PIPELINE_TARGETS.S4 / stageAmounts.S4.amount;
        
        if (stageAmounts.S3.amount > 0 && s3Ratio > 2) {
          insights.push({
            type: "warning",
            message: `S3 파이프라인이 목표 대비 ${s3Ratio.toFixed(1)}배 부족합니다`
          });
        }
        
        // 서비스별 비중 분석
        const maxService = Object.entries(serviceAmounts.total).sort((a, b) => b[1] - a[1])[0];
        if (maxService && maxService[1] > 0) {
          const ratio = (maxService[1] / totalPipeline * 100).toFixed(0);
          insights.push({
            type: "tip",
            message: `${maxService[0]} 비중이 ${ratio}%로 가장 높습니다`
          });
        }
        
        // 예상 매출 계산
        const expectedRevenue = stageAmounts.S3.amount * 0.1 + stageAmounts.S4.amount * 0.2;
        insights.push({
          type: "opportunity",
          message: `현재 파이프라인 기준 예상 매출: ${formatWon(expectedRevenue)}`
        });
        
        // 5. 파이프라인 데이터 설정
        setPipelineData({
          totalPipeline,
          targetPipeline: PIPELINE_TARGETS.total,
          stages: [
            { id: "S3", name: "제안발송", count: stageAmounts.S3.count, amount: stageAmounts.S3.amount, target: PIPELINE_TARGETS.S3, color: "bg-amber-500" },
            { id: "S4", name: "결정대기", count: stageAmounts.S4.count, amount: stageAmounts.S4.amount, target: PIPELINE_TARGETS.S4, color: "bg-purple-500" },
            { id: "S5", name: "계약완료", count: stageAmounts.S5.count, amount: stageAmounts.S5.amount, target: PIPELINE_TARGETS.S5, color: "bg-green-500" },
          ],
          serviceByStage: {
            S3: [
              { name: "마케팅", amount: serviceAmounts.S3["마케팅"], target: PIPELINE_TARGETS.services["마케팅"] / 2, color: "bg-purple-500" },
              { name: "홈페이지", amount: serviceAmounts.S3["홈페이지"], target: PIPELINE_TARGETS.services["홈페이지"] / 2, color: "bg-cyan-500" },
              { name: "ERP/커스텀", amount: serviceAmounts.S3["ERP/커스텀"], target: PIPELINE_TARGETS.services["ERP/커스텀"] / 2, color: "bg-orange-500" },
              { name: "미분류", amount: serviceAmounts.S3["미분류"], target: 0, color: "bg-gray-400" },
            ],
            S4: [
              { name: "마케팅", amount: serviceAmounts.S4["마케팅"], target: PIPELINE_TARGETS.services["마케팅"] / 2, color: "bg-purple-500" },
              { name: "홈페이지", amount: serviceAmounts.S4["홈페이지"], target: PIPELINE_TARGETS.services["홈페이지"] / 2, color: "bg-cyan-500" },
              { name: "ERP/커스텀", amount: serviceAmounts.S4["ERP/커스텀"], target: PIPELINE_TARGETS.services["ERP/커스텀"] / 2, color: "bg-orange-500" },
              { name: "미분류", amount: serviceAmounts.S4["미분류"], target: 0, color: "bg-gray-400" },
            ],
            total: [
              { name: "마케팅", amount: serviceAmounts.total["마케팅"], target: PIPELINE_TARGETS.services["마케팅"], color: "bg-purple-500" },
              { name: "홈페이지", amount: serviceAmounts.total["홈페이지"], target: PIPELINE_TARGETS.services["홈페이지"], color: "bg-cyan-500" },
              { name: "ERP/커스텀", amount: serviceAmounts.total["ERP/커스텀"], target: PIPELINE_TARGETS.services["ERP/커스텀"], color: "bg-orange-500" },
              { name: "미분류", amount: serviceAmounts.total["미분류"], target: 0, color: "bg-gray-400" },
            ],
          },
          insights,
        });
      } catch (error) {
        console.error("파이프라인 데이터 로드 오류:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // 서비스별 딜 목록 로드
    const loadServiceDeals = async (serviceName: string, stageType: "S3" | "S4" | "total") => {
      const cacheKey = `${stageType}_${serviceName}`;
      
      if (expandedService === cacheKey) {
        setExpandedService(null);
        return;
      }
      
      if (serviceDeals[cacheKey]) {
        setExpandedService(cacheKey);
        return;
      }
      
      // 단계에 따라 다른 stage 필터링
      let stageFilter: string[] = [];
      if (stageType === "S3") {
        stageFilter = ["S3_proposal", "S3_제안 발송"];
      } else if (stageType === "S4") {
        stageFilter = ["S4_negotiation", "S4_decision", "S4_결정 대기", "S4_협상"];
      } else {
        stageFilter = ["S3_proposal", "S3_제안 발송", "S4_negotiation", "S4_decision", "S4_결정 대기", "S4_협상"];
      }
      
      const { data: deals, error } = await supabase
        .from("deals")
        .select("id, deal_name, needs_summary, stage, amount_range, grade, priority")
        .in("stage", stageFilter);
      
      if (!error && deals) {
        // 서비스 타입으로 필터링
        const filteredDeals = deals.filter((deal: any) => {
          // 니즈가 없으면 미분류
          if (!deal.needs_summary) return serviceName === "미분류";
          
          const needs = deal.needs_summary.split(",");
          let foundType: string | null = null;
          
          for (const need of needs) {
            const type = serviceTypeMap[need.trim()];
            if (type) {
              foundType = type;
              break;
            }
          }
          
          // 매핑된 타입이 없으면 미분류
          if (!foundType) return serviceName === "미분류";
          
          return foundType === serviceName;
        });
        setServiceDeals(prev => ({ ...prev, [cacheKey]: filteredDeals }));
      }
      setExpandedService(cacheKey);
    };
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">파이프라인 데이터 로딩 중...</div>
        </div>
      );
    }
    
    if (!pipelineData) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">데이터를 불러올 수 없습니다.</div>
        </div>
      );
    }
    
    const data = pipelineData;
    const totalPercentage = (data.totalPipeline / data.targetPipeline) * 100;

    return (
      <div className="space-y-6">
        {/* 기간 선택 + 인사이트 버튼 */}
        <div className="flex justify-between items-center">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {/* 인사이트 버튼 */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  showInsight && "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-700"
                )}
                onClick={() => setShowInsight(!showInsight)}
              >
                <Lightbulb className={cn("h-4 w-4", showInsight ? "text-yellow-500" : "text-muted-foreground")} />
                인사이트
              </Button>
              
              {/* 인사이트 말풍선 */}
              {showInsight && (
                <div className="absolute right-0 top-full mt-2 w-96 z-50">
                  <div className="relative bg-background border rounded-lg shadow-lg p-4">
                    {/* 말풍선 화살표 */}
                    <div className="absolute -top-2 right-6 w-4 h-4 bg-background border-l border-t rounded-tl rotate-45" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        인사이트
                      </div>
                      {data.insights.map((insight, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-start gap-3 p-3 rounded-lg ${
                            insight.type === "warning" 
                              ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900" 
                              : insight.type === "tip"
                              ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900"
                              : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                          }`}
                        >
                          {insight.type === "warning" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          ) : insight.type === "tip" ? (
                            <Lightbulb className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          )}
                          <p className="text-sm">{insight.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
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
        </div>

        {/* 전체 파이프라인 현황 + S3/S4/S5 카드 - 1줄 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 전체 파이프라인 현황 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                전체 파이프라인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl font-bold">
                  {formatWon(data.totalPipeline)}
                </div>
                <div className="text-xs text-muted-foreground">
                  목표: {formatWon(data.targetPipeline)}
                </div>
                <div className="relative">
                  <Progress value={totalPercentage} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalPercentage.toFixed(1)}% 달성
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 단계별 파이프라인 카드 - S3, S4, S5 */}
          {data.stages.map((stage) => {
            const percentage = (stage.amount / stage.target) * 100;
            // S3는 10%, S4는 20% 예상 매출 표시
            const conversionRate = stage.id === "S3" ? 10 : stage.id === "S4" ? 20 : null;
            const stageExpected = conversionRate ? stage.amount * (conversionRate / 100) : null;
            
            return (
              <Card key={stage.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${stage.color}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{stage.id}</Badge>
                      {stage.name}
                    </span>
                    <span className="text-lg font-bold">{stage.count}건</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-lg font-bold">{formatWon(stage.amount)}</p>
                    <p className="text-xs text-muted-foreground">목표: {formatWon(stage.target)}</p>
                  </div>
                  <div className="space-y-1">
                    <Progress value={Math.min(percentage, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% 달성</p>
                  </div>
                  {stageExpected !== null && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">예상 매출 ({conversionRate}%)</p>
                      <p className="text-sm font-bold text-green-600">{formatWon(stageExpected)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 서비스별 파이프라인 - S3 / S4 / 종합 3열 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* S3 서비스별 파이프라인 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                S3 서비스별 파이프라인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.serviceByStage.S3.map((service) => {
                const percentage = (service.amount / service.target) * 100;
                const cacheKey = `S3_${service.name}`;
                const isExpanded = expandedService === cacheKey;
                const deals = serviceDeals[cacheKey] || [];
                
                return (
                  <div key={service.name}>
                    <div 
                      className={cn(
                        "p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        isExpanded && "bg-muted/50"
                      )}
                      onClick={() => loadServiceDeals(service.name, "S3")}
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <div className={`w-2 h-2 rounded-full ${service.color}`} />
                          <span className="font-medium text-xs">{service.name}</span>
                        </span>
                        <span className="font-medium text-xs">
                          {formatWon(service.amount)}
                        </span>
                      </div>
                      <Progress value={Math.min(percentage, 100)} className="h-1.5" />
                    </div>
                    {isExpanded && deals.length > 0 && (
                      <div className="ml-4 mt-1 mb-2 space-y-1 max-h-[200px] overflow-y-auto">
                        {deals.map((deal) => (
                          <div 
                            key={deal.id}
                            onClick={() => router.push(`/deals/${deal.id}`)}
                            className="text-xs p-1.5 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer flex justify-between"
                          >
                            <span className="truncate max-w-[120px]">{deal.deal_name || "이름 없음"}</span>
                            <Badge variant="outline" className="text-[10px] h-4">{deal.stage?.split("_")[0]}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* S4 서비스별 파이프라인 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                S4 서비스별 파이프라인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.serviceByStage.S4.map((service) => {
                const percentage = (service.amount / service.target) * 100;
                const cacheKey = `S4_${service.name}`;
                const isExpanded = expandedService === cacheKey;
                const deals = serviceDeals[cacheKey] || [];
                
                return (
                  <div key={service.name}>
                    <div 
                      className={cn(
                        "p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        isExpanded && "bg-muted/50"
                      )}
                      onClick={() => loadServiceDeals(service.name, "S4")}
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <div className={`w-2 h-2 rounded-full ${service.color}`} />
                          <span className="font-medium text-xs">{service.name}</span>
                        </span>
                        <span className="font-medium text-xs">
                          {formatWon(service.amount)}
                        </span>
                      </div>
                      <Progress value={Math.min(percentage, 100)} className="h-1.5" />
                    </div>
                    {isExpanded && deals.length > 0 && (
                      <div className="ml-4 mt-1 mb-2 space-y-1 max-h-[200px] overflow-y-auto">
                        {deals.map((deal) => (
                          <div 
                            key={deal.id}
                            onClick={() => router.push(`/deals/${deal.id}`)}
                            className="text-xs p-1.5 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer flex justify-between"
                          >
                            <span className="truncate max-w-[120px]">{deal.deal_name || "이름 없음"}</span>
                            <Badge variant="outline" className="text-[10px] h-4">{deal.stage?.split("_")[0]}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 종합 서비스별 파이프라인 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                종합 서비스별 파이프라인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.serviceByStage.total.map((service) => {
                const percentage = (service.amount / service.target) * 100;
                const cacheKey = `total_${service.name}`;
                const isExpanded = expandedService === cacheKey;
                const deals = serviceDeals[cacheKey] || [];
                
                return (
                  <div key={service.name}>
                    <div 
                      className={cn(
                        "p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        isExpanded && "bg-muted/50"
                      )}
                      onClick={() => loadServiceDeals(service.name, "total")}
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <div className={`w-2 h-2 rounded-full ${service.color}`} />
                          <span className="font-medium text-xs">{service.name}</span>
                        </span>
                        <span className="font-medium text-xs">
                          {formatWon(service.amount)}
                        </span>
                      </div>
                      <Progress value={Math.min(percentage, 100)} className="h-1.5" />
                    </div>
                    {isExpanded && deals.length > 0 && (
                      <div className="ml-4 mt-1 mb-2 space-y-1 max-h-[200px] overflow-y-auto">
                        {deals.map((deal) => (
                          <div 
                            key={deal.id}
                            onClick={() => router.push(`/deals/${deal.id}`)}
                            className="text-xs p-1.5 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer flex justify-between"
                          >
                            <span className="truncate max-w-[120px]">{deal.deal_name || "이름 없음"}</span>
                            <Badge variant="outline" className="text-[10px] h-4">{deal.stage?.split("_")[0]}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* 파이프라인 추이 섹션 */}
        <Separator className="my-2" />
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                파이프라인 추이
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* 집계 단위 */}
                <div className="flex rounded-lg border overflow-hidden">
                  {(["daily", "weekly", "monthly"] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setTrendUnit(unit)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium transition-colors",
                        trendUnit === unit
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {unit === "daily" ? "일별" : unit === "weekly" ? "주간" : "월간"}
                    </button>
                  ))}
                </div>
                {/* 기간 선택 */}
                <Select value={trendRange} onValueChange={setTrendRange}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7일</SelectItem>
                    <SelectItem value="30">30일</SelectItem>
                    <SelectItem value="90">90일</SelectItem>
                    <SelectItem value="180">6개월</SelectItem>
                    <SelectItem value="365">1년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {snapshotLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                데이터 로딩 중...
              </div>
            ) : snapshotData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">스냅샷 데이터가 없습니다.</p>
                <p className="text-xs mt-1">SQL 스크립트(030_pipeline_snapshots.sql)를 먼저 실행해주세요.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 라인 차트 */}
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={snapshotData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [
                          `${value}건`,
                          STAGE_LABELS[name] || name,
                        ]}
                      />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs">{STAGE_LABELS[value] || value}</span>
                        )}
                      />
                      {Object.entries(STAGE_COLORS).map(([key, color]) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 데이터 테이블 */}
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center text-xs w-[100px]">날짜</TableHead>
                        {Object.entries(STAGE_LABELS).map(([key, label]) => (
                          <TableHead key={key} className="text-center text-xs">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: STAGE_COLORS[key] }}
                              />
                              {key}
                            </span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center text-xs font-bold">합계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshotData.map((row, idx) => {
                        const prevRow = idx > 0 ? snapshotData[idx - 1] : null;
                        return (
                          <TableRow key={row.fullDate}>
                            <TableCell className="text-center text-xs font-medium">
                              {row.date}
                            </TableCell>
                            {Object.keys(STAGE_LABELS).map((key) => {
                              const current = row[key] || 0;
                              const prev = prevRow ? (prevRow[key] || 0) : null;
                              const diff = prev !== null ? current - prev : null;
                              return (
                                <TableCell key={key} className="text-center text-xs">
                                  <span>{current}</span>
                                  {diff !== null && diff !== 0 && (
                                    <span className={cn(
                                      "ml-1 text-[10px]",
                                      diff > 0 ? "text-green-600" : "text-red-500"
                                    )}>
                                      {diff > 0 ? "+" : ""}{diff}
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center text-xs font-bold">
                              {row.total}
                              {prevRow && (row.total - prevRow.total) !== 0 && (
                                <span className={cn(
                                  "ml-1 text-[10px]",
                                  (row.total - prevRow.total) > 0 ? "text-green-600" : "text-red-500"
                                )}>
                                  {(row.total - prevRow.total) > 0 ? "+" : ""}{row.total - prevRow.total}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
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
      let coreTotal = 0; // S0~S4 합계
      let allTotal = 0; // S0~S6 전체 합계
      
      // S0~S4 핵심 파이프라인
      STAGE_CONFIG.forEach(stage => {
        const stageKeys = STAGE_KEY_MAP[stage.key] || [];
        const stageDeals = deals?.filter(d => stageKeys.includes(d.stage)) || [];
        counts[stage.key] = stageDeals.length;
        dealsByStage[stage.key] = stageDeals;
        coreTotal += stageDeals.length;
      });
      
      // S5, S6 별도 집계
      EXTRA_STAGES.forEach(stage => {
        const stageKeys = STAGE_KEY_MAP[stage.key] || [];
        const stageDeals = deals?.filter(d => stageKeys.includes(d.stage)) || [];
        counts[stage.key] = stageDeals.length;
        dealsByStage[stage.key] = stageDeals;
      });
      
      allTotal = coreTotal + (counts["S5"] || 0) + (counts["S6"] || 0);
      
      setStageCounts(counts);
      setStageDeals(dealsByStage);
      setTotalCount(coreTotal); // S0~S4만
      setAllDealsCount(allTotal); // 전체

      try {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("stage_feedbacks")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!feedbackError) {
          const historyMap: Record<string, FeedbackHistory[]> = {};
          [...STAGE_CONFIG, ...EXTRA_STAGES].forEach(stage => {
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

  // S0~S5 전체 합계 대비 비율 계산 (합산 = 100%)
  const getRate = (stageKey: string): number => {
    if (totalCount === 0) return 0;
    return (stageCounts[stageKey] || 0) / totalCount * 100;
  };

  const getStatus = (stageKey: string): { status: "low" | "normal" | "high"; message: string } => {
    const rate = getRate(stageKey);
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return { status: "normal", message: "정보 없음" };

    if (rate < config.targetMinRate) {
      return { status: "low", message: `목표 대비 -${(config.targetMinRate - rate).toFixed(1)}% 부족` };
    } else if (rate > config.targetMaxRate) {
      return { status: "high", message: `목표 대비 +${(rate - config.targetMaxRate).toFixed(1)}% 초과` };
    }
    return { status: "normal", message: "적정 범위 내" };
  };

  const getStatusStyle = (status: "low" | "normal" | "high") => {
    switch (status) {
      case "low":
        return { bg: "bg-purple-50 border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700", icon: <TrendingDown className="h-4 w-4" />, iconColor: "text-purple-500" };
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
    // 각 단계별 적정 범위 기준으로 표시 (최대 50% 기준)
    const maxDisplay = 50;
    return Math.min((rate / maxDisplay) * 100, 100);
  };

  const getRangePosition = (stageKey: string): { left: number; width: number } => {
    const config = STAGE_CONFIG.find(s => s.key === stageKey);
    if (!config) return { left: 0, width: 0 };
    const maxDisplay = 50;
    return { left: (config.targetMinRate / maxDisplay) * 100, width: ((config.targetMaxRate - config.targetMinRate) / maxDisplay) * 100 };
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
              <Card className={cn("transition-all duration-200 border-2", isSelected ? "ring-2 ring-primary border-primary" : style.bg, "hover:shadow-md")}>
                <CardContent className="p-4">
                  <div className="cursor-pointer" onClick={() => handleStageChange(stage.key)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{stage.label}</span>
                        <Badge variant="secondary" className="text-base px-3 py-1">{count}건</Badge>
                        <span className="text-xs text-muted-foreground">{stage.definition}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-xl", style.text)}>{rate.toFixed(1)}%</span>
                        <span className="text-sm text-muted-foreground">/ 목표 {stage.targetMinRate}~{stage.targetMaxRate}%</span>
                      </div>
                    </div>

                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("absolute h-full rounded-full transition-all duration-500 z-10", status === "low" ? "bg-purple-500" : status === "high" ? "bg-red-500" : "bg-green-500")} style={{ width: `${progressWidth}%` }} />
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

        {/* S5, S6 별도 표기 (전체 대비 비율) */}
        <Card className="mt-4 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              완료/종료 단계 (전체 대비 비율)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-6">
              {EXTRA_STAGES.map((stage) => {
                const count = stageCounts[stage.key] || 0;
                const rate = allDealsCount > 0 ? (count / allDealsCount) * 100 : 0;
                const deals = stageDeals[stage.key] || [];
                const isExpanded = expandedStage === stage.key;
                
                return (
                  <div key={stage.key} className="flex-1">
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => toggleStageExpand(stage.key)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stage.label}</span>
                        <Badge variant="outline" className="text-xs">{count}건</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{rate.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">(전체 {allDealsCount}건 대비)</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </div>
                    
                    {isExpanded && deals.length > 0 && (
                      <Card className="mt-2 border-l-4 border-l-gray-400">
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="w-[140px]">상호명</TableHead>
                                <TableHead>니즈 축약</TableHead>
                                <TableHead className="w-[120px] text-right">예상 금액</TableHead>
                                <TableHead className="w-[40px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deals.slice(0, 5).map((deal) => (
                                <TableRow key={deal.id} onClick={() => router.push(`/deals/${deal.id}`)} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                  <TableCell className="font-medium">{deal.deal_name || "이름 없음"}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{deal.needs_summary || "-"}</TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">{formatAmountRange(deal.amount_range)}</TableCell>
                                  <TableCell><ExternalLink className="h-4 w-4 text-muted-foreground" /></TableCell>
                                </TableRow>
                              ))}
                              {deals.length > 5 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-2">
                                    +{deals.length - 5}건 더 있음
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 오른쪽: 피드백 메모 */}
      <div className="xl:col-span-1">
        <div className="sticky top-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
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
      
      <main className="flex-1 flex flex-col">
        {/* 헤더 - 여백 없이 */}
        <PageHeader icon={LayoutDashboard} title="대시보드" className="shrink-0" />

        <div className="flex-1 p-2 xl:p-6 space-y-4 xl:space-y-6">
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
        </div>
      </main>
    </div>
  );
}
