import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSalonStore } from "@/stores/salonStore";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MainLayout from "@/components/layout/MainLayout";
import {
  Sparkles,
  FileText,
  User,
  PenLine,
  Store,
  Users,
  ArrowRight,
  MessageSquareReply,
  HelpCircle,
  Star,
  Upload,
  Building2,
} from "lucide-react";
import UpgradeBanner from "@/components/billing/UpgradeBanner";

interface UsageSummary {
  plan: string;
  text_generation: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
  blog_generation: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { salon, fetchSalon } = useSalonStore();
  const { plan } = useAuthStore();
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    fetchSalon();
    fetchUsage();
  }, [fetchSalon]);

  const fetchUsage = async () => {
    try {
      const data = await api.get<UsageSummary>("/api/v1/usage");
      setUsage(data);
    } catch {
      // エラーは無視（未認証時など）
    }
  };

  const contentTypes = [
    {
      type: "salon_catch",
      icon: Sparkles,
      title: "サロンキャッチ",
      description: "HPBトップに表示される短いキャッチコピー",
      maxChars: 45,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
    },
    {
      type: "salon_intro",
      icon: FileText,
      title: "サロン紹介文",
      description: "サロンの魅力を伝える紹介文",
      maxChars: 500,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      type: "stylist_profile",
      icon: User,
      title: "スタイリストプロフィール",
      description: "スタイリストの個性が伝わる自己紹介",
      maxChars: 200,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      type: "blog_article",
      icon: PenLine,
      title: "ブログ記事",
      description: "季節のスタイル提案やサロン情報を発信",
      maxChars: 10000,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      type: "review_reply",
      icon: MessageSquareReply,
      title: "口コミ返信",
      description: "お客様の口コミに対する返信文を作成",
      maxChars: 500,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      type: "consultation",
      icon: HelpCircle,
      title: "悩み相談",
      description: "スタイリストの悩みにAIがアドバイス",
      maxChars: 2000,
      color: "text-pink-500",
      bgColor: "bg-pink-50",
    },
    {
      type: "google_review_reply",
      icon: Star,
      title: "Google口コミ返信",
      description: "Googleマップの口コミに対する返信文を作成",
      maxChars: 500,
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
  ];

  const textUsagePercent = usage?.text_generation?.limit
    ? (usage.text_generation.used / usage.text_generation.limit) * 100
    : 0;
  const blogUsagePercent = usage?.blog_generation?.limit
    ? (usage.blog_generation.used / usage.blog_generation.limit) * 100
    : 0;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* Upgrade banner for free users */}
        <UpgradeBanner />

        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            HPBコンテンツを作成しましょう
          </h1>
          <p className="text-muted-foreground mt-2">
            AIがスタイリストの個性に合わせたテキストを生成します
          </p>
        </div>

        {/* Quick setup cards */}
        {!salon && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Store className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">まずはサロン情報を設定しましょう</p>
                    <p className="text-sm text-muted-foreground">
                      サロンの情報を登録すると、より個性的なコンテンツが生成できます
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/salon/setup")}>
                  サロン設定
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {salon && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="hpb-card-hover cursor-pointer" onClick={() => navigate("/salon/setup")}>
              <CardContent className="py-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{salon.name}</p>
                    <p className="text-sm text-muted-foreground">{salon.area}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card className="hpb-card-hover cursor-pointer" onClick={() => navigate("/stylists")}>
              <CardContent className="py-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">スタイリスト管理</p>
                    <p className="text-sm text-muted-foreground">
                      スタイリストを登録・編集
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team quick actions */}
        {plan === "team" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card
              className="hpb-card-hover cursor-pointer"
              onClick={() => navigate("/team/salons")}
            >
              <CardContent className="py-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">サロン一覧</p>
                    <p className="text-sm text-muted-foreground">
                      マルチサロン管理
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card
              className="hpb-card-hover cursor-pointer"
              onClick={() => navigate("/team/import")}
            >
              <CardContent className="py-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">CSV一括登録</p>
                    <p className="text-sm text-muted-foreground">
                      サロン・スタイリストをまとめて登録
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content type cards */}
        <h2 className="text-xl font-semibold mb-4">コンテンツを生成</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {contentTypes.map((type) => (
            <Card
              key={type.title}
              className="hpb-card-hover cursor-pointer"
              onClick={() => navigate(`/generate?type=${type.type}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{type.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {type.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    最大{type.maxChars.toLocaleString()}文字
                  </span>
                  <Button variant="outline" size="sm">
                    生成する
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage stats */}
        <Card>
          <CardHeader>
            <CardTitle>今月の利用状況</CardTitle>
            <CardDescription>
              {usage?.plan === "team"
                ? "Teamプラン: 無制限"
                : usage?.plan === "pro"
                ? "Proプラン: 無制限"
                : "Freeプラン: 月30回まで生成可能"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>テキスト生成</span>
                <span>
                  {usage?.text_generation?.used || 0}
                  {usage?.text_generation?.limit
                    ? ` / ${usage.text_generation.limit}`
                    : ""}{" "}
                  回
                </span>
              </div>
              <Progress value={textUsagePercent} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>ブログ生成</span>
                <span>
                  {usage?.blog_generation?.used || 0}
                  {usage?.blog_generation?.limit
                    ? ` / ${usage.blog_generation.limit}`
                    : ""}{" "}
                  本
                </span>
              </div>
              <Progress value={blogUsagePercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
