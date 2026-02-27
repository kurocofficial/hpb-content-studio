import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { GeneratedContent, ContentType, CONTENT_TYPES } from "@/types";
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
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import CopyButton from "@/components/preview/CopyButton";
import {
  Sparkles,
  FileText,
  User,
  PenLine,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MessageSquareReply,
  HelpCircle,
  Star,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface ContentListResponse {
  items: GeneratedContent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  salon_catch: Sparkles,
  salon_intro: FileText,
  stylist_profile: User,
  blog_article: PenLine,
  review_reply: MessageSquareReply,
  consultation: HelpCircle,
  google_review_reply: Star,
};

const contentTypeLabels: Record<ContentType, string> = {
  salon_catch: "サロンキャッチ",
  salon_intro: "サロン紹介文",
  stylist_profile: "スタイリストプロフィール",
  blog_article: "ブログ記事",
  review_reply: "口コミ返信",
  consultation: "悩み相談",
  google_review_reply: "Google口コミ返信",
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchContents();
  }, [page, filterType]);

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "10",
      });
      if (filterType !== "all") {
        params.append("content_type", filterType);
      }

      const response = await api.get<ContentListResponse>(
        `/api/v1/contents?${params.toString()}`
      );
      setContents(response.items);
      setTotalPages(response.total_pages);
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "履歴の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このコンテンツを削除してもよろしいですか？")) {
      return;
    }

    try {
      await api.delete(`/api/v1/contents/${id}`);
      toast({
        title: "削除完了",
        description: "コンテンツを削除しました",
        variant: "success",
      });
      fetchContents();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">生成履歴</h1>
            <p className="text-muted-foreground mt-1">
              過去に生成したコンテンツ一覧
            </p>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.type} value={type.type}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">読み込み中...</p>
          </div>
        ) : contents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                まだコンテンツがありません
              </h2>
              <p className="text-muted-foreground mb-4">
                コンテンツを生成すると、ここに履歴が表示されます
              </p>
              <Button onClick={() => navigate("/generate")}>
                コンテンツを生成する
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {contents.map((content) => {
              const Icon = contentTypeIcons[content.content_type];
              const label = contentTypeLabels[content.content_type];

              return (
                <Card key={content.id} className="hpb-card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{label}</CardTitle>
                          <CardDescription>
                            {formatRelativeTime(content.created_at)}
                            {" • "}
                            {content.char_count}文字
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/chat/${content.id}`)}
                          title="チャットで修正"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(content.id)}
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {content.content}
                    </p>
                    <div className="flex justify-end">
                      <CopyButton text={content.content} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
