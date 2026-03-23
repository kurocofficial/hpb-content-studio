# KPI確認ガイド

HPB Content Studio の主要KPIと確認方法をまとめたガイドです。

## KPI一覧

| KPI | データソース | 確認方法 | 更新頻度 |
|-----|------------|---------|---------|
| テキスト/ブログ生成数 | `usage_tracking` テーブル | アプリ内ダッシュボード (`/dashboard`) → `/api/v1/usage` | リアルタイム |
| LP訪問数 | Google Analytics 4 | GA4 ダッシュボード → レポート → ページとスクリーン | 日次 |
| 新規登録数 | Supabase Auth | Supabase ダッシュボード → Authentication → Users | リアルタイム |
| 登録サロン数 | `salons` テーブル | Supabase ダッシュボード → Table Editor → salons | リアルタイム |
| API費用 | Anthropic | Anthropic Console → Usage | 日次 |
| トークン使用量 | `usage_tracking` テーブル | DB直接参照（`total_input_tokens`, `total_output_tokens`）| リアルタイム |
| 個別生成トークン | `generated_contents` テーブル | DB直接参照（`input_tokens`, `output_tokens`）| リアルタイム |

## 確認方法の詳細

### 1. テキスト/ブログ生成数

ユーザーごとの月間生成数は `usage_tracking` テーブルに記録されます。

```sql
-- 当月の全ユーザー生成数合計
SELECT
  SUM(text_generation_count) AS total_text,
  SUM(blog_generation_count) AS total_blog,
  SUM(text_generation_count + blog_generation_count) AS total_all
FROM usage_tracking
WHERE year_month = TO_CHAR(NOW(), 'YYYY-MM');
```

アプリ内では `/dashboard` ページで各ユーザーが自分の利用量を確認できます。

### 2. LP訪問数

Google Analytics 4 でトラッキング中です。

- **Netlify LP**: `https://hpb-content-studio.netlify.app/`
- **確認先**: GA4 → レポート → エンゲージメント → ページとスクリーン

### 3. 新規登録数

Supabase ダッシュボードの Authentication → Users セクションで確認できます。
日付フィルタで期間指定が可能です。

### 4. 登録サロン数

```sql
-- サロン数
SELECT COUNT(*) FROM salons;

-- 月別新規サロン数
SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS month,
  COUNT(*) AS new_salons
FROM salons
GROUP BY month
ORDER BY month DESC;
```

### 5. API費用（Anthropic）

Anthropic Console の Usage ページで確認できます。
トークン使用量がDBにも記録されるため、以下のSQLでも概算を算出可能です。

```sql
-- 当月のトークン使用量合計
SELECT
  SUM(total_input_tokens) AS total_input,
  SUM(total_output_tokens) AS total_output
FROM usage_tracking
WHERE year_month = TO_CHAR(NOW(), 'YYYY-MM');
```

**コスト概算（Claude 4.5 Haiku）**:
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

### 6. トークン使用量（個別生成）

```sql
-- 直近の生成ごとのトークン使用量
SELECT
  id, content_type, input_tokens, output_tokens, created_at
FROM generated_contents
ORDER BY created_at DESC
LIMIT 20;
```

## 定期レポート用SQL

### 週次サマリー

```sql
SELECT
  u.year_month,
  COUNT(DISTINCT u.user_id) AS active_users,
  SUM(u.text_generation_count) AS total_text_generations,
  SUM(u.blog_generation_count) AS total_blog_generations,
  SUM(u.total_input_tokens) AS total_input_tokens,
  SUM(u.total_output_tokens) AS total_output_tokens
FROM usage_tracking u
WHERE u.year_month = TO_CHAR(NOW(), 'YYYY-MM')
GROUP BY u.year_month;
```
