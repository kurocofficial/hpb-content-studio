/**
 * 認証状態管理ストア（Zustand）
 */
import { create } from "zustand";
import { User, PlanType, Subscription, Organization, OrgRole } from "@/types";
import { api } from "@/lib/api";
import {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  getSession,
} from "@/lib/supabase";

interface AuthState {
  user: User | null;
  plan: PlanType;
  subscription: Subscription | null;
  organization: Organization | null;
  orgRole: OrgRole | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // アクション
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchPlanInfo: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  plan: "free" as PlanType,
  subscription: null,
  organization: null,
  orgRole: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const session = await getSession();

      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email || "",
            created_at: session.user.created_at,
          },
          isInitialized: true,
        });
      } else {
        set({ user: null, isInitialized: true });
      }

      // プラン・組織情報をフェッチ
      if (session?.user) {
        get().fetchPlanInfo();
      }

      // 認証状態の変更をリッスン
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email || "",
              created_at: session.user.created_at,
            },
          });
        } else if (event === "SIGNED_OUT") {
          set({ user: null });
        }
      });
    } catch (error) {
      console.error("認証の初期化に失敗しました:", error);
      set({ isInitialized: true, error: "認証の初期化に失敗しました" });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { user } = await signInWithEmail(email, password);

      if (user) {
        set({
          user: {
            id: user.id,
            email: user.email || "",
            created_at: user.created_at,
          },
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message =
        error.message === "Invalid login credentials"
          ? "メールアドレスまたはパスワードが正しくありません"
          : error.message || "ログインに失敗しました";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { user } = await signUpWithEmail(email, password);

      if (user) {
        set({
          user: {
            id: user.id,
            email: user.email || "",
            created_at: user.created_at,
          },
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message =
        error.message === "User already registered"
          ? "このメールアドレスは既に登録されています"
          : error.message || "アカウント作成に失敗しました";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      await supabaseSignOut();
      set({ user: null, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "ログアウトに失敗しました", isLoading: false });
      throw error;
    }
  },

  fetchPlanInfo: async () => {
    try {
      // 利用量情報からプランを取得
      const usage = await api.get<{ plan: PlanType }>("/api/v1/usage");
      set({ plan: usage.plan });

      // サブスクリプション情報もフェッチ
      get().fetchSubscription();

      // Teamプランの場合、組織情報を取得
      if (usage.plan === "team") {
        try {
          const org = await api.get<Organization & { role?: OrgRole }>(
            "/api/v1/organizations/me"
          );
          set({
            organization: org,
            orgRole: (org as any).role || null,
          });
        } catch {
          // 組織情報取得失敗は無視
        }
      }
    } catch {
      // プラン情報取得失敗はfreeのまま
    }
  },

  fetchSubscription: async () => {
    try {
      const sub = await api.get<Subscription>("/api/v1/billing/subscription");
      set({
        subscription: sub,
        plan: sub.plan as PlanType,
      });
    } catch {
      // サブスク情報取得失敗は無視
    }
  },

  clearError: () => set({ error: null }),
}));
