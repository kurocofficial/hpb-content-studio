import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

const JUST_SIGNED_UP_KEY = "just_signed_up";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!sessionStorage.getItem(JUST_SIGNED_UP_KEY)) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleToDashboard = () => {
    sessionStorage.removeItem(JUST_SIGNED_UP_KEY);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hpb-light to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="hpb-gradient text-white font-bold text-xl px-4 py-2 rounded-lg inline-block mb-8">
          HPB Content Studio
        </div>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          アカウントを作成しました
        </h1>
        <p className="text-muted-foreground text-sm mb-1">
          認証メールを送信しました
        </p>
        <p className="text-sm font-medium text-foreground mb-6">
          {user?.email}
        </p>

        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6 text-left">
          <p className="text-sm text-muted-foreground leading-relaxed">
            メール内の認証リンクをクリックすると、アカウントが有効化されます。
            メールが届かない場合は迷惑メールフォルダをご確認ください。
          </p>
        </div>

        <Button className="w-full" onClick={handleToDashboard}>
          ダッシュボードへ進む
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          認証前でもサービスをご利用いただけます
        </p>
      </div>
    </div>
  );
}
