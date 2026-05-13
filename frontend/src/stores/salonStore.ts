/**
 * サロン状態管理ストア（Zustand）
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Salon, SalonCreateInput } from "@/types";
import { api } from "@/lib/api";

interface SalonState {
  salon: Salon | null;
  salons: Salon[]; // Team用マルチサロン
  activeSalonId: string | null; // Team用: 選択中のサロン
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;

  // アクション
  fetchSalon: () => Promise<void>;
  createSalon: (data: SalonCreateInput) => Promise<void>;
  updateSalon: (data: Partial<SalonCreateInput>) => Promise<void>;
  setSalons: (salons: Salon[]) => void;
  setActiveSalon: (id: string) => void;
  clearError: () => void;
  clearSalon: () => void;
  reset: () => void;
}

export const useSalonStore = create<SalonState>()(
  persist(
    (set, get) => ({
      salon: null,
      salons: [],
      activeSalonId: null,
      isLoading: false,
      hasFetched: false,
      error: null,

      fetchSalon: async () => {
        set({ isLoading: true, error: null });
        try {
          const salon = await api.get<Salon>("/api/v1/salons/me");
          set({ salon, isLoading: false, hasFetched: true });
        } catch (error: any) {
          // 404は正常（サロン未登録）
          if (error.message?.includes("404") || error.message?.includes("登録されていません")) {
            set({ salon: null, isLoading: false, hasFetched: true });
          } else {
            set({ error: error.message, isLoading: false, hasFetched: true });
          }
        }
      },

      createSalon: async (data: SalonCreateInput) => {
        set({ isLoading: true, error: null });
        try {
          const salon = await api.post<Salon>("/api/v1/salons", data);
          set({ salon, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateSalon: async (data: Partial<SalonCreateInput>) => {
        set({ isLoading: true, error: null });
        try {
          const salon = await api.put<Salon>("/api/v1/salons/me", data);
          set({ salon, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      setSalons: (salons: Salon[]) => {
        set({ salons });
        // activeSalonIdが未設定なら最初のサロンを選択
        const { activeSalonId } = get();
        if (!activeSalonId && salons.length > 0) {
          set({ activeSalonId: salons[0].id });
        }
      },

      setActiveSalon: (id: string) => set({ activeSalonId: id }),

      clearError: () => set({ error: null }),

      clearSalon: () => set({ salon: null, hasFetched: false, isLoading: false }),

      reset: () => set({ salon: null, salons: [], activeSalonId: null, isLoading: false, hasFetched: false, error: null }),
    }),
    {
      name: "salon-storage",
      // salonデータのみ永続化（ローディング状態等は除外）
      partialize: (state) => ({ salon: state.salon }),
      // ストレージからリストアされた際、salonがあればfetched済み扱いにする
      onRehydrateStorage: () => (state) => {
        if (state && state.salon !== null) {
          state.hasFetched = true;
        }
      },
    }
  )
);
