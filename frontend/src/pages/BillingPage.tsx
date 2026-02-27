import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { apiEndpoints } from "@/lib/api";
import { redirectToCheckout } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
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
  AlertTriangle,
  ExternalLink,
  Check,
  Loader2,
} from "lucide-react";

export default function BillingPage() {
  const { subscription, fetchSubscription } = useAuthStore();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const plan = subscription?.plan || "free";
  const subscriptionStatus = subscription?.status || "active";

  const handleUpgrade = async () => {
    setIsCheckoutLoading(true);
    try {
      const result = await apiEndpoints.billing.createCheckout() as { checkout_url: string };
      redirectToCheckout(result.checkout_url);
    } catch (error) {
      console.error("Checkout作成エラー:", error);
      setIsCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setIsPortalLoading(true);
    try {
      const result = await apiEndpoints.billing.createPortal() as { portal_url: string };
      window.location.href = result.portal_url;
    } catch (error) {
      console.error("Portal作成エラー:", error);
      setIsPortalLoading(false);
    }
  };

  const getTrialRemainingDays = (): number | null => {
    if (!subscription?.trial_end) return null;
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const trialDays = getTrialRemainingDays();

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            プラン・お支払い
          </h1>
          <p className="text-muted-foreground mt-2">
            サブスクリプションの管理
          </p>
        </div>

        {/* 支払い問題がある場合のアラート */}
        {subscriptionStatus === "past_due" && (
          <Card className="mb-6 border-destructive bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    お支払いに問題があります
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    お支払い方法を更新してください。解決しない場合、Proプランの機能が制限されます。
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={handlePortal}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                お支払い方法を更新
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 現在のプラン表示 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
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
                <CardDescription className="mt-1">
                  {plan === "free" &&
                    "月30回のテキスト生成が可能です"}
                  {plan === "pro" &&
                    subscriptionStatus === "trialing" &&
                    trialDays !== null &&
                    `トライアル期間中 — 残り${trialDays}日`}
                  {plan === "pro" &&
                    subscriptionStatus === "active" &&
                    "無制限のテキスト生成をご利用いただけます"}
                  {plan === "pro" &&
                    subscriptionStatus === "past_due" &&
                    "お支払いの確認が必要です"}
                  {plan === "pro" &&
                    subscriptionStatus === "canceled" &&
                    "プランは期間終了時に解約されます"}
                  {plan === "team" &&
                    "Teamプラン — 管理者にお問い合わせください"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* サブスクリプション期間情報 */}
            {subscription?.current_period_end && plan === "pro" && (
              <div className="text-sm text-muted-foreground mb-4">
                <p>
                  次回更新日:{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString(
                    "ja-JP"
                  )}
                </p>
                {subscription.cancel_at_period_end && (
                  <p className="text-orange-600 mt-1">
                    期間終了時に解約予定です
                  </p>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex space-x-3">
              {plan === "free" && (
                <Button
                  onClick={handleUpgrade}
                  disabled={isCheckoutLoading}
                  className="hpb-gradient text-white"
                >
                  {isCheckoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Proプランにアップグレード
                </Button>
              )}
              {plan === "pro" && (
                <Button
                  variant="outline"
                  onClick={handlePortal}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  お支払い管理ポータル
                </Button>
              )}
            </div>
          </CardContent>
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
                    <span>月30回テキスト生成</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>月5本ブログ生成</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>スタイリスト3名まで</span>
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
                </h3>
                <p className="text-2xl font-bold mb-1">月額制</p>
                <p className="text-xs text-muted-foreground mb-3">
                  14日間無料トライアル付き
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>テキスト生成 無制限</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>ブログ生成 無制限</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>スタイリスト20名まで</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>チャット修正 20ターン</span>
                  </li>
                </ul>
                {plan === "free" && (
                  <Button
                    onClick={handleUpgrade}
                    disabled={isCheckoutLoading}
                    size="sm"
                    className="mt-4 w-full"
                  >
                    {isCheckoutLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    14日間無料で試す
                  </Button>
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
                  複数サロン運営向け
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Pro機能すべて</span>
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
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
