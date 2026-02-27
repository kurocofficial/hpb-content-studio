/**
 * 認証フック
 */
import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/useToast";

export function useAuth() {
  const {
    user,
    isLoading,
    isInitialized,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  } = useAuthStore();

  const { toast } = useToast();

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      try {
        await signIn(email, password);
        toast({
          title: "ログイン成功",
          description: "ダッシュボードに移動します",
          variant: "success",
        });
        return true;
      } catch (error: any) {
        toast({
          title: "ログイン失敗",
          description: error.message || "ログインに失敗しました",
          variant: "destructive",
        });
        return false;
      }
    },
    [signIn, toast]
  );

  const handleSignUp = useCallback(
    async (email: string, password: string) => {
      try {
        await signUp(email, password);
        toast({
          title: "アカウント作成成功",
          description: "確認メールをご確認ください",
          variant: "success",
        });
        return true;
      } catch (error: any) {
        toast({
          title: "アカウント作成失敗",
          description: error.message || "アカウント作成に失敗しました",
          variant: "destructive",
        });
        return false;
      }
    },
    [signUp, toast]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: "ログアウト",
        description: "ログアウトしました",
        variant: "success",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "エラー",
        description: "ログアウトに失敗しました",
        variant: "destructive",
      });
      return false;
    }
  }, [signOut, toast]);

  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError,
  };
}
