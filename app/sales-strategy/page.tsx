"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CrmSidebar } from "@/components/crm-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Target,
  Plus,
  Save,
  Clock,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Palette,
  MoreVertical,
} from "lucide-react";

// 색상 팔레트
const CELL_COLORS = [
  { name: "없음", value: null, bg: "bg-transparent", text: "text-foreground" },
  { name: "빨강", value: "red", bg: "bg-red-100", text: "text-red-900" },
  { name: "주황", value: "orange", bg: "bg-orange-100", text: "text-orange-900" },
  { name: "노랑", value: "yellow", bg: "bg-yellow-100", text: "text-yellow-900" },
  { name: "초록", value: "green", bg: "bg-green-100", text: "text-green-900" },
  { name: "파랑", value: "blue", bg: "bg-blue-100", text: "text-blue-900" },
  { name: "보라", value: "purple", bg: "bg-purple-100", text: "text-purple-900" },
  { name: "분홍", value: "pink", bg: "bg-pink-100", text: "text-pink-900" },
  { name: "회색", value: "gray", bg: "bg-gray-200", text: "text-gray-900" },
];

// 타입 정의
interface StrategyCategory {
  id: string;
  name: string;
  color: string | null;
  is_expanded: boolean;
  sort_order: number;
}

interface StrategyItem {
  id: string;
  category_id: string;
  name: string;
  name_color: string | null;
  goal: string | null;
  action_summary: string | null;
  kpi: string | null;
  goal_color: string | null;
  action_summary_color: string | null;
  kpi_color: string | null;
  sort_order: number;
}

