import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSalonStore } from "@/stores/salonStore";
import { useStylistStore } from "@/stores/stylistStore";
import { useGenerateStore } from "@/stores/generateStore";
import { ContentType, CONTENT_TYPES } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import ResultView from "@/components/preview/ResultView";
import {
  Sparkles,
  FileText,
  User,
  PenLine,
  AlertCircle,
  Wand2,
  MessageSquareReply,
  HelpCircle,
  Star,
  Crown,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Switch } from "@/components/ui/switch";

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  salon_catch: Sparkles,
  salon_intro: FileText,
  stylist_profile: User,
  blog_article: PenLine,
  review_reply: MessageSquareReply,
  consultation: HelpCircle,
  google_review_reply: Star,
};

export default function GeneratePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { salon, fetchSalon } = useSalonStore();
  const { stylists, fetchStylists } = useStylistStore();
  const {
    isGenerating,
    isRetrying,
    generatedContent,
    contentId,
    error,
    abResults,
    generateContent,
    generateAbTest,
    adoptAbPattern,
    setGeneratedContent,
    reset,
  } = useGenerateStore();

  const initialType = CONTENT_TYPES.find(t => t.type === searchParams.get("type"))
    ? (searchParams.get("type") as ContentType)
    : "salon_catch";

  const [selectedContentType, setSelectedContentType] =
    useState<ContentType>(initialType);
  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [blogTheme, setBlogTheme] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [consultationText, setConsultationText] = useState("");
  const [starRating, setStarRating] = useState<number>(5);
  const { plan } = useAuthStore();
  const isPremium = plan === "pro" || plan === "team";
  const [usePastContents, setUsePastContents] = useState(() => isPremium);

  const initialConfig = CONTENT_TYPES.find((t) => t.type === initialType);
  const [targetCharCount, setTargetCharCount] = useState<number>(initialConfig?.maxChars ?? 500);
  const [targetCharInput, setTargetCharInput] = useState<string>(String(initialConfig?.maxChars ?? 500));

  const selectedConfig = CONTENT_TYPES.find(
    (t) => t.type === selectedContentType
  );

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSalon();
    fetchStylists();
    return () => reset();
  }, [fetchSalon, fetchStylists, reset]);

  useEffect(() => {
    const config = CONTENT_TYPES.find((t) => t.type === selectedContentType);
    const maxChars = config?.maxChars ?? 500;
    setTargetCharCount(maxChars);
    setTargetCharInput(String(maxChars));
  }, [selectedContentType]);

  // AB結果が出たら結果エリアへ自動スクロール
  useEffect(() => {
    if (abResults) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [abResults]);

  // 単発生成完了時も結果エリアへ軽くスクロール
  useEffect(() => {
    if (generatedContent && !isGenerating && !abResults) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isGenerating, generatedContent, abResults]);

  const handleGenerate = async () => {
    if (!salon) {
      toast({
        title: "エラー",
        description: "まずサロン情報を登録してください",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateContent(
        selectedContentType,
        (selectedStylistId && selectedStylistId !== "none") ? selectedStylistId : undefined,
        additionalInstructions || undefined,
        selectedContentType === "blog_article" ? blogTheme || undefined : undefined,
        (selectedContentType === "review_reply" || selectedContentType === "google_review_reply") ? reviewText || undefined : undefined,
        selectedContentType === "consultation" ? consultationText || undefined : undefined,
        selectedContentType === "google_review_reply" ? starRating : undefined,
        usePastContents,
        targetCharCount
      );
      toast({
        title: "生成完了",
        description: "コンテンツが生成されました",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "生成エラー",
        description: err.message || "生成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleAbTest = async () => {
    if (!salon) return;
    try {
      await generateAbTest(
        selectedContentType,
        (selectedStylistId && selectedStylistId !== "none") ? selectedStylistId : undefined,
        additionalInstructions || undefined,
        selectedContentType === "blog_article" ? blogTheme || undefined : undefined,
        (selectedContentType === "review_reply" || selectedContentType === "google_review_reply") ? reviewText || undefined : undefined,
        selectedContentType === "consultation" ? consultationText || undefined : undefined,
        selectedContentType === "google_review_reply" ? starRating : undefined,
        usePastContents,
        targetCharCount
      );
      toast({ title: "ABテスト完了", description: "2パターンが生成されました", variant: "success" });
    } catch (err: any) {
      toast({ title: "生成エラー", description: err.message || "ABテスト生成に失敗しました", variant: "destructive" });
    }
  };

  const handleChatModify = () => {
    if (contentId) {
      navigate(`/chat/${contentId}`);
    }
  };

  // サロン未登録の場合
  if (!salon) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                まずサロン情報を登録してください
              </h2>
              <p className="text-muted-foreground mb-4">
                コンテンツを生成するには、先にサロン情報の登録が必要です
              </p>
              <Button onClick={() => navigate("/salon/setup")}>
                サロン情報を登録
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">コンテンツ生成</h1>
          <p className="text-muted-foreground mt-1">
            AIがスタイリストの個性に合わせたテキストを生成します
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Settings */}
          <div className="space-y-6">
            {/* Content type selection */}
            <Card>
              <CardHeader>
                <CardTitle>コンテンツタイプ</CardTitle>
                <CardDescription>生成するコンテンツの種類を選択</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* HPB */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">HPB（ホットペッパービューティー）</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TYPES.filter(t => t.platform === "hpb").map((type) => {
                      const Icon = contentTypeIcons[type.type];
                      const isSelected = selectedContentType === type.type;
                      return (
                        <button
                          key={type.type}
                          onClick={() => setSelectedContentType(type.type)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 mb-2 ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {type.maxChars}文字
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Google */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Google</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TYPES.filter(t => t.platform === "google").map((type) => {
                      const Icon = contentTypeIcons[type.type];
                      const isSelected = selectedContentType === type.type;
                      return (
                        <button
                          key={type.type}
                          onClick={() => setSelectedContentType(type.type)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 mb-2 ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {type.maxChars}文字
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stylist selection */}
            {(selectedContentType === "stylist_profile" ||
              selectedContentType === "blog_article" ||
              selectedContentType === "review_reply" ||
              selectedContentType === "consultation" ||
              selectedContentType === "google_review_reply") && (
              <Card>
                <CardHeader>
                  <CardTitle>スタイリスト選択</CardTitle>
                  <CardDescription>
                    コンテンツの主体となるスタイリストを選択
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedStylistId}
                    onValueChange={setSelectedStylistId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="スタイリストを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">選択なし（サロン全体）</SelectItem>
                      {stylists.map((stylist) => (
                        <SelectItem key={stylist.id} value={stylist.id}>
                          {stylist.name}
                          {stylist.role && ` - ${stylist.role}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {stylists.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate("/stylists/new")}
                      >
                        スタイリストを登録
                      </Button>
                      すると、より個性的なコンテンツを生成できます
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Blog theme (for blog_article) */}
            {selectedContentType === "blog_article" && (
              <Card>
                <CardHeader>
                  <CardTitle>ブログテーマ</CardTitle>
                  <CardDescription>
                    記事のテーマや書きたい内容を入力
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="例: 春のトレンドヘアスタイル、髪質改善について"
                    value={blogTheme}
                    onChange={(e) => setBlogTheme(e.target.value)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Review text (for review_reply / google_review_reply) */}
            {(selectedContentType === "review_reply" || selectedContentType === "google_review_reply") && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedContentType === "google_review_reply" ? "Googleの口コミ" : "お客様の口コミ"}
                  </CardTitle>
                  <CardDescription>
                    返信したい口コミの内容を貼り付けてください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedContentType === "google_review_reply" && (
                    <div>
                      <Label className="mb-2 block">星評価</Label>
                      <Select
                        value={String(starRating)}
                        onValueChange={(v) => setStarRating(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 4, 3, 2, 1].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {"★".repeat(n)}{"☆".repeat(5 - n)} ({n})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Textarea
                    placeholder={
                      selectedContentType === "google_review_reply"
                        ? "例: 初めて来店しました。カットがとても上手で大満足です。店内も清潔感があり..."
                        : "例: 先日はカットとカラーでお世話になりました。仕上がりがとても気に入っています！スタイリストさんの提案も的確で..."
                    }
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={5}
                  />
                </CardContent>
              </Card>
            )}

            {/* Consultation text (for consultation) */}
            {selectedContentType === "consultation" && (
              <Card>
                <CardHeader>
                  <CardTitle>相談内容</CardTitle>
                  <CardDescription>
                    悩みや相談したいことを自由に入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="例: 新規のお客様へのカウンセリングがうまくいかず、リピート率が低いです。どうすれば..."
                    value={consultationText}
                    onChange={(e) => setConsultationText(e.target.value)}
                    rows={5}
                  />
                </CardContent>
              </Card>
            )}

            {/* Target character count */}
            <Card>
              <CardHeader>
                <CardTitle>目標文字数</CardTitle>
                <CardDescription>
                  目安として指定文字数の80〜90%程度で生成します（編集余白を確保）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={selectedConfig?.maxChars}
                    value={targetCharInput}
                    onChange={(e) => setTargetCharInput(e.target.value)}
                    onBlur={() => {
                      const maxChars = selectedConfig?.maxChars ?? 500;
                      const n = Math.floor(Number(targetCharInput));
                      if (!Number.isFinite(n) || n < 1) {
                        setTargetCharCount(maxChars);
                        setTargetCharInput(String(maxChars));
                      } else {
                        const clamped = Math.min(maxChars, n);
                        setTargetCharCount(clamped);
                        setTargetCharInput(String(clamped));
                      }
                    }}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    文字（上限 {selectedConfig?.maxChars?.toLocaleString()}文字）
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Additional instructions */}
            <Card>
              <CardHeader>
                <CardTitle>追加指示（任意）</CardTitle>
                <CardDescription>
                  特別なリクエストや含めたいキーワードなど
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="例: 20代向けのカジュアルな表現で、「透明感」というキーワードを入れてほしい"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Pro features */}
            <Card className={isPremium ? "border-amber-200 bg-amber-50/30" : "border-dashed"}>
              <CardContent className="py-4 space-y-3">
                {/* 過去コンテンツ参照トグル */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-600" />
                    <Label className="text-sm font-medium">過去の記事を参考にする</Label>
                    {!isPremium && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Pro
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={usePastContents}
                    onCheckedChange={setUsePastContents}
                    disabled={!isPremium}
                  />
                </div>
                {isPremium && usePastContents && (
                  <p className="text-xs text-muted-foreground pl-6">
                    過去の生成コンテンツを踏まえて、一貫性のある新しいコンテンツを生成します
                  </p>
                )}

                {/* Pro hint: 詳細メタデータ反映 */}
                {isPremium && (
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <Crown className="h-3.5 w-3.5" />
                    <span>詳細メタデータ（言葉づかい・バックグラウンド・接客スタイル）が反映されます</span>
                  </div>
                )}
                {!isPremium && (
                  <p className="text-xs text-muted-foreground">
                    Proプランにアップグレードすると、詳細メタデータの反映・過去コンテンツ参照が使えます
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Generate buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  (selectedContentType === "consultation" && (!selectedStylistId || selectedStylistId === "none"))
                }
                className="w-full h-12 text-lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 mr-2" />
                    {selectedConfig?.label}を生成
                  </>
                )}
              </Button>
              {isPremium && (
                <Button
                  variant="outline"
                  onClick={handleAbTest}
                  disabled={
                    isGenerating ||
                    (selectedContentType === "consultation" && (!selectedStylistId || selectedStylistId === "none"))
                  }
                  className="w-full"
                >
                  ABテスト生成（2パターン比較）
                </Button>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div ref={resultRef} className="lg:sticky lg:top-4 lg:self-start space-y-4">
            {abResults ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(["a", "b"] as const).map((key) => {
                  const pat = key === "a" ? abResults.pattern_a : abResults.pattern_b;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="text-center text-sm font-semibold text-primary">
                        パターン {key.toUpperCase()}
                      </div>
                      <ResultView
                        content={pat.content}
                        maxChars={pat.max_chars}
                        charCountMode={selectedConfig?.charCountMode || "hpb"}
                        contentId={pat.content_id}
                        isGenerating={false}
                        onChatModify={() => navigate(`/chat/${pat.content_id}`)}
                      />
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          adoptAbPattern(key);
                          toast({
                            title: `パターン${key.toUpperCase()}を採用しました`,
                            description: "編集・再生成ができるようになりました",
                            variant: "success",
                          });
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        このパターンを採用
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ResultView
                content={generatedContent}
                maxChars={selectedConfig?.maxChars || 500}
                charCountMode={selectedConfig?.charCountMode || "hpb"}
                targetChars={targetCharCount}
                contentId={contentId}
                isGenerating={isGenerating}
                isRetrying={isRetrying}
                onEdit={setGeneratedContent}
                onChatModify={handleChatModify}
                onRegenerate={handleGenerate}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
