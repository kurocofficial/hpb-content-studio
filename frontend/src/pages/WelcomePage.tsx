import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Store, Users, Sparkles } from "lucide-react";

const JUST_SIGNED_UP_KEY = "just_signed_up";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // フラグがなければダッシュボードへ（URL直打ち・再ログイン対策）
    if (!sessionStorage.getItem(JUST_SIGNED_UP_KEY)) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleStart = () => {
    sessionStorage.removeItem(JUST_SIGNED_UP_KEY);
    navigate("/salon/setup");
  };

  const handleSkip = () => {
    sessionStorage.removeItem(JUST_SIGNED_UP_KEY);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hpb-light to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="hpb-gradient text-white font-bold text-xl px-4 py-2 rounded-lg inline-block mb-6">
            HPB Content Studio
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            ようこそ！🎉
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {user?.email} でアカウントを作成しました
          </p>
        </div>

        {/* 3ステップ進捗バー */}
        <div className="flex items-start justify-center mb-8 gap-0">
          {/* Step 1: 完了 */}
          <div className="flex flex-col items-center w-28">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div className="h-1 w-0" />
            <p className="text-xs text-primary font-semibold mt-2 text-center">
              アカウント作成
            </p>
            <p className="text-xs text-primary mt-0.5">✓ 完了</p>
          </div>

          <div className="h-1 w-16 bg-primary mt-5 flex-shrink-0" />

          {/* Step 2: 次のステップ */}
          <div className="flex flex-col items-center w-28">
            <div className="w-10 h-10 rounded-full border-2 border-primary bg-white flex items-center justify-center shadow-sm">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-foreground font-semibold mt-2 text-center">
              サロン情報登録
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">← 次はここ</p>
          </div>

          <div className="h-1 w-16 bg-muted mt-5 flex-shrink-0" />

          {/* Step 3: 未完了 */}
          <div className="flex flex-col items-center w-28">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              スタイリスト登録
            </p>
          </div>
        </div>

        {/* カード */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">
              サロン情報を登録しましょう
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            サロン名・エリア・コンセプトを登録すると、AIがあなたのサロンにぴったりのテキストを生成できるようになります。
          </p>
          <ul className="text-sm space-y-2 mb-6 text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              サロン名・エリア・コンセプト（必須）
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              ターゲット顧客・強み（任意・精度向上）
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              登録後すぐにコンテンツ生成ができます
            </li>
          </ul>
          <Button className="w-full" size="lg" onClick={handleStart}>
            <Store className="h-4 w-4 mr-2" />
            サロン情報を登録する
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <button
            onClick={handleSkip}
            className="hover:underline hover:text-foreground transition-colors"
          >
            あとで登録する → ダッシュボードへ
          </button>
        </p>
      </div>
    </div>
  );
}