interface StrategyHistory {
  id: string;
  item_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// 초기 카테고리 데이터
const INITIAL_CATEGORIES = [
  { name: "1_검색 기반", sort_order: 1 },
  { name: "2_커뮤니티/바이럴", sort_order: 2 },
  { name: "3_SNS 계열", sort_order: 3 },
  { name: "4_광고·퍼포먼스", sort_order: 4 },
  { name: "5_제작/견적 플랫폼", sort_order: 5 },
  { name: "6_오프라인/네트워크", sort_order: 6 },
  { name: "7_입찰·제안 기반", sort_order: 7 },
  { name: "8_기타", sort_order: 8 },
];

// 초기 항목 데이터 (카테고리 이름으로 매핑)
const INITIAL_ITEMS: Record<string, { name: string; goal?: string; action_summary?: string; kpi?: string }[]> = {
  "1_검색 기반": [
    { name: "1-1. 네이버 검색", goal: "검색 의도가 있는 고객들이 들어오는 핵심 인바운드 채널" },
    { name: "1-2. 네이버 지도", action_summary: "- 플루타 강남지사\n- 플루타 중구지사\n- 플루타 분당지사\n\n상위노출 플랜 （홈페이지 문의" },
    { name: "2. 구글 검색", goal: "- 워드프레스 / 플루타,오코랩스 백링크 작업", action_summary: "- 플루타,오코랩스 구글 seo\n- 플루타,오코랩스 공식 홈페이지 커뮤니티 활성화\n- 제작하는 홈페이지 하단 푸터 생성\n- WP ( 30~100 ) ,  PBN 운영\n- 기사 배포\n- Medium + Blogger 운영\n- LinkedIn 아티클 운영", kpi: "월 신규 인덱싱 150~300건\n상위 10위권 키워드 150개 확보\n월 유입 3,000~5,000\n월 리드 20~40건" },
    { name: "3. AI 추천답변", goal: "SEO → 전통 검색엔진 최적화\nAIO = AI 검색 시대의 SEO 2.0 버전\nGEO → 생성형 AI 검색엔진 최적화 ( AIO의 상위 개념 )", action_summary: "- 구글 seo와 연동\nFAQ 구조화\n표·정량화 데이터·비교자료 제공\n\"AI-friendly Manuscript\" 제작\nSchema / FAQ / How-To 마크업\n워드프레스 모든 글에 AI 최적화 템플릿 적용", kpi: "Perplexity에서 브랜드 언급 발생\nChatGPT 답변에 자사 페이지 1회 이상 인용\nTopical Clusters 30개 구축" },
  ],
  "2_커뮤니티/바이럴": [
    { name: "2-1. 네이버 블로그 배포", goal: "검색이 아니라 '경험 노출' 기반 유입\n검색형 리드 + Brand Lift + SERP 부스팅.", action_summary: "- 11월 총 700개 배포\n700개 포스팅 기준\n인건비 - 175만원\n플루타 셀렉블 200만원 / 300만원\n오코랩스 셀렉블 170만원 / 270만원\n= 총 570만원 꼴", kpi: "메인 키워드 150개\n질문형 키워드 350개\n리뷰/제휴형 200개\nAI 생성 + 수작업 QA\n\nKPI\n월간 노출 30–40만\n월 클릭 5,000–10,000\n월 전화/상담 문의 10–20건\n직접 전환율 0.3–0.8%" },
    { name: "2-2. 네이버 카페" },
    { name: "2-3. 커뮤니티/포럼" },
  ],
  "3_SNS 계열": [
    { name: "3-1. 인스타그램", goal: "브랜딩·콘텐츠 기반 유입", action_summary: "- 플루타 공식 유튜브 컨텐츠 확산 ( 숏폼 화 등 )" },
    { name: "3-2. 스레드", action_summary: "- 플루타 공식 유튜브 컨텐츠 확산 ( 숏폼 화 등 )" },
    { name: "3-3. 유튜브", goal: "브랜드 신뢰도 확보 + 전문가 Authority 확보 + 유입 증폭", action_summary: "- 플루타 공식 유튜브 - 플루타 멀티 컨텐츠 채널로 승화\n- 오코랩스 -> 유튜브 광고 기획(타겟팅·리타겟팅)", kpi: "월 업로드 8~12건\n90일 이내 1,000 구독자\n인바운드 문의 월 5–10건" },
    { name: "3-4. 틱톡", action_summary: "- 플루타 공식 유튜브 컨텐츠 확산 ( 숏폼 화 등 )" },
  ],
  "4_광고·퍼포먼스": [
    { name: "4-1. 네이버", goal: "유료광고 기반", action_summary: "- 41-1_플1_ 플루타 월 예산 10만원 ( 저경쟁 롱테일, 초저CPC + 범위확장형)\n\n- 41-2_오1_오코랩스 월 예산 30만원 ( 저경쟁 롱테일, 초저CPC + 범위확장형)" },
    { name: "4-2. 구글", action_summary: "- 42-1_플1_ 플루타 월 예산 10만원 투망 ( 저경쟁 롱테일, 초저CPC + 범위확장형)\n\n- 42-2_오1. 오코랩스 월 예산 10만원 집행 ( 저경쟁 롱테일, 초저CPC + 범위확장형)\n- 42-3_오2. 오코랩스 월 예산 370만원 집행 ( 문의 생성 최적화 )_평일 월~금 9-6", kpi: "CPC 2,800–4,500원\n월 클릭 1,000–1,400\n월 리드 20–40\nCVR 2–3%\n월 계약 2–4건 (앱/ERP/SaaS 혼합)" },
    { name: "4-3. 메타" },
    { name: "4-4. 기타광고", goal: "토스,당근 그외는?" },
  ],
  "5_제작/견적 플랫폼": [
    { name: "5-1. 피버" },
    { name: "5-2. 크몽", goal: "제작·외주 의뢰 플랫폼 기반 문의", action_summary: "- 크몽 상품 등록 목표 + ( 스마트스토어 등록까지 같이 )", kpi: "크몽 노출 TOP 10 유지\n월 문의 20–30건\n월 계약 2–3건" },
    { name: "5-3. 숨고", kpi: "크몽 노출 TOP 10 유지\n월 문의 20–30건\n월 계약 2–3건" },
    { name: "5-4. 아임웹 전문가찾기", action_summary: "- 코코로 - 해외 2000원\n- 플루타_H,디에스,오코랩스,모아나 => 하이브리드 4000원" },
    { name: "5-5. 아임웹 의뢰하기" },
    { name: "5-6. 위시켓", action_summary: "- 위시켓 매일매일 신청" },
  ],
  "6_오프라인/네트워크": [
    { name: "6-1. 전단지", action_summary: "- 현프캠,블루웨일 1차, 2차, 테라타워\n- 갈매, 하남", kpi: "월 리드 5–10건" },
    { name: "6-2. 지인/단체 소개", action_summary: "- 중소기업중앙회 AMP 가입" },
    { name: "6-3. 거래처 소개", action_summary: "- 클라이언트 만족도 높이기" },
    { name: "6-4. 제휴사 소개", goal: "(플랫폼·협력업체·파트너사 소개) ( 리노코리아 )" },
    { name: "6-5. 박람회·전시회" },
    { name: "6-6. 세미나/강의/설명회" },
    { name: "6-7. 직접 방문", goal: "- ssl영어와 같은 사례", action_summary: "- 운동 꼄 전단지" },
  ],
  "7_입찰·제안 기반": [
    { name: "8-1. 공공입찰" },
    { name: "8-2. 민간입찰" },
    { name: "8-3. 경쟁 PT 제안 요청" },
    { name: "8-4. 플랫폼 공모", goal: "(네이버·카페24·기관 공모 등)" },
  ],
  "8_기타": [
    { name: "8-1. 추정불가" },
    { name: "8-2. 기타", goal: "분류 기준 x" },
  ],
};

export default function SalesStrategyPage() {
  const [categories, setCategories] = useState<StrategyCategory[]>([]);
  const [items, setItems] = useState<StrategyItem[]>([]);
  const [histories, setHistories] = useState<Record<string, StrategyHistory[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // 다이얼로그 상태
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "item"; id: string } | null>(null);
  
  // 편집 다이얼로그 상태
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StrategyCategory | null>(null);
  const [editingItem, setEditingItem] = useState<StrategyItem | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editItemName, setEditItemName] = useState("");

