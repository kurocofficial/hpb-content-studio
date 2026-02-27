import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const { fetchSubscription, fetchPlanInfo } = useAuthStore();

  useEffect(() => {
    // サブスクリプション情報を再取得
    fetchSubscription();
    fetchPlanInfo();
  }, [fetchSubscription, fetchPlanInfo]);

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto mt-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              Proプランへようこそ！
            </CardTitle>
            <CardDescription className="mt-2">
              アップグレードが完了しました。すべてのPro機能をお楽しみください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p>14日間の無料トライアルが開始されました。</p>
              <p>トライアル期間中はすべてのPro機能を無料でご利用いただけます。</p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => navigate("/dashboard")}>
                ダッシュボードへ
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/billing")}
              >
                プラン詳細を確認
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
