import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, X, Mail } from "lucide-react";

export default function UpgradeBanner() {
  const { plan } = useAuthStore();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  if (plan !== "free" || isDismissed) return null;

  return (
    <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                Proプランで無制限生成・店舗ルール・過去投稿記憶が使えます
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                現在準備中。KUROCO株式会社へお問い合わせください。
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Button
              size="sm"
              onClick={() => navigate("/billing")}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Mail className="h-4 w-4 mr-1" />
              詳細を見る
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