  // 헤더 색상 상태 (localStorage에 저장)
  const [headerColors, setHeaderColors] = useState<Record<string, string | null>>({
    category: null,
    goal: null,
    action_summary: null,
    kpi: null,
  });
  
  const supabase = createClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 헤더 색상 로드
  useEffect(() => {
    const saved = localStorage.getItem("sales_strategy_header_colors");
    if (saved) {
      try {
        setHeaderColors(JSON.parse(saved));
      } catch (e) {
        console.error("헤더 색상 로드 실패:", e);
      }
    }
  }, []);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 편집 모드일 때 textarea에 포커스
  useEffect(() => {
    if (editingCell && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingCell]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 카테고리 로드
      const { data: categoriesData, error: catError } = await supabase
        .from("sales_strategy_categories")
        .select("*")
        .order("sort_order");

      if (catError) throw catError;

      // 항목 로드
      const { data: itemsData, error: itemError } = await supabase
        .from("sales_strategy_items")
        .select("*")
        .order("sort_order");

      if (itemError) throw itemError;

      // 데이터가 없으면 초기 데이터 생성
      if (!categoriesData || categoriesData.length === 0) {
        await initializeData();
        return;
      }

      setCategories(categoriesData || []);
      setItems(itemsData || []);

      // DB에 저장된 펼침 상태 반영 (is_expanded가 true인 카테고리만 펼침)
      const expandedIds = categoriesData
        ?.filter((c) => c.is_expanded !== false) // null이나 true면 펼침
        .map((c) => c.id) || [];
      setExpandedCategories(new Set(expandedIds));

      // 히스토리 로드
      if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map((item) => item.id);
        const { data: historyData } = await supabase
          .from("sales_strategy_history")
          .select("*")
          .in("item_id", itemIds)
          .order("created_at", { ascending: false });

        if (historyData) {
          const historyMap: Record<string, StrategyHistory[]> = {};
          historyData.forEach((h) => {
            const key = `${h.item_id}_${h.field_name}`;
            if (!historyMap[key]) historyMap[key] = [];
            historyMap[key].push(h);
          });
          setHistories(historyMap);
        }
      }
    } catch (error: any) {
      console.error("데이터 로드 실패:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 데이터 생성
  const initializeData = async () => {
    try {
      // 카테고리 생성
      const { data: newCategories, error: catError } = await supabase
        .from("sales_strategy_categories")
        .insert(INITIAL_CATEGORIES)
        .select();

      if (catError) throw catError;

      if (newCategories) {
        // 카테고리 ID 매핑
        const categoryMap: Record<string, string> = {};
        newCategories.forEach((cat) => {
          categoryMap[cat.name] = cat.id;
        });

        // 항목 생성
        const itemsToInsert: any[] = [];
        Object.entries(INITIAL_ITEMS).forEach(([catName, catItems]) => {
          const categoryId = categoryMap[catName];
          if (categoryId) {
            catItems.forEach((item, index) => {
              itemsToInsert.push({
                category_id: categoryId,
                name: item.name,
                goal: item.goal || null,
                action_summary: item.action_summary || null,
                kpi: item.kpi || null,
                sort_order: index + 1,
              });
            });
          }
        });

        const { error: itemError } = await supabase
          .from("sales_strategy_items")
          .insert(itemsToInsert);

        if (itemError) throw itemError;

        // 다시 로드
        loadData();
      }
    } catch (error: any) {
      console.error("초기 데이터 생성 실패:", error?.message || error);
    }
  };

  // 카테고리 토글 (DB에도 저장)
  const toggleCategory = async (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    const isNowExpanded = !newExpanded.has(categoryId);
    
    if (isNowExpanded) {
      newExpanded.add(categoryId);
    } else {
      newExpanded.delete(categoryId);
    }
    setExpandedCategories(newExpanded);

    // DB에 저장
    try {
      await supabase
        .from("sales_strategy_categories")
        .update({ is_expanded: isNowExpanded })
        .eq("id", categoryId);
    } catch (error: any) {
      console.error("펼침 상태 저장 실패:", error?.message || error);
    }
  };

  // 셀 편집 시작
  const startEditing = (itemId: string, field: string, currentValue: string | null) => {
    setEditingCell({ itemId, field });
    setEditValue(currentValue || "");
  };

  // 셀 편집 저장
  const saveEdit = async () => {
    if (!editingCell) return;

    const { itemId, field } = editingCell;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const oldValue = item[field as keyof StrategyItem] as string | null;
    
    // 값이 변경되지 않았으면 그냥 닫기
    if (oldValue === editValue || (!oldValue && !editValue)) {
      setEditingCell(null);
      setEditValue("");
      return;
    }

    try {
      setIsSaving(true);

      // 항목 업데이트
      const { error: updateError } = await supabase
        .from("sales_strategy_items")
        .update({ [field]: editValue || null })
        .eq("id", itemId);

      if (updateError) throw updateError;

      // 히스토리 저장
      const { error: historyError } = await supabase
        .from("sales_strategy_history")
        .insert({
          item_id: itemId,
          field_name: field,
          old_value: oldValue,
          new_value: editValue || null,
        });

      if (historyError) console.error("히스토리 저장 실패:", historyError);

      // 로컬 상태 업데이트
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, [field]: editValue || null } : i
        )
      );

      // 히스토리 업데이트
      const historyKey = `${itemId}_${field}`;
      setHistories((prev) => ({
        ...prev,
        [historyKey]: [
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            item_id: itemId,
            field_name: field,
            old_value: oldValue,
            new_value: editValue || null,
            created_at: new Date().toISOString(),
          },
          ...(prev[historyKey] || []),
        ],
      }));

