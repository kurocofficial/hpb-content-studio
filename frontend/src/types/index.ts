/**
 * HPB Content Studio - 型定義
 */

// ユーザー関連
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// サロン関連
export interface SalonRule {
  tag: string;
  value: string;
}

export interface Salon {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  area: string;
  concept: string | null;
  target_customer: string | null;
  strength: string | null;
  rules: SalonRule[] | null;
  created_at: string;
  updated_at: string;
}

export interface SalonCreateInput {
  name: string;
  area: string;
  concept?: string;
  target_customer?: string;
  strength?: string;
  rules?: SalonRule[];
}

// スタイリスト関連
export interface Stylist {
  id: string;
  salon_id: string;
  name: string;
  role: string | null;
  years_experience: number | null;
  specialties: string[];
  style_features: string[];
  personality: string | null;
  writing_style: WritingStyle | null;
  language_style: LanguageStyle | null;
  background: Background | null;
  service_info: ServiceInfo | null;
  created_at: string;
  updated_at: string;
}

export interface WritingStyle {
  tone: "casual" | "formal" | "friendly" | "professional";
  emoji_usage: "none" | "minimal" | "moderate" | "frequent";
  sentence_style: "short" | "medium" | "long";
}

export interface LanguageStyle {
  dialect?: "標準語" | "関西弁" | "博多弁" | "名古屋弁" | "東北弁" | "沖縄風" | null;
  first_person?: "私" | "わたし" | "僕" | "あたし" | "自分" | null;
  customer_call?: "お客様" | "ゲスト様" | "お客さん" | null;
  catchphrase?: string | null;
}

export interface Background {
  hobbies?: string | null;
  motivation?: string | null;
  motto?: string | null;
  fashion_style?: string | null;
}

export interface ServiceInfo {
  target_demographic?: string | null;
  service_style?: "おしゃべり好き" | "落ち着いた空間重視" | "提案型" | "お任せ歓迎型" | null;
  counseling_approach?: string | null;
}

export interface StylistCreateInput {
  name: string;
  role?: string;
  years_experience?: number;
  specialties?: string[];
  style_features?: string[];
  personality?: string;
  writing_style?: WritingStyle;
  language_style?: LanguageStyle;
  background?: Background;
  service_info?: ServiceInfo;
}

// コンテンツ生成関連
export type ContentType =
  | "salon_catch"
  | "salon_intro"
  | "stylist_profile"
  | "blog_article"
  | "review_reply"
  | "consultation"
  | "google_review_reply";

export interface ContentTypeConfig {
  type: ContentType;
  label: string;
  description: string;
  maxChars: number;
  icon: string;
  platform?: "hpb" | "google";
  charCountMode?: "hpb" | "standard";
}

export const CONTENT_TYPES: ContentTypeConfig[] = [
  {
    type: "salon_catch",
    label: "サロンキャッチ",
    description: "HPBトップに表示される短いキャッチコピー",
    maxChars: 45,
    icon: "Sparkles",
    platform: "hpb",
    charCountMode: "hpb",
  },
  {
    type: "salon_intro",
    label: "サロン紹介文",
    description: "サロンの魅力を伝える紹介文",
    maxChars: 500,
    icon: "FileText",
    platform: "hpb",
    charCountMode: "hpb",
  },
  {
    type: "stylist_profile",
    label: "スタイリストプロフィール",
    description: "スタイリストの個性が伝わる自己紹介",
    maxChars: 200,
    icon: "User",
    platform: "hpb",
    charCountMode: "hpb",
  },
  {
    type: "blog_article",
    label: "ブログ記事",
    description: "季節のスタイル提案やサロン情報を発信",
    maxChars: 10000,
    icon: "PenLine",
    platform: "hpb",
    charCountMode: "hpb",
  },
  {
    type: "review_reply",
    label: "口コミ返信",
    description: "お客様の口コミに対する返信文を作成",
    maxChars: 500,
    icon: "MessageSquareReply",
    platform: "hpb",
    charCountMode: "hpb",
  },
  {
    type: "consultation",
    label: "悩み相談",
    description: "スタイリストの悩みにAIがアドバイス",
    maxChars: 2000,
    icon: "HelpCircle",
    platform: "hpb",
    charCountMode: "hpb",
  },
  {
    type: "google_review_reply",
    label: "Google口コミ返信",
    description: "Googleマップの口コミに対する返信文を作成",
    maxChars: 500,
    icon: "Star",
    platform: "google",
    charCountMode: "standard",
  },
];

export interface GenerateRequest {
  content_type: ContentType;
  stylist_id?: string;
  additional_instructions?: string;
  star_rating?: number;
}

export interface GeneratedContent {
  id: string;
  salon_id: string;
  stylist_id: string | null;
  content_type: ContentType;
  content: string;
  char_count: number;
  prompt_used: string;
  created_at: string;
  updated_at: string;
}

// チャット関連
export interface ChatSession {
  id: string;
  content_id: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
}

// 利用量関連
export interface UsageTracking {
  id: string;
  user_id: string;
  year_month: string;
  text_generation_count: number;
  blog_generation_count: number;
  image_generation_count: number;
}

export interface UsageLimits {
  text_generation: {
    used: number;
    limit: number;
  };
  blog_generation: {
    used: number;
    limit: number;
  };
  chat_turns: {
    used: number;
    limit: number;
  };
}

// 組織関連
export interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  max_salons: number | null;
  max_stylists_per_salon: number | null;
  created_at: string;
  updated_at: string;
}

export type OrgRole = "owner" | "admin" | "member";

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  email?: string;
  created_at: string;
  updated_at: string;
}

// CSVインポート関連
export interface CsvImportError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportJob {
  id: string;
  organization_id: string;
  user_id: string;
  import_type: "salons" | "stylists";
  file_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_rows: number;
  success_count: number;
  error_count: number;
  error_details: CsvImportError[];
  created_at: string;
  updated_at: string;
}

// サブスクリプション関連
export type PlanType = "free" | "pro" | "team";

export interface Subscription {
  plan: PlanType;
  status: "active" | "trialing" | "past_due" | "canceled";
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

// API レスポンス
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// ページネーション
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
