import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail } from "lucide-react";

const JUST_SIGNED_UP_KEY = "just_signed_up";

export default function WelcomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem(JUST_SIGNED_UP_KEY)) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

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
        <p className="text-muted-foreground text-sm mb-6">
          認証メールを送信しました
        </p>

        <div className="bg-white rounded-xl border shadow-sm p-6 mb-6 text-left">
          <p className="text-sm text-muted-foreground leading-relaxed">
            メール内の認証リンクをクリックすると、アカウントが有効化されます。
            認証が完了したら、ログインページからサービスをご利用ください。
            メールが届かない場合は迷惑メールフォルダをご確認ください。
          </p>
        </div>

        <Link
          to="/login"
          className="text-sm text-primary hover:underline"
          onClick={() => sessionStorage.removeItem(JUST_SIGNED_UP_KEY)}
        >
          ログインページへ
        </Link>
      </div>
    </div>
  );
}
