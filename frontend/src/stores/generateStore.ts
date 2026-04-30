/**
 * コンテンツ生成状態管理ストア（Zustand）
 */
import { create } from "zustand";
import { ContentType } from "@/types";
import { getSession } from "@/lib/supabase";

interface AbResult {
  content_id: string;
  content: string;
  char_count: number;
  max_chars: number;
  is_over_limit: boolean;
}

interface GenerateState {
  isGenerating: boolean;
  isRetrying: boolean;
  generatedContent: string;
  contentId: string | null;
  charCount: number;
  maxChars: number;
  isOverLimit: boolean;
  isInTargetRange: boolean;
  error: string | null;
  // ABテスト結果
  abResults: { pattern_a: AbResult; pattern_b: AbResult } | null;

  // アクション
  generateContent: (
    contentType: ContentType,
    stylistId?: string,
    additionalInstructions?: string,
    blogTheme?: string,
    reviewText?: string,
    consultationText?: string,
    starRating?: number,
    usePastContents?: boolean,
    targetCharCount?: number
  ) => Promise<void>;
  generateAbTest: (
    contentType: ContentType,
    stylistId?: string,
    additionalInstructions?: string,
    blogTheme?: string,
    reviewText?: string,
    consultationText?: string,
    starRating?: number,
    usePastContents?: boolean,
    targetCharCount?: number
  ) => Promise<void>;
  adoptAbPattern: (pattern: "a" | "b") => void;
  setGeneratedContent: (content: string) => void;
  reset: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "";

function buildRequestBody(
  contentType: ContentType,
  stylistId?: string,
  additionalInstructions?: string,
  blogTheme?: string,
  reviewText?: string,
  consultationText?: string,
  starRating?: number,
  usePastContents?: boolean,
  targetCharCount?: number
) {
  return {
    content_type: contentType,
    stylist_id: stylistId || null,
    additional_instructions: additionalInstructions || null,
    blog_theme: blogTheme || null,
    review_text: reviewText || null,
    consultation_text: consultationText || null,
    star_rating: starRating || null,
    use_past_contents: usePastContents || false,
    target_char_count: targetCharCount || null,
  };
}

export const useGenerateStore = create<GenerateState>((set, _get) => ({
  isGenerating: false,
  isRetrying: false,
  generatedContent: "",
  contentId: null,
  charCount: 0,
  maxChars: 0,
  isOverLimit: false,
  isInTargetRange: true,
  error: null,
  abResults: null,

  generateContent: async (
    contentType: ContentType,
    stylistId?: string,
    additionalInstructions?: string,
    blogTheme?: string,
    reviewText?: string,
    consultationText?: string,
    starRating?: number,
    usePastContents?: boolean,
    targetCharCount?: number
  ) => {
    set({
      isGenerating: true,
      isRetrying: false,
      generatedContent: "",
      contentId: null,
      charCount: 0,
      isInTargetRange: true,
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
        body: JSON.stringify(buildRequestBody(contentType, stylistId, additionalInstructions, blogTheme, reviewText, consultationText, starRating, usePastContents, targetCharCount)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        const msg = typeof detail === "string" ? detail
          : Array.isArray(detail) ? (detail[0]?.msg || "リクエストが不正です")
          : "生成に失敗しました";
        throw new Error(msg);
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

              if (parsed.type === "retry_start") {
                set({ isRetrying: true });
              }

              if (parsed.type === "retry_replace") {
                accumulatedContent = parsed.content;
                set({ generatedContent: accumulatedContent, isRetrying: false });
              }

              if (parsed.type === "complete") {
                set({
                  contentId: parsed.content_id,
                  charCount: parsed.char_count,
                  maxChars: parsed.max_chars,
                  isOverLimit: parsed.is_over_limit,
                  isInTargetRange: parsed.is_in_target_range ?? true,
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

      set({ isGenerating: false, isRetrying: false });
    } catch (error: any) {
      set({
        isGenerating: false,
        error: error.message || "生成に失敗しました",
      });
      throw error;
    }
  },

  generateAbTest: async (
    contentType: ContentType,
    stylistId?: string,
    additionalInstructions?: string,
    blogTheme?: string,
    reviewText?: string,
    consultationText?: string,
    starRating?: number,
    usePastContents?: boolean,
    targetCharCount?: number
  ) => {
    set({
      isGenerating: true,
      isRetrying: false,
      generatedContent: "",
      contentId: null,
      charCount: 0,
      isInTargetRange: true,
      error: null,
      abResults: null,
    });

    try {
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error("認証が必要です");
      }

      const response = await fetch(`${API_URL}/api/v1/generate/text/ab`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(buildRequestBody(contentType, stylistId, additionalInstructions, blogTheme, reviewText, consultationText, starRating, usePastContents, targetCharCount)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        const msg = typeof detail === "string" ? detail
          : Array.isArray(detail) ? (detail[0]?.msg || "リクエストが不正です")
          : "ABテスト生成に失敗しました";
        throw new Error(msg);
      }

      const data = await response.json();
      set({
        isGenerating: false,
        abResults: data,
        generatedContent: data.pattern_a.content,
        contentId: data.pattern_a.content_id,
        charCount: data.pattern_a.char_count,
        maxChars: data.pattern_a.max_chars,
        isOverLimit: data.pattern_a.is_over_limit,
      });
    } catch (error: any) {
      set({
        isGenerating: false,
        error: error.message || "ABテスト生成に失敗しました",
      });
      throw error;
    }
  },

  adoptAbPattern: (pattern) => {
    set((state) => {
      if (!state.abResults) return state;
      const picked = pattern === "a" ? state.abResults.pattern_a : state.abResults.pattern_b;
      return {
        abResults: null,
        generatedContent: picked.content,
        contentId: picked.content_id,
        charCount: picked.char_count,
        maxChars: picked.max_chars,
        isOverLimit: picked.is_over_limit,
      };
    });
  },

  setGeneratedContent: (content: string) => {
    set({ generatedContent: content });
  },

  reset: () => {
    set({
      isGenerating: false,
      isRetrying: false,
      generatedContent: "",
      contentId: null,
      charCount: 0,
      maxChars: 0,
      isOverLimit: false,
      isInTargetRange: true,
      error: null,
      abResults: null,
    });
  },
}));
