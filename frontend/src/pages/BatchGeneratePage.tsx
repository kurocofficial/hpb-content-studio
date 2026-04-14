import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSalonStore } from "@/stores/salonStore";
import { useStylistStore } from "@/stores/stylistStore";
import { useAuthStore } from "@/stores/authStore";
import { ContentType, CONTENT_TYPES, Stylist } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import CopyButton from "@/components/preview/CopyButton";
import { getSession } from "@/lib/supabase";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Crown,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

interface BatchResult {
  index: number;
  status: "success" | "error";
  content_id?: string;
  content?: string;
  stylist_name?: string;
  content_type?: string;
  char_count?: number;
  error?: string;
}

const contentTypeLabels: Record<string, string> = {
  salon_catch: "サロンキャッチ",
  salon_intro: "サロン紹介文",
  stylist_profile: "スタイリストプロフィール",
  blog_article: "ブログ記事",
  review_reply: "口コミ返信",
  consultation: "悩み相談",
  google_review_reply: "Google口コミ返信",
};

export default function BatchGeneratePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchSalon } = useSalonStore();
  const { stylists, fetchStylists } = useStylistStore();
  const { plan } = useAuthStore();
  const isPremium = plan === "pro" || plan === "team";

  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>("stylist_profile");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);

  useEffect(() => {
    fetchSalon();
    fetchStylists();
  }, [fetchSalon, fetchStylists]);

  const toggleStylist = (id: string) => {
    setSelectedStylistIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleBatchGenerate = async () => {
    if (selectedStylistIds.length === 0) {
      toast({ title: "エラー", description: "スタイリストを選択してください", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setProgress({ completed: 0, total: selectedStylistIds.length });

    try {
      const session = await getSession();
      if (!session?.access_token) throw new Error("認証が必要です");

      const items = selectedStylistIds.map((stylistId) => ({
        stylist_id: stylistId,
        content_type: selectedContentType,
      }));

      const response = await fetch(`${API_URL}/api/v1/generate/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ items, use_past_contents: false }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "一括生成に失敗しました");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ストリームが取得できませんでした");

      const decoder = new TextDecoder();
      const newResults: BatchResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "progress") {
                setProgress({ completed: parsed.completed, total: parsed.total });
                newResults.push(parsed.result);
                setResults([...newResults]);
              }
              if (parsed.type === "complete") {
                toast({
                  title: "一括生成完了",
                  description: `${parsed.success_count}件成功、${parsed.error_count}件エラー`,
                  variant: parsed.error_count > 0 ? "destructive" : "success",
                });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      toast({ title: "エラー", description: error.message || "一括生成に失敗しました", variant: "destructive" });
    } finally {
      setIsGenerating(false);
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
                一括生成はProプラン以上で利用できます
              </h2>
              <p className="text-muted-foreground mb-4">
                複数スタイリスト分のコンテンツを一度に生成できます
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

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            一括生成
          </h1>
          <p className="text-muted-foreground mt-1">
            複数スタイリストのコンテンツをまとめて生成します
          </p>
        </div>

        <div className="space-y-6">
          {/* Content type */}
          <Card>
            <CardHeader>
              <CardTitle>コンテンツタイプ</CardTitle>
              <CardDescription>一括生成するコンテンツの種類</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedContentType}
                onValueChange={(v) => setSelectedContentType(v as ContentType)}
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
            </CardContent>
          </Card>

          {/* Stylist selection */}
          <Card>
            <CardHeader>
              <CardTitle>スタイリスト選択</CardTitle>
              <CardDescription>
                生成対象のスタイリストを選択（複数選択可）
                {selectedStylistIds.length > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    {selectedStylistIds.length}名選択中
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stylists.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  スタイリストが登録されていません。
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/stylists/new")}>
                    登録する
                  </Button>
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stylists.map((stylist: Stylist) => {
                    const isSelected = selectedStylistIds.includes(stylist.id);
                    return (
                      <button
                        key={stylist.id}
                        onClick={() => toggleStylist(stylist.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all text-sm ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-medium">{stylist.name}</div>
                        {stylist.role && (
                          <div className="text-xs text-muted-foreground">{stylist.role}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {stylists.length > 0 && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStylistIds(stylists.map((s: Stylist) => s.id))}
                  >
                    全選択
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStylistIds([])}
                  >
                    全解除
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            onClick={handleBatchGenerate}
            disabled={isGenerating || selectedStylistIds.length === 0}
            className="w-full h-12 text-lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                生成中... ({progress.completed}/{progress.total})
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                {selectedStylistIds.length}名分の{contentTypeLabels[selectedContentType]}を一括生成
              </>
            )}
          </Button>

          {/* Progress */}
          {isGenerating && progress.total > 0 && (
            <Progress value={(progress.completed / progress.total) * 100} />
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>生成結果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.map((result, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      result.status === "success"
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {result.stylist_name || `アイテム ${result.index + 1}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {contentTypeLabels[result.content_type || ""] || ""}
                        </span>
                      </div>
                      {result.status === "success" && result.content && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {result.char_count}文字
                          </span>
                          <CopyButton text={result.content} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/chat/${result.content_id}`)}
                          >
                            修正
                          </Button>
                        </div>
                      )}
                    </div>
                    {result.status === "success" && result.content && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {result.content}
                      </p>
                    )}
                    {result.status === "error" && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
