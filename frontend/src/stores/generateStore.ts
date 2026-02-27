/**
 * コンテンツ生成状態管理ストア（Zustand）
 */
import { create } from "zustand";
import { ContentType, GeneratedContent } from "@/types";
import { getSession } from "@/lib/supabase";

interface GenerateState {
  isGenerating: boolean;
  generatedContent: string;
  contentId: string | null;
  charCount: number;
  maxChars: number;
  isOverLimit: boolean;
  error: string | null;

  // アクション
  generateContent: (
    contentType: ContentType,
    stylistId?: string,
    additionalInstructions?: string,
    blogTheme?: string,
    reviewText?: string,
    consultationText?: string,
    starRating?: number
  ) => Promise<void>;
  setGeneratedContent: (content: string) => void;
  reset: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const useGenerateStore = create<GenerateState>((set, get) => ({
  isGenerating: false,
  generatedContent: "",
  contentId: null,
  charCount: 0,
  maxChars: 0,
  isOverLimit: false,
  error: null,

  generateContent: async (
    contentType: ContentType,
    stylistId?: string,
    additionalInstructions?: string,
    blogTheme?: string,
    reviewText?: string,
    consultationText?: string,
    starRating?: number
  ) => {
    set({
      isGenerating: true,
      generatedContent: "",
      contentId: null,
      charCount: 0,
      error: null,
    });

    try {
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error("認証が必要です");
      }

      const response = await fetch(`${API_URL}/api/v1/generate/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          content_type: contentType,
          stylist_id: stylistId || null,
          additional_instructions: additionalInstructions || null,
          blog_theme: blogTheme || null,
          review_text: reviewText || null,
          consultation_text: consultationText || null,
          star_rating: starRating || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "生成に失敗しました");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("ストリームが取得できませんでした");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";

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

              if (parsed.type === "error") {
                throw new Error(parsed.content);
              }

              if (parsed.type === "chunk") {
                accumulatedContent += parsed.content;
                set({ generatedContent: accumulatedContent });
              }

              if (parsed.type === "complete") {
                set({
                  contentId: parsed.content_id,
                  charCount: parsed.char_count,
                  maxChars: parsed.max_chars,
                  isOverLimit: parsed.is_over_limit,
                });
              }
            } catch (e) {
              // JSON以外のデータは無視
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      set({ isGenerating: false });
    } catch (error: any) {
      set({
        isGenerating: false,
        error: error.message || "生成に失敗しました",
      });
      throw error;
    }
  },

  setGeneratedContent: (content: string) => {
    set({ generatedContent: content });
  },

  reset: () => {
    set({
      isGenerating: false,
      generatedContent: "",
      contentId: null,
      charCount: 0,
      maxChars: 0,
      isOverLimit: false,
      error: null,
    });
  },
}));
