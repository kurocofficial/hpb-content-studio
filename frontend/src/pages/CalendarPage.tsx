import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useStylistStore } from "@/stores/stylistStore";
import { ContentType, CONTENT_TYPES, Stylist } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Crown,
} from "lucide-react";

interface CalendarItem {
  id: string;
  salon_id: string;
  stylist_id: string | null;
  content_type: string;
  scheduled_date: string;
  status: "planned" | "generated" | "published";
  generated_content_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const contentTypeLabels: Record<string, string> = {
  salon_catch: "キャッチ",
  salon_intro: "紹介文",
  stylist_profile: "プロフィール",
  blog_article: "ブログ",
  review_reply: "口コミ返信",
  consultation: "相談",
  google_review_reply: "Google返信",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  planned: { label: "予定", color: "bg-blue-100 text-blue-700" },
  generated: { label: "生成済", color: "bg-amber-100 text-amber-700" },
  published: { label: "公開済", color: "bg-green-100 text-green-700" },
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plan } = useAuthStore();
  const { stylists, fetchStylists } = useStylistStore();
  const isPremium = plan === "pro" || plan === "team";

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Add form state
  const [newItem, setNewItem] = useState({
    content_type: "blog_article" as ContentType,
    stylist_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchStylists();
  }, [fetchStylists]);

  useEffect(() => {
    if (isPremium) fetchCalendar();
  }, [currentYear, currentMonth, isPremium]);

  const fetchCalendar = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<{ items: CalendarItem[] }>(
        `/api/v1/calendar?year=${currentYear}&month=${currentMonth}`
      );
      setItems(data.items);
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleAddItem = async () => {
    if (!selectedDate) return;
    try {
      await api.post("/api/v1/calendar", {
        content_type: newItem.content_type,
        stylist_id: newItem.stylist_id || null,
        scheduled_date: selectedDate,
        notes: newItem.notes || null,
      });
      toast({ title: "追加完了", description: "カレンダーに予定を追加しました", variant: "success" });
      setShowAddForm(false);
      setNewItem({ content_type: "blog_article", stylist_id: "", notes: "" });
      fetchCalendar();
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      await api.put(`/api/v1/calendar/${itemId}`, { status: newStatus });
      fetchCalendar();
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.delete(`/api/v1/calendar/${itemId}`);
      fetchCalendar();
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    }
  };

  if (!isPremium) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8 text-center">
              <Crown className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                コンテンツカレンダーはProプラン以上で利用できます
              </h2>
              <p className="text-muted-foreground mb-4">
                コンテンツの投稿スケジュールを管理して、計画的な運用を実現します
              </p>
              <Button onClick={() => navigate("/billing")}>
                プランをアップグレード
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  // Group items by date
  const itemsByDate: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    const d = item.scheduled_date;
    if (!itemsByDate[d]) itemsByDate[d] = [];
    itemsByDate[d].push(item);
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              コンテンツカレンダー
            </h1>
            <p className="text-muted-foreground mt-1">
              コンテンツの投稿スケジュールを管理
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[140px] text-center">
              {currentYear}年{currentMonth}月
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <Card>
          <CardContent className="p-2">
            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((name, i) => (
                <div
                  key={name}
                  className={`text-center text-xs font-medium py-1 ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px]" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayItems = itemsByDate[dateStr] || [];
                const isToday =
                  currentYear === today.getFullYear() &&
                  currentMonth === today.getMonth() + 1 &&
                  day === today.getDate();
                const dayOfWeek = (firstDay + i) % 7;

                return (
                  <div
                    key={day}
                    className={`min-h-[80px] p-1 rounded border cursor-pointer hover:bg-muted/50 transition-colors ${
                      isToday ? "border-primary bg-primary/5" : "border-transparent"
                    }`}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setShowAddForm(true);
                    }}
                  >
                    <div
                      className={`text-xs font-medium mb-1 ${
                        dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""
                      }`}
                    >
                      {day}
                    </div>
                    {dayItems.map((item) => {
                      const statusInfo = statusLabels[item.status] || statusLabels.planned;
                      return (
                        <div
                          key={item.id}
                          className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${statusInfo.color}`}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          title={`${contentTypeLabels[item.content_type] || item.content_type}${item.notes ? `: ${item.notes}` : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <button
                              className="truncate hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = item.status === "planned" ? "generated" : item.status === "generated" ? "published" : "planned";
                                handleUpdateStatus(item.id, nextStatus);
                              }}
                              title="クリックでステータス変更"
                            >
                              {contentTypeLabels[item.content_type] || item.content_type}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="ml-1 opacity-50 hover:opacity-100"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add form dialog (simple inline) */}
        {showAddForm && (
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">予定を追加: {selectedDate}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>コンテンツタイプ</Label>
                  <Select
                    value={newItem.content_type}
                    onValueChange={(v) => setNewItem({ ...newItem, content_type: v as ContentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>スタイリスト（任意）</Label>
                  <Select
                    value={newItem.stylist_id || "__none__"}
                    onValueChange={(v) => setNewItem({ ...newItem, stylist_id: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択なし" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">選択なし</SelectItem>
                      {stylists.map((s: Stylist) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>メモ（任意）</Label>
                <Textarea
                  placeholder="例: 春のトレンドスタイル特集"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          {Object.entries(statusLabels).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${color}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
