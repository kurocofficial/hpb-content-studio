import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import {
  CreditCard,
  Crown,
  Check,
  Mail,
  AlertCircle,
} from "lucide-react";

const CONTACT_EMAIL = "info@kuroco.team";

export default function BillingPage() {
  const { subscription, fetchSubscription } = useAuthStore();

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const plan = subscription?.plan || "free";

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            プラン・お問い合わせ
          </h1>
          <p className="text-muted-foreground mt-2">
            現在のプランと機能の比較
          </p>
        </div>

        {/* 現在のプラン表示 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {plan === "pro" || plan === "team" ? (
                  <Crown className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                )}
                <span>
                  {plan === "team"
                    ? "Teamプラン"
                    : plan === "pro"
                    ? "Proプラン"
                    : "Freeプラン"}
                </span>
              </CardTitle>
            </div>
            <CardDescription>
              {plan === "free" && "月5回まで無料でご利用いただけます"}
              {plan === "pro" && "無制限のテキスト生成をご利用いただけます"}
              {plan === "team" && "Teamプラン — 複数人での運用が可能です"}
            </CardDescription>
          </CardHeader>
          {plan === "free" && (
            <CardContent>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Proプランは現在準備中です</p>
                  <p className="text-sm text-amber-700 mt-1">
                    ご興味のある方はKUROCO株式会社までお気軽にお問い合わせください。
                  </p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    <Mail className="h-4 w-4" />
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* プラン比較 */}
        <Card>
          <CardHeader>
            <CardTitle>プラン比較</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free */}
              <div
                className={`p-4 rounded-lg border ${
                  plan === "free" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <h3 className="font-semibold mb-2">Free</h3>
                <p className="text-2xl font-bold mb-3">¥0</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>テキスト・ブログ生成 月5回</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>スタイリスト3名まで</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>チャット修正 3往復/セッション</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>HPB文字数カウンター</span>
                  </li>
                </ul>
              </div>

              {/* Pro */}
              <div
                className={`p-4 rounded-lg border ${
                  plan === "pro"
                    ? "border-primary bg-primary/5"
                    : "border-yellow-300 bg-yellow-50"
                }`}
              >
                <h3 className="font-semibold mb-2 flex items-center space-x-1">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Pro</span>
                  <span className="ml-1 text-xs font-normal text-muted-foreground px-1.5 py-0.5 bg-amber-100 rounded">準備中</span>
                </h3>
                <p className="text-2xl font-bold mb-1">¥980<span className="text-sm font-normal text-muted-foreground">/月</span></p>
                <ul className="space-y-2 text-sm mt-3">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>テキスト・ブログ生成 無制限</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>スタイリスト20名まで</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>チャット修正 20往復/セッション</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>🏷️ 店舗ルール（タグ付け）</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>📚 過去投稿のAI記憶</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>詳細メタデータ反映</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-yellow-500" />
                    <span>優先サポート</span>
                  </li>
                </ul>
                {plan === "free" && (
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Proプランについてのお問い合わせ`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium h-9 px-4 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    お問い合わせ
                  </a>
                )}
              </div>

              {/* Team */}
              <div
                className={`p-4 rounded-lg border ${
                  plan === "team" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <h3 className="font-semibold mb-2">Team</h3>
                <p className="text-2xl font-bold mb-1">お問い合わせ</p>
                <p className="text-xs text-muted-foreground mb-3">
                  複数サロン運営・チェーン向け
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Proの全機能</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>マルチサロン管理</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>CSV一括登録</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>メンバー管理</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>専任サポート</span>
                  </li>
                </ul>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Teamプランについてのお問い合わせ`}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium h-9 px-4 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  お問い合わせ
                </a>
              </div>
            </div>

            {/* お問い合わせ先 */}
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                ご不明な点は{" "}
                <span className="font-medium text-foreground">KUROCO株式会社</span>{" "}
                までお気軽にご連絡ください
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
