/**
 * 組織状態管理ストア（Zustand）
 */
import { create } from "zustand";
import { Organization, OrganizationMember, Salon, CsvImportJob } from "@/types";
import { api } from "@/lib/api";

interface OrganizationState {
  organization: Organization | null;
  members: OrganizationMember[];
  orgSalons: Salon[];
  importJobs: CsvImportJob[];
  isLoading: boolean;
  error: string | null;

  // アクション
  fetchOrganization: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchOrgSalons: () => Promise<void>;
  fetchImportJobs: () => Promise<void>;
  addMember: (email: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organization: null,
  members: [],
  orgSalons: [],
  importJobs: [],
  isLoading: false,
  error: null,

  fetchOrganization: async () => {
    set({ isLoading: true, error: null });
    try {
      const org = await api.get<Organization>("/api/v1/organizations/me");
      set({ organization: org, isLoading: false });
    } catch {
      // 404 は組織未所属
      set({ organization: null, isLoading: false });
    }
  },

  fetchMembers: async () => {
    const { organization } = get();
    if (!organization) return;
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<{ items: OrganizationMember[]; total: number }>(
        `/api/v1/organizations/${organization.id}/members`
      );
      set({ members: data.items, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchOrgSalons: async () => {
    const { organization } = get();
    if (!organization) return;
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<{ items: Salon[]; total: number }>(
        `/api/v1/organizations/${organization.id}/salons`
      );
      set({ orgSalons: data.items, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchImportJobs: async () => {
    const { organization } = get();
    if (!organization) return;
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<{ items: CsvImportJob[]; total: number }>(
        `/api/v1/organizations/${organization.id}/import/jobs`
      );
      set({ importJobs: data.items, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addMember: async (email: string, role: string) => {
    const { organization } = get();
    if (!organization) throw new Error("組織に所属していません");
    set({ isLoading: true, error: null });
    try {
      await api.post(`/api/v1/organizations/${organization.id}/members`, {
        email,
        role,
      });
      await get().fetchMembers();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeMember: async (userId: string) => {
    const { organization } = get();
    if (!organization) throw new Error("組織に所属していません");
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/organizations/${organization.id}/members/${userId}`);
      await get().fetchMembers();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  reset: () =>
    set({
      organization: null,
      members: [],
      orgSalons: [],
      importJobs: [],
      isLoading: false,
      error: null,
    }),
}));
