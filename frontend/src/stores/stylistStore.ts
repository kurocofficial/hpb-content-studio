/**
 * スタイリスト状態管理ストア（Zustand）
 */
import { create } from "zustand";
import { Stylist, StylistCreateInput } from "@/types";
import { api } from "@/lib/api";

interface StylistListResponse {
  items: Stylist[];
  total: number;
}

interface StylistState {
  stylists: Stylist[];
  selectedStylist: Stylist | null;
  isLoading: boolean;
  error: string | null;

  // アクション
  fetchStylists: () => Promise<void>;
  fetchStylist: (id: string) => Promise<void>;
  createStylist: (data: StylistCreateInput) => Promise<Stylist>;
  updateStylist: (id: string, data: Partial<StylistCreateInput>) => Promise<void>;
  deleteStylist: (id: string) => Promise<void>;
  selectStylist: (stylist: Stylist | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useStylistStore = create<StylistState>((set, get) => ({
  stylists: [],
  selectedStylist: null,
  isLoading: false,
  error: null,

  fetchStylists: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<StylistListResponse>("/api/v1/stylists");
      set({ stylists: response.items, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStylist: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const stylist = await api.get<Stylist>(`/api/v1/stylists/${id}`);
      set({ selectedStylist: stylist, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createStylist: async (data: StylistCreateInput) => {
    set({ isLoading: true, error: null });
    try {
      const stylist = await api.post<Stylist>("/api/v1/stylists", data);
      set((state) => ({
        stylists: [...state.stylists, stylist],
        isLoading: false,
      }));
      return stylist;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateStylist: async (id: string, data: Partial<StylistCreateInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStylist = await api.put<Stylist>(`/api/v1/stylists/${id}`, data);
      set((state) => ({
        stylists: state.stylists.map((s) =>
          s.id === id ? updatedStylist : s
        ),
        selectedStylist:
          state.selectedStylist?.id === id ? updatedStylist : state.selectedStylist,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteStylist: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/stylists/${id}`);
      set((state) => ({
        stylists: state.stylists.filter((s) => s.id !== id),
        selectedStylist:
          state.selectedStylist?.id === id ? null : state.selectedStylist,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  selectStylist: (stylist: Stylist | null) => {
    set({ selectedStylist: stylist });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      stylists: [],
      selectedStylist: null,
      isLoading: false,
      error: null,
    }),
}));