      setEditingCell(null);
      setEditValue("");
    } catch (error: any) {
      console.error("저장 실패:", error?.message || error);
    } finally {
      setIsSaving(false);
    }
  };

  // 카테고리 추가
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const maxOrder = Math.max(...categories.map((c) => c.sort_order), 0);
      const { data, error } = await supabase
        .from("sales_strategy_categories")
        .insert({
          name: newCategoryName,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories((prev) => [...prev, data]);
      setExpandedCategories((prev) => new Set([...prev, data.id]));
      setNewCategoryName("");
      setAddCategoryOpen(false);
    } catch (error: any) {
      console.error("카테고리 추가 실패:", error?.message || error);
    }
  };

  // 항목 추가
  const addItem = async () => {
    if (!newItemName.trim() || !selectedCategoryId) return;

    try {
      const categoryItems = items.filter((i) => i.category_id === selectedCategoryId);
      const maxOrder = Math.max(...categoryItems.map((i) => i.sort_order), 0);
      
      const { data, error } = await supabase
        .from("sales_strategy_items")
        .insert({
          category_id: selectedCategoryId,
          name: newItemName,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setItems((prev) => [...prev, data]);
      setNewItemName("");
      setAddItemOpen(false);
    } catch (error: any) {
      console.error("항목 추가 실패:", error?.message || error);
    }
  };

  // 카테고리 수정
  const updateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from("sales_strategy_categories")
        .update({ name: editCategoryName })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id ? { ...c, name: editCategoryName } : c
        )
      );
      setEditCategoryOpen(false);
      setEditingCategory(null);
    } catch (error: any) {
      console.error("카테고리 수정 실패:", error?.message || error);
    }
  };

  // 항목 이름 수정
  const updateItemName = async () => {
    if (!editingItem || !editItemName.trim()) return;

    try {
      const { error } = await supabase
        .from("sales_strategy_items")
        .update({ name: editItemName })
        .eq("id", editingItem.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id ? { ...i, name: editItemName } : i
        )
      );
      setEditItemOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error("항목 수정 실패:", error?.message || error);
    }
  };

  // 셀 색상 변경
  const updateCellColor = async (itemId: string, field: string, color: string | null) => {
    const colorField = `${field}_color`;
    
    try {
      const { error } = await supabase
        .from("sales_strategy_items")
        .update({ [colorField]: color })
        .eq("id", itemId);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, [colorField]: color } : i
        )
      );
    } catch (error: any) {
      console.error("색상 변경 실패:", error?.message || error);
    }
  };

  // 헤더 색상 변경 (localStorage 저장)
  const updateHeaderColor = (field: string, color: string | null) => {
    const newColors = { ...headerColors, [field]: color };
    setHeaderColors(newColors);
    localStorage.setItem("sales_strategy_header_colors", JSON.stringify(newColors));
  };

  // 카테고리 색상 변경
  const updateCategoryColor = async (categoryId: string, color: string | null) => {
    try {
      const { error } = await supabase
        .from("sales_strategy_categories")
        .update({ color })
        .eq("id", categoryId);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, color } : c
        )
      );
    } catch (error: any) {
      console.error("카테고리 색상 변경 실패:", error?.message || error);
    }
  };

  // 항목 이름 색상 변경
  const updateItemNameColor = async (itemId: string, color: string | null) => {
    try {
      const { error } = await supabase
        .from("sales_strategy_items")
        .update({ name_color: color })
        .eq("id", itemId);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, name_color: color } : i
        )
      );
    } catch (error: any) {
      console.error("항목 이름 색상 변경 실패:", error?.message || error);
    }
  };

  // 삭제 실행
  const executeDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === "category") {
        // 카테고리의 모든 항목 먼저 삭제
        const { error: itemError } = await supabase
          .from("sales_strategy_items")
          .delete()
          .eq("category_id", deleteConfirm.id);

        if (itemError) throw itemError;

        // 카테고리 삭제
        const { error } = await supabase
          .from("sales_strategy_categories")
          .delete()
          .eq("id", deleteConfirm.id);

        if (error) throw error;

        setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
        setItems((prev) => prev.filter((i) => i.category_id !== deleteConfirm.id));
      } else {
        // 항목 삭제
        const { error } = await supabase
          .from("sales_strategy_items")
          .delete()
          .eq("id", deleteConfirm.id);

        if (error) throw error;

        setItems((prev) => prev.filter((i) => i.id !== deleteConfirm.id));
      }

      setDeleteConfirm(null);
    } catch (error: any) {
      console.error("삭제 실패:", error?.message || error);
    }
  };

  // 필드 라벨
  const getFieldLabel = (field: string) => {
    switch (field) {
      case "goal":
        return "진행 목표";
      case "action_summary":
        return "액션 요약";
      case "kpi":
        return "KPI";
      default:
        return field;
    }
  };

  // 히스토리 있는지 확인
  const hasHistory = (itemId: string, field: string) => {
    const key = `${itemId}_${field}`;
    return histories[key] && histories[key].length > 0;
  };

  // 히스토리 가져오기
  const getHistory = (itemId: string, field: string) => {
    const key = `${itemId}_${field}`;
    return histories[key] || [];
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <CrmSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CrmSidebar />

      <div className="flex-1 pt-4 px-6 pb-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">영업 전략표</h1>
              <p className="text-sm text-muted-foreground">
                채널별 영업 전략을 관리하고 소통하세요
              </p>
            </div>
          </div>
          <Button onClick={() => setAddCategoryOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            카테고리 추가
          </Button>
        </div>

        {/* 테이블 */}
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[180px_200px_1fr_1fr_1fr]">
              {/* 카테고리 헤더 */}
              <HeaderCell
                label="카테고리"
                color={headerColors.category}
                onColorChange={(color) => updateHeaderColor("category", color)}
              />
              {/* 세부항목 헤더 */}
              <HeaderCell
                label="세부항목"
                color={headerColors.category}
                onColorChange={(color) => updateHeaderColor("category", color)}
                hasBorderLeft
              />
              {/* 진행 목표 헤더 */}
              <HeaderCell
                label="진행 목표"
                color={headerColors.goal}
                onColorChange={(color) => updateHeaderColor("goal", color)}
                hasBorderLeft
              />
              {/* 액션 요약 헤더 */}
              <HeaderCell
                label="액션 요약"
                color={headerColors.action_summary}
                onColorChange={(color) => updateHeaderColor("action_summary", color)}
                hasBorderLeft
              />
              {/* KPI 헤더 */}
              <HeaderCell
                label="KPI"
                color={headerColors.kpi}
                onColorChange={(color) => updateHeaderColor("kpi", color)}
                hasBorderLeft
              />
            </div>

            {/* 카테고리 및 항목 */}
            <div>
              {categories.map((category, index) => {
                const categoryItems = items.filter(
                  (item) => item.category_id === category.id
                );
                const isExpanded = expandedCategories.has(category.id);
                const itemCount = isExpanded ? Math.max(categoryItems.length, 1) : 1;

                return (
                  <div key={category.id} className={cn("flex", index > 0 && "border-t-2 border-border")}>
                    {/* 카테고리 셀 (세로로 병합) */}
                    <div 
                      className={cn(
                        "w-[180px] flex-shrink-0 p-3 flex flex-col border-r group",
                        getColorClasses(category.color).bg,
                        getColorClasses(category.color).text,
                        !category.color && "bg-muted/30"
                      )}
                    >
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        <span className="font-medium text-sm">{category.name}</span>
                      </button>
                      <div className="mt-2 flex items-center gap-1">
                        {/* 색상 팔레트 */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "p-1 hover:bg-muted/50 rounded transition-opacity",
                                category.color ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                              )}
                              title="색상 선택"
                            >
                              <Palette className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="grid grid-cols-5 gap-1">
                              {CELL_COLORS.map((c) => (
                                <button
                                  key={c.name}
                                  onClick={() => updateCategoryColor(category.id, c.value)}
                                  className={cn(
                                    "w-6 h-6 rounded border-2 transition-all",
                                    c.bg,
                                    category.color === c.value ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                                  )}
                                  title={c.name}
                                >
                                  {c.value === null && <span className="text-xs text-muted-foreground">✕</span>}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <button
                          onClick={() => {
                            setSelectedCategoryId(category.id);
                            setAddItemOpen(true);
                          }}
                          className="p-1 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="항목 추가"
                        >
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setEditCategoryName(category.name);
                            setEditCategoryOpen(true);
                          }}
                          className="p-1 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="수정"
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({ type: "category", id: category.id })
                          }
                          className="p-1 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>

                    {/* 오른쪽: 세부항목들 */}
                    <div className="flex-1">
                      {!isExpanded ? (
                        <div className="grid grid-cols-[200px_1fr_1fr_1fr] h-full">
                          <div className="p-3 text-sm text-muted-foreground italic">카테고리 클릭하여 펼치기</div>
                          <div className="p-3 border-l" />
                          <div className="p-3 border-l" />
                          <div className="p-3 border-l" />
                        </div>
                      ) : categoryItems.length === 0 ? (
                        <div className="grid grid-cols-[200px_1fr_1fr_1fr] h-full">
                          <div className="p-3 text-sm text-muted-foreground italic">항목 없음</div>
                          <div className="p-3 border-l" />
                          <div className="p-3 border-l" />
                          <div className="p-3 border-l" />
                        </div>
                      ) : (
                        categoryItems.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            className={cn(
                              "grid grid-cols-[200px_1fr_1fr_1fr] group",
                              itemIndex > 0 && "border-t border-border"
                            )}
                          >
                            {/* 항목 이름 */}
                            <div className={cn(
                              "p-3 flex items-center gap-2",
                              getColorClasses(item.name_color).bg,
                              getColorClasses(item.name_color).text
                            )}>
                              <span className="text-sm flex-1 truncate">{item.name}</span>
                              {/* 편집 메뉴 */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className="p-1 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="편집"
                                  >
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-3" align="end">
                                  <div className="space-y-3">
                                    {/* 이름 수정 */}
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground">항목 이름</label>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-1 justify-start text-sm font-normal"
                                        onClick={() => {
                                          setEditingItem(item);
                                          setEditItemName(item.name);
                                          setEditItemOpen(true);
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3 mr-2" />
                                        {item.name}
                                      </Button>
                                    </div>
                                    
                                    {/* 색상 선택 */}
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground">배경 색상</label>
                                      <div className="grid grid-cols-5 gap-1 mt-1">
                                        {CELL_COLORS.map((c) => (
                                          <button
                                            key={c.name}
                                            onClick={() => updateItemNameColor(item.id, c.value)}
                                            className={cn(
                                              "w-6 h-6 rounded border-2 transition-all",
                                              c.bg,
                                              item.name_color === c.value ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                                            )}
                                            title={c.name}
                                          >
                                            {c.value === null && <span className="text-xs text-muted-foreground">✕</span>}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {/* 삭제 버튼 */}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => setDeleteConfirm({ type: "item", id: item.id })}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      항목 삭제
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                          {/* 진행 목표 */}
                          <CellWithHistory
                            itemId={item.id}
                            field="goal"
                            value={item.goal}
                            color={item.goal_color}
                            isEditing={
                              editingCell?.itemId === item.id &&
                              editingCell?.field === "goal"
                            }
                            editValue={editValue}
                            onEditValueChange={setEditValue}
                            onStartEdit={() => startEditing(item.id, "goal", item.goal)}
                            onSave={saveEdit}
                            onCancel={() => {
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            onColorChange={(color) => updateCellColor(item.id, "goal", color)}
                            hasHistory={hasHistory(item.id, "goal")}
                            history={getHistory(item.id, "goal")}
                            textareaRef={textareaRef}
                            isSaving={isSaving}
                            originalValue={item.goal}
                          />

                          {/* 액션 요약 */}
                          <CellWithHistory
                            itemId={item.id}
                            field="action_summary"
                            value={item.action_summary}
                            color={item.action_summary_color}
                            isEditing={
                              editingCell?.itemId === item.id &&
                              editingCell?.field === "action_summary"
                            }
                            editValue={editValue}
                            onEditValueChange={setEditValue}
                            onStartEdit={() =>
                              startEditing(item.id, "action_summary", item.action_summary)
                            }
                            onSave={saveEdit}
                            onCancel={() => {
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            onColorChange={(color) => updateCellColor(item.id, "action_summary", color)}
                            hasHistory={hasHistory(item.id, "action_summary")}
                            history={getHistory(item.id, "action_summary")}
                            textareaRef={textareaRef}
                            isSaving={isSaving}
                            originalValue={item.action_summary}
                          />

                          {/* KPI */}
                          <CellWithHistory
                            itemId={item.id}
                            field="kpi"
                            value={item.kpi}
                            color={item.kpi_color}
                            isEditing={
                              editingCell?.itemId === item.id &&
                              editingCell?.field === "kpi"
                            }
                            editValue={editValue}
                            onEditValueChange={setEditValue}
                            onStartEdit={() => startEditing(item.id, "kpi", item.kpi)}
                            onSave={saveEdit}
                            onCancel={() => {
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            onColorChange={(color) => updateCellColor(item.id, "kpi", color)}
                            hasHistory={hasHistory(item.id, "kpi")}
                            history={getHistory(item.id, "kpi")}
                            textareaRef={textareaRef}
                            isSaving={isSaving}
                            originalValue={item.kpi}
                          />
                        </div>
                      ))
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리 추가 다이얼로그 */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 추가</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="카테고리 이름 (예: 9_신규채널)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>
              취소
            </Button>
            <Button onClick={addCategory}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 항목 추가 다이얼로그 */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세부 항목 추가</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="항목 이름 (예: 9-1. 새 채널명)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>
              취소
            </Button>
            <Button onClick={addItem}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카테고리 수정 다이얼로그 */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 수정</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="카테고리 이름"
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateCategory()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryOpen(false)}>
              취소
            </Button>
            <Button onClick={updateCategory}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 항목 이름 수정 다이얼로그 */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>항목 이름 수정</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="항목 이름"
              value={editItemName}
              onChange={(e) => setEditItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateItemName()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>
              취소
            </Button>
            <Button onClick={updateItemName}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "category"
                ? "이 카테고리와 모든 하위 항목이 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
                : "이 항목이 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 색상 값으로 클래스 가져오기
const getColorClasses = (colorValue: string | null) => {
  const color = CELL_COLORS.find((c) => c.value === colorValue);
  return color || CELL_COLORS[0];
};

// 셀 컴포넌트 (히스토리 + 색상 포함)
interface CellWithHistoryProps {
  itemId: string;
  field: string;
  value: string | null;
  color: string | null;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onColorChange: (color: string | null) => void;
  hasHistory: boolean;
  history: StrategyHistory[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isSaving: boolean;
  originalValue: string | null;
}

function CellWithHistory({
  itemId,
  field,
  value,
  color,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onCancel,
  onColorChange,
  hasHistory,
  history,
  textareaRef,
  isSaving,
  originalValue,
}: CellWithHistoryProps) {
  const colorClasses = getColorClasses(color);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "pending" | "saving" | "saved">("idle");

  // Debounce 자동 저장
  useEffect(() => {
    if (!isEditing) return;
    
    // 값이 변경되지 않았으면 저장하지 않음
    if (editValue === (originalValue || "")) {
      setAutoSaveStatus("idle");
      return;
    }

    setAutoSaveStatus("pending");

    // 기존 타이머 클리어
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // 1.5초 후 자동 저장
    debounceRef.current = setTimeout(() => {
      setAutoSaveStatus("saving");
      onSave();
      setTimeout(() => setAutoSaveStatus("saved"), 500);
    }, 1500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [editValue, isEditing, originalValue]);

  // Blur 시 즉시 저장
  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // 값이 변경되었으면 저장
    if (editValue !== (originalValue || "")) {
      onSave();
    } else {
      onCancel();
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case "goal":
        return "진행 목표";
      case "action_summary":
        return "액션 요약";
      case "kpi":
        return "KPI";
      default:
        return field;
    }
  };

  if (isEditing) {
    return (
      <div className={cn("p-2 border-l relative", colorClasses.bg)}>
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={handleBlur}
          className="min-h-[100px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
              }
              onCancel();
            }
          }}
        />
        <div className="flex items-center justify-end mt-1">
          {autoSaveStatus === "pending" && (
            <span className="text-xs text-muted-foreground">저장 대기중...</span>
          )}
          {autoSaveStatus === "saving" && (
            <span className="text-xs text-blue-500">저장 중...</span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="text-xs text-green-500">저장됨 ✓</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 border-l cursor-pointer hover:opacity-80 min-h-[60px] relative group",
        colorClasses.bg,
        colorClasses.text
      )}
      onClick={onStartEdit}
    >
      {value ? (
        <p className="text-sm whitespace-pre-wrap pr-12">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">-</p>
      )}

      {/* 아이콘 그룹 */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* 색상 팔레트 */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "p-1 hover:bg-muted/50 rounded transition-opacity",
                color ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
              )}
              title="색상 선택"
            >
              <Palette className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <div className="grid grid-cols-5 gap-1">
              {CELL_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange(c.value);
                  }}
                  className={cn(
                    "w-6 h-6 rounded border-2 transition-all",
                    c.bg,
                    color === c.value ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                  )}
                  title={c.name}
                >
                  {c.value === null && (
                    <span className="text-xs text-muted-foreground">✕</span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 히스토리 아이콘 */}
        {hasHistory && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-muted/50 rounded opacity-60 hover:opacity-100"
                title="수정 기록"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  수정 기록 ({getFieldLabel(field)})
                </h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {history.slice(0, 10).map((h) => (
                      <div key={h.id} className="text-sm border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <span className="text-xs">
                            {format(new Date(h.created_at), "M/d HH:mm", { locale: ko })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {h.old_value && (
                            <p className="text-xs text-red-500 line-through">
                              {h.old_value.length > 50
                                ? h.old_value.slice(0, 50) + "..."
                                : h.old_value}
                            </p>
                          )}
                          <p className="text-xs text-green-600">
                            {h.new_value
                              ? h.new_value.length > 50
                                ? h.new_value.slice(0, 50) + "..."
                                : h.new_value
                              : "(비움)"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// 헤더 셀 컴포넌트
interface HeaderCellProps {
  label: string;
  color: string | null;
  onColorChange: (color: string | null) => void;
  hasBorderLeft?: boolean;
}

function HeaderCell({ label, color, onColorChange, hasBorderLeft }: HeaderCellProps) {
  const colorClasses = getColorClasses(color);

  return (
    <div
      className={cn(
        "p-3 font-medium text-sm text-center relative group",
        hasBorderLeft && "border-l",
        colorClasses.bg,
        colorClasses.text,
        !color && "bg-muted/50"
      )}
    >
      {label}
      {/* 색상 팔레트 */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "absolute top-1/2 right-2 -translate-y-1/2 p-1 hover:bg-muted/50 rounded transition-opacity",
              color ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
            )}
            title="색상 선택"
          >
            <Palette className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="end">
          <div className="grid grid-cols-5 gap-1">
            {CELL_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => onColorChange(c.value)}
                className={cn(
                  "w-6 h-6 rounded border-2 transition-all",
                  c.bg,
                  color === c.value ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                )}
                title={c.name}
              >
                {c.value === null && <span className="text-xs text-muted-foreground">✕</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
