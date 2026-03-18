import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { updateEmail, updatePassword } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // メールアドレス変更
  const [newEmail, setNewEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // パスワード変更
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast({
        title: "入力エラー",
        description: "新しいメールアドレスを入力してください",
        variant: "destructive",
      });
      return;
    }
    setIsEmailLoading(true);
    try {
      await updateEmail(newEmail);
      toast({
        title: "確認メール送信済み",
        description:
          "新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。",
      });
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "メールアドレス変更に失敗",
        description: error.message || "もう一度お試しください",
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({
        title: "入力エラー",
        description: "新しいパスワードを入力してください",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "入力エラー",
        description: "パスワードは6文字以上で入力してください",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "入力エラー",
        description: "パスワードが一致しません",
        variant: "destructive",
      });
      return;
    }
    setIsPasswordLoading(true);
    try {
      await updatePassword(newPassword);
      toast({
        title: "パスワード変更完了",
        description: "パスワードが正常に変更されました",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "パスワード変更に失敗",
        description: error.message || "もう一度お試しください",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">設定</h1>
          <p className="text-muted-foreground mt-1">
            アカウント情報の確認・変更ができます
          </p>
        </div>

        {/* アカウント情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              アカウント情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-muted-foreground text-sm">
                メールアドレス
              </Label>
              <p className="font-medium">{user?.email || "未設定"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">
                アカウント作成日
              </Label>
              <p className="font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("ja-JP")
                  : "不明"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* メールアドレス変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              メールアドレス変更
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailChange} className="space-y-4">
              <div>
                <Label htmlFor="newEmail">新しいメールアドレス</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="new-email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isEmailLoading}>
                {isEmailLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                変更する
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* パスワード変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              パスワード変更
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="6文字以上"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">
                  新しいパスワード（確認）
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="もう一度入力"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isPasswordLoading}>
                {isPasswordLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                パスワードを変更する
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* サロン情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-xl">💈</span>
              サロン情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              サロンの基本情報を編集できます
            </p>
            <Button variant="outline" onClick={() => navigate("/salon/setup")}>
              サロン情報を編集する
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
