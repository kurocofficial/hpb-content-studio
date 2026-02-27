import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { apiEndpoints } from "@/lib/api";
import { redirectToCheckout } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Loader2, X } from "lucide-react";

export default function UpgradeBanner() {
  const { plan } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (plan !== "free" || isDismissed) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await apiEndpoints.billing.createCheckout() as { checkout_url: string };
      redirectToCheckout(result.checkout_url);
    } catch (error) {
      console.error("Checkout作成エラー:", error);
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Crown className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                Proプランで無制限にコンテンツを生成
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                14日間の無料トライアル付き。いつでもキャンセルできます。
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              14日間無料で試す
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
