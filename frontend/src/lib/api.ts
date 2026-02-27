/**
 * API クライアント
 */
import { getSession } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "APIエラーが発生しました");
    }

    return response.json();
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "APIエラーが発生しました");
    }

    return response.json();
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "APIエラーが発生しました");
    }

    return response.json();
  }

  async delete<T>(path: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "APIエラーが発生しました");
    }

    return response.json();
  }

  // ファイルアップロード対応のPOST
  async uploadFile<T>(path: string, file: File): Promise<T> {
    const session = await getSession();
    const headers: HeadersInit = {};

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "APIエラーが発生しました");
    }

    return response.json();
  }

  // ストリーミング対応のPOST
  async postStream(
    path: string,
    data: unknown,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...headers,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "APIエラーが発生しました");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("ストリームが取得できませんでした");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch {
            // JSON以外のデータは無視
          }
        }
      }
    }
  }
}

export const api = new ApiClient(API_URL);

// API エンドポイント別のヘルパー
export const apiEndpoints = {
  // ヘルスチェック
  health: () => api.get<{ status: string }>("/api/v1/health"),

  // 認証
  auth: {
    me: () => api.get("/api/v1/auth/me"),
  },

  // サロン
  salons: {
    get: () => api.get("/api/v1/salons/me"),
    create: (data: unknown) => api.post("/api/v1/salons", data),
    update: (data: unknown) => api.put("/api/v1/salons/me", data),
  },

  // スタイリスト
  stylists: {
    list: () => api.get("/api/v1/stylists"),
    get: (id: string) => api.get(`/api/v1/stylists/${id}`),
    create: (data: unknown) => api.post("/api/v1/stylists", data),
    update: (id: string, data: unknown) =>
      api.put(`/api/v1/stylists/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/stylists/${id}`),
  },

  // コンテンツ生成
  generate: {
    text: (data: unknown, onChunk: (chunk: string) => void) =>
      api.postStream("/api/v1/generate/text", data, onChunk),
  },

  // チャット
  chat: {
    createSession: (contentId: string) =>
      api.post("/api/v1/chat/sessions", { content_id: contentId }),
    sendMessage: (sessionId: string, message: string) =>
      api.post(`/api/v1/chat/sessions/${sessionId}/messages`, { message }),
  },

  // コンテンツ履歴
  contents: {
    list: (page?: number, pageSize?: number) =>
      api.get(`/api/v1/contents?page=${page || 1}&page_size=${pageSize || 20}`),
    get: (id: string) => api.get(`/api/v1/contents/${id}`),
    delete: (id: string) => api.delete(`/api/v1/contents/${id}`),
  },

  // 利用量
  usage: {
    get: () => api.get("/api/v1/usage"),
  },

  // 組織
  organizations: {
    me: () => api.get("/api/v1/organizations/me"),
    update: (orgId: string, data: unknown) =>
      api.put(`/api/v1/organizations/${orgId}`, data),
    members: (orgId: string) =>
      api.get(`/api/v1/organizations/${orgId}/members`),
    addMember: (orgId: string, data: unknown) =>
      api.post(`/api/v1/organizations/${orgId}/members`, data),
    removeMember: (orgId: string, userId: string) =>
      api.delete(`/api/v1/organizations/${orgId}/members/${userId}`),
    salons: (orgId: string) =>
      api.get(`/api/v1/organizations/${orgId}/salons`),
  },

  // 決済
  billing: {
    createCheckout: (data?: unknown) =>
      api.post("/api/v1/billing/create-checkout", data || {}),
    createPortal: (data?: unknown) =>
      api.post("/api/v1/billing/portal", data || {}),
    getSubscription: () => api.get("/api/v1/billing/subscription"),
  },

  // CSVインポート
  csvImport: {
    importSalons: (orgId: string, file: File) =>
      api.uploadFile(`/api/v1/organizations/${orgId}/import/salons`, file),
    importStylists: (orgId: string, file: File) =>
      api.uploadFile(`/api/v1/organizations/${orgId}/import/stylists`, file),
    jobs: (orgId: string) =>
      api.get(`/api/v1/organizations/${orgId}/import/jobs`),
    job: (orgId: string, jobId: string) =>
      api.get(`/api/v1/organizations/${orgId}/import/jobs/${jobId}`),
  },
};
