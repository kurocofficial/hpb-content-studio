import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * HPB基準の文字数カウント
 * 全角=1文字、半角=0.5文字
 */
export function countHpbCharacters(text: string): number {
  let count = 0;
  for (const char of text) {
    // 半角文字（ASCII範囲）
    if (char.charCodeAt(0) <= 127) {
      count += 0.5;
    } else {
      count += 1;
    }
  }
  return Math.ceil(count);
}

/**
 * 標準の文字数カウント（len(text)ベース）
 */
export function countStandardCharacters(text: string): number {
  return text.length;
}

/**
 * カウントモードに応じた文字数カウント
 */
export function countCharacters(text: string, mode: "hpb" | "standard" = "hpb"): number {
  if (mode === "standard") {
    return countStandardCharacters(text);
  }
  return countHpbCharacters(text);
}

/**
 * クリップボードにコピー
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * 日付フォーマット
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * 相対時間表示
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return formatDate(dateString);
}
