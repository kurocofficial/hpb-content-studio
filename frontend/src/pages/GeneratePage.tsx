import { useState, useEffect } from "react";
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
} from "lucide-react";

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
    generatedContent,
    contentId,
    error,
    generateContent,
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

  const selectedConfig = CONTENT_TYPES.find(
    (t) => t.type === selectedContentType
  );

  useEffect(() => {
    fetchSalon();
    fetchStylists();
    return () => reset();
  }, [fetchSalon, fetchStylists, reset]);

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
        selectedContentType === "google_review_reply" ? starRating : undefined
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

            {/* Generate button */}
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

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <ResultView
              content={generatedContent}
              maxChars={selectedConfig?.maxChars || 500}
              charCountMode={selectedConfig?.charCountMode || "hpb"}
              contentId={contentId}
              isGenerating={isGenerating}
              onEdit={setGeneratedContent}
              onChatModify={handleChatModify}
              onRegenerate={handleGenerate}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
