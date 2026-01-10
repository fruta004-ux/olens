"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CrmSidebar } from "@/components/crm-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ArrowLeft,
  History,
  Clock,
  Trash2,
  Filter
} from "lucide-react";

// 단계 설정
const STAGE_CONFIG = [
  { key: "S0", label: "S0_신규 유입" },
  { key: "S1", label: "S1_유효 리드" },
  { key: "S2", label: "S2_상담 완료" },
  { key: "S3", label: "S3_제안 발송" },
  { key: "S4", label: "S4_결정 대기" },
  { key: "S5", label: "S5_계약완료" },
  { key: "S6", label: "S6_종료" },
];

interface FeedbackHistory {
  id: string;
  stage: string;
  feedback: string;
  created_at: string;
}

export default function FeedbackHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stage") || "all";
  
  const [feedbacks, setFeedbacks] = useState<FeedbackHistory[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(initialStage);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    loadFeedbacks();
  }, [selectedStage]);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("stage_feedbacks")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (selectedStage !== "all") {
        query = query.eq("stage", selectedStage);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("피드백 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm("이 피드백을 삭제하시겠습니까?")) return;
    
    try {
      const { error } = await supabase
        .from("stage_feedbacks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setFeedbacks(feedbacks.filter(f => f.id !== id));
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const getStageLabel = (stageKey: string) => {
    return STAGE_CONFIG.find(s => s.key === stageKey)?.label || stageKey;
  };

  const getStageColor = (stageKey: string) => {
    const colors: Record<string, string> = {
      S0: "bg-gray-100 text-gray-700",
      S1: "bg-blue-100 text-blue-700",
      S2: "bg-cyan-100 text-cyan-700",
      S3: "bg-yellow-100 text-yellow-700",
      S4: "bg-orange-100 text-orange-700",
      S5: "bg-green-100 text-green-700",
      S6: "bg-red-100 text-red-700",
    };
    return colors[stageKey] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex min-h-screen">
      <CrmSidebar />
      
      <main className="flex-1 p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">피드백 히스토리</h1>
                <p className="text-sm text-muted-foreground">
                  모든 단계별 피드백 기록을 확인할 수 있습니다
                </p>
              </div>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="단계 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 단계</SelectItem>
                {STAGE_CONFIG.map((stage) => (
                  <SelectItem key={stage.key} value={stage.key}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 피드백 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedStage === "all" 
                ? "전체 피드백" 
                : `${getStageLabel(selectedStage)} 피드백`}
              <Badge variant="secondary" className="ml-2">
                {feedbacks.length}건
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : feedbacks.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-4 pr-4">
                  {feedbacks.map((feedback) => (
                    <Card key={feedback.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={cn("font-medium", getStageColor(feedback.stage))}>
                              {getStageLabel(feedback.stage)}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(feedback.created_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteFeedback(feedback.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {feedback.feedback}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>아직 작성된 피드백이 없습니다.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push("/dashboard")}
                >
                  대시보드로 돌아가기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

