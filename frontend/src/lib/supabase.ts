/**
 * Supabase クライアント設定（モック対応）
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// モックモード判定
const isMockMode = import.meta.env.VITE_MOCK_AUTH === "true" || (!supabaseUrl || !supabaseAnonKey);

if (isMockMode) {
  console.info("🔧 モックモードで動作中（Supabase認証をスキップ）");
}

// モックユーザー情報
const MOCK_USER = {
  id: "dev-user-00000000-0000-0000-0000-000000000001",
  email: "dev@example.com",
  created_at: "2024-01-01T00:00:00Z",
};

const MOCK_SESSION = {
  access_token: "mock-access-token-for-development",
  refresh_token: "mock-refresh-token",
  user: MOCK_USER,
};

// Supabaseクライアント（モック時はダミー）
export const supabase = isMockMode
  ? ({
      auth: {
        onAuthStateChange: (callback: any) => {
          // 初回呼び出し時にSIGNED_INイベントを発火
          setTimeout(() => callback("SIGNED_IN", MOCK_SESSION), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
        signInWithPassword: async () => ({ data: MOCK_SESSION, error: null }),
        signUp: async () => ({ data: MOCK_SESSION, error: null }),
        signOut: async () => ({ error: null }),
      },
    } as any)
  : createClient(supabaseUrl!, supabaseAnonKey!);

// 認証状態の変更をリッスン
export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// セッション取得
export const getSession = async () => {
  if (isMockMode) {
    return MOCK_SESSION;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

// ログイン
export const signInWithEmail = async (email: string, password: string) => {
  if (isMockMode) {
    return { user: MOCK_USER, session: MOCK_SESSION };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

// サインアップ
export const signUpWithEmail = async (email: string, password: string) => {
  if (isMockMode) {
    return { user: MOCK_USER, session: MOCK_SESSION };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

// ログアウト
export const signOut = async () => {
  if (isMockMode) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// モックモードかどうかをエクスポート
export const isAuthMockMode = isMockMode;
